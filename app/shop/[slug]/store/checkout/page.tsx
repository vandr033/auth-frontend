"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { DeliveryAddressSection } from "@/app/shop/components/commerce/DeliveryAddressSection";
import { PaymentProofUploader } from "@/app/shop/components/commerce/PaymentProofUploader";
import { Button } from "@/components/ui/button";
import { CountryPhoneSelect } from "@/components/ui/country-phone-select";
import { Input } from "@/components/ui/input";
import { formatCurrencyAmount } from "@/lib/currency";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/useAuth";
import { useOtpResendTimer } from "@/lib/auth/otpResend";
import {
    createPublicCommerceOrder,
    deletePublicCommercePaymentProof,
    getPublicCommerceStore,
    resendPublicCommerceGuestCheckout,
    startPublicCommerceGuestCheckout,
    uploadCheckoutCommercePaymentProof,
    verifyPublicCommerceGuestCheckout,
    type PublicCommerceGuestCheckoutResult,
    type PublicCommercePickupPoint,
} from "@/app/shop/lib/commerceApi";
import { useCommerceCart } from "@/app/shop/lib/useCommerceCart";
import { useShop } from "../../../contexts/ShopContext";
import { getImageUrl } from "@/utils/image-url";
import { useT } from "@/lib/i18n";
import {
    DEFAULT_COUNTRY_CODE,
    normalizePhoneSelection,
} from "@/lib/phone-country";
import type { ShopHours } from "@/types/shop";

type StorePayload = Awaited<ReturnType<typeof getPublicCommerceStore>> | null;
type PublicStoreConfig = NonNullable<Awaited<ReturnType<typeof getPublicCommerceStore>>>["store"];
type CommercePaymentMethod = "CASH" | "QR" | "MANUAL";
type IdentityBusyState = "start" | "verify" | "resend" | null;

type ScheduleOption = {
    value: string;
    label: string;
};

function getEnabledPaymentMethods(store: PublicStoreConfig | null | undefined): CommercePaymentMethod[] {
    if (!store) return [];

    const methods: CommercePaymentMethod[] = [];
    if (store.allow_cash_payment) methods.push("CASH");
    if (store.allow_qr_payment && store.qr_image_url?.trim()) methods.push("QR");
    if (store.allow_manual_payment) methods.push("MANUAL");
    return methods;
}

function getPaymentMethodLabel(method: CommercePaymentMethod, t: ReturnType<typeof useT>) {
    return t(`shopStore.paymentMethods.${method}`);
}

function isTemporaryEmail(email?: string | null) {
    return Boolean(email?.trim().toLowerCase().endsWith("@tmppriconpri.com"));
}

function buildCustomerName(user: {
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
} | null | undefined) {
    if (!user) return "";
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fullName || user.name || "";
}

function parseTimeToMinutes(value?: string | null) {
    const normalized = (value ?? "").trim();
    const match = normalized.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    return hours * 60 + minutes;
}

function buildScheduleOptions(params: {
    scheduledEnabled: boolean;
    maxScheduleDaysAhead?: number | null;
    minPreparationMinutes?: number | null;
    orderSlotsEnabled?: boolean;
    orderScheduleSlots?: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_active?: boolean;
    }>;
    hours: ShopHours[];
    locale: string;
}) {
    if (!params.scheduledEnabled) return [];

    const now = new Date();
    const earliest = new Date(now.getTime() + Math.max(0, params.minPreparationMinutes ?? 0) * 60 * 1000);
    const maxDays = Math.max(1, params.maxScheduleDaysAhead ?? 30);

    const customSlots =
        params.orderSlotsEnabled && Array.isArray(params.orderScheduleSlots)
            ? params.orderScheduleSlots.filter((slot) => slot.is_active !== false)
            : [];

    const sourceSlots =
        customSlots.length > 0
            ? customSlots.map((slot) => ({
                  day_of_week: slot.day_of_week,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
              }))
            : params.hours
                  .filter((slot) => !slot.is_closed && slot.open_time && slot.close_time)
                  .map((slot) => ({
                      day_of_week: slot.day_of_week,
                      start_time: slot.open_time!,
                      end_time: slot.close_time!,
                  }));

    const formatter = new Intl.DateTimeFormat(params.locale === "es" ? "es-BO" : undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    const options: ScheduleOption[] = [];

    for (let dayOffset = 0; dayOffset <= maxDays; dayOffset += 1) {
        const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
        const daySlots = sourceSlots.filter((slot) => slot.day_of_week === baseDate.getDay());

        for (const slot of daySlots) {
            const startMinutes = parseTimeToMinutes(slot.start_time);
            const endMinutes = parseTimeToMinutes(slot.end_time);
            if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes) continue;

            for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
                const candidate = new Date(baseDate);
                candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
                if (candidate <= earliest) continue;
                options.push({
                    value: candidate.toISOString(),
                    label: formatter.format(candidate),
                });
            }
        }
    }

    return options;
}

export default function StoreCheckoutPage() {
    const t = useT();
    const router = useRouter();
    const { slug, company, hours } = useShop();
    const { user, isAuthenticated, refreshSession, loading: authLoading } = useAuth();
    const { items, subtotal, clear } = useCommerceCart(slug);
    const { canResend, secondsRemaining, startCooldown, resetCooldown } = useOtpResendTimer();

    const [storePayload, setStorePayload] = React.useState<StorePayload>(null);
    const [loadingStore, setLoadingStore] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [identityBusy, setIdentityBusy] = React.useState<IdentityBusyState>(null);
    const [identityError, setIdentityError] = React.useState<string | null>(null);
    const [identitySuccess, setIdentitySuccess] = React.useState<string | null>(null);
    const [guestCheckoutResult, setGuestCheckoutResult] = React.useState<PublicCommerceGuestCheckoutResult | null>(null);
    const [otpCode, setOtpCode] = React.useState("");
    const [guestVerified, setGuestVerified] = React.useState(false);
    const [form, setForm] = React.useState({
        customerFirstName: "",
        customerLastName: "",
        customerName: "",
        customerPhone: "",
        customerCountryCode: company?.country_code || DEFAULT_COUNTRY_CODE,
        customerPhonePrefix: company?.phone_prefix || "591",
        customerEmail: "",
        fulfillmentType: "PICKUP" as "PICKUP" | "DELIVERY",
        pickupPointId: "",
        deliveryAddress: "",
        deliveryNotes: "",
        deliveryLatitude: null as number | null,
        deliveryLongitude: null as number | null,
        deliveryPlaceId: null as string | null,
        deliveryLocationMeta: null as {
            provider?: string | null;
            source?: string | null;
            formattedAddress?: string | null;
            mapboxPlaceId?: string | null;
        } | null,
        customerNotes: "",
        scheduledFor: "",
        paymentMethod: "CASH" as CommercePaymentMethod,
    });
    const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null);
    const [paymentProofError, setPaymentProofError] = React.useState<string | null>(null);
    const autofilledUserIdRef = React.useRef<string | null>(null);

    const clearGuestVerificationState = React.useCallback(() => {
        setGuestCheckoutResult(null);
        setOtpCode("");
        setIdentityError(null);
        setIdentitySuccess(null);
        setGuestVerified(false);
        resetCooldown();
    }, [resetCooldown]);

    const updateIdentityField = React.useCallback(
        (field: "customerFirstName" | "customerLastName" | "customerPhone" | "customerPhonePrefix" | "customerEmail", value: string) => {
            setForm((prev) => {
                const next = { ...prev, [field]: value };
                // Keep customerName in sync for submission
                next.customerName = `${next.customerFirstName} ${next.customerLastName}`.trim();
                return next;
            });
            if (!isAuthenticated && (guestCheckoutResult?.checkout_session_id || guestVerified)) {
                clearGuestVerificationState();
            } else {
                setIdentityError(null);
            }
        },
        [clearGuestVerificationState, guestCheckoutResult?.checkout_session_id, guestVerified, isAuthenticated],
    );

    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setLoadingStore(true);
                const data = await getPublicCommerceStore(slug);
                if (!cancelled) {
                    const enabledMethods = getEnabledPaymentMethods(data.store);
                    setStorePayload(data);
                    setForm((prev) => ({
                        ...prev,
                        customerCountryCode:
                            prev.customerCountryCode
                            || data.company?.country_code
                            || company?.country_code
                            || DEFAULT_COUNTRY_CODE,
                        customerPhonePrefix: prev.customerPhonePrefix || company?.phone_prefix || "591",
                        fulfillmentType:
                            data.store?.fulfillment_mode === "DELIVERY_ONLY"
                                ? "DELIVERY"
                                : prev.fulfillmentType,
                        paymentMethod: enabledMethods[0] ?? prev.paymentMethod,
                    }));
                }
            } catch (error) {
                if (!cancelled) notify.error(error instanceof Error ? error.message : t("shopStore.loadStoreFailed"));
            } finally {
                if (!cancelled) setLoadingStore(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [company?.country_code, company?.phone_prefix, slug, t]);

    React.useEffect(() => {
        if (!user?.id) {
            autofilledUserIdRef.current = null;
            return;
        }
        if (autofilledUserIdRef.current === user.id) return;

        const resolvedName = buildCustomerName(user);
        const resolvedFirstName = user.first_name?.trim() || resolvedName.split(" ")[0] || "";
        const resolvedLastName = user.last_name?.trim() || resolvedName.split(" ").slice(1).join(" ") || "";
        const resolvedEmail = isTemporaryEmail(user.email) ? "" : user.email || "";
        const resolvedPhoneSelection = normalizePhoneSelection({
            countryCode: typeof user.country_code === "string" ? user.country_code : null,
            phonePrefix: user.phone_prefix,
            phoneNumber: user.phoneNumber,
            fallbackCountryCode: company?.country_code || DEFAULT_COUNTRY_CODE,
        });
        const hasUserPhone = Boolean(
            resolvedPhoneSelection.phoneNumber || resolvedPhoneSelection.phonePrefix,
        );

        setForm((prev) => ({
            ...prev,
            customerFirstName: prev.customerFirstName || resolvedFirstName,
            customerLastName: prev.customerLastName || resolvedLastName,
            customerName: prev.customerName || resolvedName,
            customerPhone:
                prev.customerPhone || resolvedPhoneSelection.phoneNumber,
            customerCountryCode:
                hasUserPhone
                    ? resolvedPhoneSelection.countryCode
                    : prev.customerCountryCode
                        || company?.country_code
                        || DEFAULT_COUNTRY_CODE,
            customerPhonePrefix:
                hasUserPhone
                    ? resolvedPhoneSelection.phonePrefix
                    : prev.customerPhonePrefix
                        || company?.phone_prefix
                        || "591",
            customerEmail: prev.customerEmail || resolvedEmail,
        }));
        autofilledUserIdRef.current = user.id;
    }, [company?.country_code, company?.phone_prefix, user]);

    React.useEffect(() => {
        if (!isAuthenticated) {
            setGuestVerified(false);
        }
    }, [isAuthenticated]);

    const pickupPoints = storePayload?.pickup_points ?? [];
    const fulfillmentMode = storePayload?.store?.fulfillment_mode ?? "PICKUP_AND_DELIVERY";
    const scheduledEnabled = Boolean(storePayload?.store?.scheduled_orders_enabled);
    const scheduleOptions = React.useMemo(
        () =>
            buildScheduleOptions({
                scheduledEnabled,
                maxScheduleDaysAhead: storePayload?.store?.max_schedule_days_ahead ?? null,
                minPreparationMinutes: storePayload?.store?.min_preparation_minutes ?? null,
                orderSlotsEnabled: storePayload?.store?.order_slots_enabled ?? false,
                orderScheduleSlots: storePayload?.store?.order_schedule_slots ?? [],
                hours,
                locale: typeof navigator !== "undefined" ? navigator.language : "es-BO",
            }),
        [hours, scheduledEnabled, storePayload?.store],
    );

    React.useEffect(() => {
        if (!scheduledEnabled) return;
        if (scheduleOptions.length === 0) {
            setForm((prev) => ({ ...prev, scheduledFor: "" }));
            return;
        }
        if (!form.scheduledFor || !scheduleOptions.some((option) => option.value === form.scheduledFor)) {
            setForm((prev) => ({ ...prev, scheduledFor: scheduleOptions[0]?.value ?? "" }));
        }
    }, [form.scheduledFor, scheduleOptions, scheduledEnabled]);

    const canPickup = fulfillmentMode === "PICKUP_ONLY" || fulfillmentMode === "PICKUP_AND_DELIVERY";
    const canDelivery = fulfillmentMode === "DELIVERY_ONLY" || fulfillmentMode === "PICKUP_AND_DELIVERY";
    const enabledPaymentMethods = getEnabledPaymentMethods(storePayload?.store);
    const qrConfigurationMissing = Boolean(
        storePayload?.store?.allow_qr_payment && !storePayload?.store?.qr_image_url?.trim(),
    );
    const paymentMethod = form.paymentMethod;
    const supportsProofPayment = paymentMethod === "QR" || paymentMethod === "MANUAL";
    const requiresProof = Boolean(storePayload?.store?.payment_proof_required) && supportsProofPayment;
    const awaitsManualDeliveryCost =
        form.fulfillmentType === "DELIVERY" && storePayload?.store?.delivery_cost_mode === "MANUAL";
    const pendingCheckoutSessionId = guestCheckoutResult?.checkout_session_id ?? null;
    const guestNeedsVerification = !isAuthenticated;

    React.useEffect(() => {
        if (enabledPaymentMethods.length === 0) return;
        if (!enabledPaymentMethods.includes(form.paymentMethod)) {
            setForm((prev) => ({ ...prev, paymentMethod: enabledPaymentMethods[0] }));
        }
    }, [enabledPaymentMethods, form.paymentMethod]);

    React.useEffect(() => {
        if (!supportsProofPayment || awaitsManualDeliveryCost) {
            setPaymentProofError(null);
        }
    }, [awaitsManualDeliveryCost, supportsProofPayment]);

    const activeStep: "customer" | "confirmation" | "order" = isAuthenticated
        ? "order"
        : pendingCheckoutSessionId
          ? "confirmation"
          : "customer";

    const steps = [
        {
            key: "customer",
            label: t("shopStore.steps.customer"),
            status: activeStep === "customer" ? "current" : "complete",
        },
        {
            key: "confirmation",
            label: t("shopStore.steps.confirmation"),
            status:
                activeStep === "confirmation"
                    ? "current"
                    : isAuthenticated
                      ? "complete"
                      : "upcoming",
        },
        {
            key: "order",
            label: t("shopStore.steps.order"),
            status: activeStep === "order" ? "current" : "upcoming",
        },
    ] as const;

    const handleGuestStart = React.useCallback(async () => {
        setIdentityBusy("start");
        setIdentityError(null);
        setIdentitySuccess(null);
        try {
            const result = await startPublicCommerceGuestCheckout(slug, {
                customerName: form.customerName,
                customerPhone: form.customerPhone,
                customerPhonePrefix: form.customerPhonePrefix,
                customerCountryCode: form.customerCountryCode,
                customerEmail: form.customerEmail,
            });

            if (result.accountOutcome === "ACCOUNT_CONFLICT_PHONE_EMAIL") {
                setGuestCheckoutResult(null);
                setIdentityError(
                    t("shopStore.identityConflict"),
                );
                return;
            }

            if (!result.checkout_session_id || !result.canVerify) {
                setGuestCheckoutResult(null);
                setIdentityError(t("shopStore.identityStartFailed"));
                return;
            }

            setGuestCheckoutResult(result);
            setOtpCode("");
            setGuestVerified(false);
            startCooldown(result.resendCooldownSeconds);
            setIdentitySuccess(
                t("shopStore.codeSent", {
                    email: result.otpDelivery.maskedEmail || "—",
                    phone: result.otpDelivery.maskedPhone || "—",
                }),
            );
        } catch (error) {
            setGuestCheckoutResult(null);
            setIdentityError(error instanceof Error ? error.message : t("shopStore.identityStartFailed"));
        } finally {
            setIdentityBusy(null);
        }
    }, [
        form.customerCountryCode,
        form.customerEmail,
        form.customerName,
        form.customerPhone,
        form.customerPhonePrefix,
        slug,
        startCooldown,
        t,
    ]);

    const handleGuestVerify = React.useCallback(async () => {
        if (!pendingCheckoutSessionId) return;
        if (!otpCode.trim()) {
            setIdentityError(t("shopStore.otpRequired"));
            return;
        }

        setIdentityBusy("verify");
        setIdentityError(null);
        setIdentitySuccess(null);
        try {
            await verifyPublicCommerceGuestCheckout(slug, pendingCheckoutSessionId, otpCode.trim());
            const refreshedUser = await refreshSession();
            if (!refreshedUser?.id) {
                throw new Error(t("shopStore.identityVerifyFailed"));
            }

            setGuestVerified(true);
            setGuestCheckoutResult(null);
            setOtpCode("");
            resetCooldown();
            setIdentitySuccess(t("shopStore.identityVerified"));
        } catch (error) {
            setIdentityError(error instanceof Error ? error.message : t("shopStore.identityVerifyFailed"));
        } finally {
            setIdentityBusy(null);
        }
    }, [otpCode, pendingCheckoutSessionId, refreshSession, resetCooldown, slug, t]);

    const handleGuestResend = React.useCallback(async () => {
        if (!pendingCheckoutSessionId || !canResend) return;

        setIdentityBusy("resend");
        setIdentityError(null);
        setIdentitySuccess(null);
        try {
            const result = await resendPublicCommerceGuestCheckout(slug, pendingCheckoutSessionId);
            setGuestCheckoutResult(result);
            startCooldown(result.resendCooldownSeconds);
            setIdentitySuccess(
                t("shopStore.codeResent", {
                    email: result.otpDelivery.maskedEmail || "—",
                    phone: result.otpDelivery.maskedPhone || "—",
                }),
            );
        } catch (error) {
            setIdentityError(error instanceof Error ? error.message : t("shopStore.resendFailed"));
        } finally {
            setIdentityBusy(null);
        }
    }, [canResend, pendingCheckoutSessionId, slug, startCooldown, t]);

    if (items.length === 0) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-text-main">
                <div>
                    <p className="font-medium">{t("shopStore.emptyCartTitle")}</p>
                    <p className="mt-2 text-text-muted">{t("shopStore.emptyCartDescription")}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-page text-text-main">
            <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
                <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                        {t("shopStore.checkoutEyebrow")}
                    </p>
                    <h1 className="mt-2 font-heading text-4xl font-semibold">{t("shopStore.checkoutTitle")}</h1>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {steps.map((step, index) => (
                            <div
                                key={step.key}
                                className={`rounded-2xl border px-4 py-3 text-sm ${
                                    step.status === "complete"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : step.status === "current"
                                          ? "border-brand/30 bg-brand/5 text-text-main"
                                          : "border-surface-border bg-surface text-text-muted"
                                }`}
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                                    {t("shopStore.stepNumber", { step: index + 1 })}
                                </p>
                                <p className="mt-1 font-medium">{step.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <form
                        className="space-y-5 rounded-3xl border border-surface-border bg-surface p-6 shadow-card"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void (async () => {
                                if (!isAuthenticated) {
                                    await handleGuestStart();
                                    return;
                                }

                                let uploadedProofUrl: string | null = null;
                                let uploadedProofDeleteToken: string | null = null;
                                try {
                                    if (enabledPaymentMethods.length === 0) {
                                        throw new Error(t("shopStore.noPaymentMethodsEnabled"));
                                    }

                                    if (!awaitsManualDeliveryCost && requiresProof && !paymentProofFile) {
                                        setPaymentProofError(t("shopStore.proofRequiredBeforeConfirm"));
                                        return;
                                    }

                                    setSubmitting(true);
                                    setPaymentProofError(null);
                                    if (!awaitsManualDeliveryCost && supportsProofPayment && paymentProofFile) {
                                        const upload = await uploadCheckoutCommercePaymentProof(slug, paymentProofFile);
                                        uploadedProofUrl = upload.url;
                                        uploadedProofDeleteToken = upload.deleteToken ?? null;
                                    }

                                    if (!awaitsManualDeliveryCost && requiresProof && !uploadedProofUrl) {
                                        throw new Error(t("shopStore.proofRequiredBeforeConfirm"));
                                    }

                                    const order = await createPublicCommerceOrder(slug, {
                                        customerName: form.customerName,
                                        customerPhone: form.customerPhone,
                                        customerPhonePrefix: form.customerPhonePrefix,
                                        customerCountryCode: form.customerCountryCode,
                                        customerEmail: form.customerEmail,
                                        fulfillmentType: form.fulfillmentType,
                                        pickupPointId:
                                            form.fulfillmentType === "PICKUP" ? form.pickupPointId || null : null,
                                        deliveryAddress:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryAddress : null,
                                        deliveryNotes:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryNotes || null : null,
                                        deliveryLatitude:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryLatitude : null,
                                        deliveryLongitude:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryLongitude : null,
                                        deliveryPlaceId:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryPlaceId : null,
                                        deliveryLocationMeta:
                                            form.fulfillmentType === "DELIVERY" ? form.deliveryLocationMeta : null,
                                        customerNotes: form.customerNotes || null,
                                        scheduledFor: scheduledEnabled && form.scheduledFor ? form.scheduledFor : null,
                                        paymentMethod: form.paymentMethod,
                                        paymentProofUrl: uploadedProofUrl,
                                        items: items.map((item) => ({
                                            productId: item.productId,
                                            quantity: item.quantity,
                                        })),
                                    });
                                    clear();
                                    setPaymentProofFile(null);
                                    notify.success(t("shopStore.orderCreated"));
                                    const orderToken =
                                        typeof order.public_access_token === "string" && order.public_access_token
                                            ? `?token=${encodeURIComponent(order.public_access_token)}`
                                            : "";
                                    router.push(`/shop/${slug}/store/orders/${order.order_number}${orderToken}`);
                                } catch (error) {
                                    if (uploadedProofUrl) {
                                        void deletePublicCommercePaymentProof(
                                            uploadedProofUrl,
                                            uploadedProofDeleteToken || undefined,
                                        ).catch(() => undefined);
                                    }
                                    notify.error(error instanceof Error ? error.message : t("shopStore.orderCreateFailed"));
                                } finally {
                                    setSubmitting(false);
                                }
                            })();
                        }}
                    >
                        <section className="space-y-4 rounded-2xl border border-surface-border bg-page p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">{t("shopStore.steps.customer")}</p>
                                    <p className="text-sm text-text-muted">{t("shopStore.identityDescription")}</p>
                                </div>
                                {isAuthenticated ? (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        <ShieldCheck className="h-4 w-4" />
                                        {t("shopStore.verifiedBadge")}
                                    </span>
                                ) : null}
                            </div>

                            <div className="space-y-4">
                                {/* Row 1: First name + Last name */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t("shopStore.firstName") ?? "Nombre"}</label>
                                        <Input
                                            value={form.customerFirstName}
                                            onChange={(event) => updateIdentityField("customerFirstName", event.target.value)}
                                            placeholder={t("shopStore.firstNamePlaceholder") ?? "Tu nombre"}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t("shopStore.lastName") ?? "Apellido"}</label>
                                        <Input
                                            value={form.customerLastName}
                                            onChange={(event) => updateIdentityField("customerLastName", event.target.value)}
                                            placeholder={t("shopStore.lastNamePlaceholder") ?? "Tu apellido"}
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Email */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium">{t("shopStore.email")}</label>
                                    <Input
                                        type="email"
                                        value={form.customerEmail}
                                        onChange={(event) => updateIdentityField("customerEmail", event.target.value)}
                                        required
                                    />
                                </div>

                                {/* Row 3: Phone (full width to avoid overflow) */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium">{t("shopStore.phone")}</label>
                                    <CountryPhoneSelect
                                        countryCode={form.customerCountryCode}
                                        phonePrefix={form.customerPhonePrefix}
                                        phoneNumber={form.customerPhone}
                                        defaultCountryCode={company?.country_code || DEFAULT_COUNTRY_CODE}
                                        onChange={(value) => {
                                            setForm((prev) => ({
                                                ...prev,
                                                customerCountryCode: value.countryCode,
                                                customerPhonePrefix: value.phonePrefix,
                                                customerPhone: value.phoneNumber,
                                            }));
                                            if (!isAuthenticated && (guestCheckoutResult?.checkout_session_id || guestVerified)) {
                                                clearGuestVerificationState();
                                            } else {
                                                setIdentityError(null);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {guestNeedsVerification ? (
                                <div className="space-y-3 rounded-2xl border border-dashed border-surface-border p-4">
                                    <div>
                                        <p className="text-sm font-semibold">{t("shopStore.steps.confirmation")}</p>
                                        <p className="text-sm text-text-muted">
                                            {pendingCheckoutSessionId
                                                ? t("shopStore.confirmationPending")
                                                : t("shopStore.confirmationDescription")}
                                        </p>
                                    </div>

                                    {pendingCheckoutSessionId ? (
                                        <>
                                            <div className="rounded-xl bg-surface px-4 py-3 text-sm text-text-muted">
                                                {t("shopStore.codeSentSummary", {
                                                    email: guestCheckoutResult?.otpDelivery.maskedEmail || "—",
                                                    phone: guestCheckoutResult?.otpDelivery.maskedPhone || "—",
                                                })}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t("shopStore.otpLabel")}
                                                </label>
                                                <Input
                                                    value={otpCode}
                                                    onChange={(event) => setOtpCode(event.target.value)}
                                                    placeholder={t("shopStore.otpPlaceholder")}
                                                    inputMode="numeric"
                                                    maxLength={8}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <Button
                                                    type="button"
                                                    className="bg-brand text-white hover:bg-brand-hover"
                                                    onClick={() => void handleGuestVerify()}
                                                    disabled={identityBusy === "verify"}
                                                >
                                                    {identityBusy === "verify" ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : null}
                                                    {t("shopStore.verifyCode")}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => void handleGuestResend()}
                                                    disabled={identityBusy === "resend" || !canResend}
                                                >
                                                    {identityBusy === "resend" ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : null}
                                                    {canResend
                                                        ? t("shopStore.resendCode")
                                                        : t("shopStore.resendIn", { seconds: secondsRemaining })}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-text-muted">{t("shopStore.editIdentityHint")}</p>
                                        </>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-semibold">{t("shopStore.steps.confirmation")}</p>
                                            <p>
                                                {guestVerified
                                                    ? t("shopStore.identityVerified")
                                                    : t("shopStore.loggedInSummary")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {identityError ? (
                                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                    {identityError}
                                </p>
                            ) : null}

                            {identitySuccess ? (
                                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    {identitySuccess}
                                </p>
                            ) : null}
                        </section>

                        {!loadingStore ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">{t("shopStore.fulfillment")}</label>
                                    <div className="flex flex-wrap gap-3">
                                        {canPickup ? (
                                            <Button
                                                type="button"
                                                variant={form.fulfillmentType === "PICKUP" ? "default" : "outline"}
                                                className={form.fulfillmentType === "PICKUP" ? "bg-brand text-white hover:bg-brand-hover" : ""}
                                                onClick={() => setForm((prev) => ({ ...prev, fulfillmentType: "PICKUP" }))}
                                            >
                                                {t("shopStore.pickup")}
                                            </Button>
                                        ) : null}
                                        {canDelivery ? (
                                            <Button
                                                type="button"
                                                variant={form.fulfillmentType === "DELIVERY" ? "default" : "outline"}
                                                className={form.fulfillmentType === "DELIVERY" ? "bg-brand text-white hover:bg-brand-hover" : ""}
                                                onClick={() => setForm((prev) => ({ ...prev, fulfillmentType: "DELIVERY" }))}
                                            >
                                                {t("shopStore.delivery")}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>

                                {form.fulfillmentType === "PICKUP" ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t("shopStore.pickupPoint")}</label>
                                        <select
                                            className="h-11 w-full rounded-xl border border-surface-border bg-page px-3"
                                            value={form.pickupPointId}
                                            onChange={(event) => setForm((prev) => ({ ...prev, pickupPointId: event.target.value }))}
                                            required
                                        >
                                            <option value="">{t("shopStore.selectPickupPoint")}</option>
                                            {pickupPoints.map((point: PublicCommercePickupPoint) => (
                                                <option key={point.id} value={point.id}>
                                                    {point.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <DeliveryAddressSection
                                        value={{
                                            deliveryAddress: form.deliveryAddress,
                                            deliveryNotes: form.deliveryNotes,
                                            deliveryLatitude: form.deliveryLatitude,
                                            deliveryLongitude: form.deliveryLongitude,
                                            deliveryPlaceId: form.deliveryPlaceId,
                                            deliveryLocationMeta: form.deliveryLocationMeta,
                                        }}
                                        t={t}
                                        onChange={(nextValue) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                deliveryAddress: nextValue.deliveryAddress,
                                                deliveryNotes: nextValue.deliveryNotes,
                                                deliveryLatitude: nextValue.deliveryLatitude,
                                                deliveryLongitude: nextValue.deliveryLongitude,
                                                deliveryPlaceId: nextValue.deliveryPlaceId,
                                                deliveryLocationMeta: nextValue.deliveryLocationMeta,
                                            }))
                                        }
                                    />
                                )}

                                {scheduledEnabled ? (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t("shopStore.schedule")}</label>
                                        <select
                                            className="h-11 w-full rounded-xl border border-surface-border bg-page px-3"
                                            value={form.scheduledFor}
                                            onChange={(event) => setForm((prev) => ({ ...prev, scheduledFor: event.target.value }))}
                                        >
                                            {scheduleOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {scheduleOptions.length === 0 ? (
                                            <p className="mt-2 text-sm text-amber-700">{t("shopStore.noScheduleOptions")}</p>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="space-y-4 rounded-2xl border border-surface-border bg-page p-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t("shopStore.paymentMethod")}</label>
                                        {enabledPaymentMethods.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {enabledPaymentMethods.map((method) => (
                                                    <Button
                                                        key={method}
                                                        type="button"
                                                        variant={form.paymentMethod === method ? "default" : "outline"}
                                                        className={form.paymentMethod === method ? "bg-brand text-white hover:bg-brand-hover" : ""}
                                                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: method }))}
                                                    >
                                                        {getPaymentMethodLabel(method, t)}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-rose-600">{t("shopStore.paymentMethodsUnavailable")}</p>
                                        )}
                                    </div>

                                    {qrConfigurationMissing ? (
                                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                            {t("shopStore.qrUnavailable")}
                                        </p>
                                    ) : null}

                                    {paymentMethod === "CASH" ? (
                                        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-text-muted">
                                            {t("shopStore.cashHelp")}
                                        </p>
                                    ) : null}

                                    {supportsProofPayment ? (
                                        <div className="space-y-4 rounded-xl border border-dashed border-surface-border p-4">
                                            {paymentMethod === "QR" ? (
                                                <div className="space-y-4">
                                                    <div className="text-sm font-medium text-text-main">
                                                        {t("shopStore.qrInstructions")}
                                                    </div>
                                                    {storePayload?.store?.qr_image_url ? (
                                                        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface p-3">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getImageUrl(storePayload.store.qr_image_url) || storePayload.store.qr_image_url}
                                                                alt={t("shopStore.qrImageAlt")}
                                                                className="mx-auto max-h-64 rounded-xl object-contain"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {storePayload?.store?.payment_instructions ? (
                                                <div className="rounded-xl bg-surface px-4 py-3 text-sm text-text-muted">
                                                    {storePayload.store.payment_instructions}
                                                </div>
                                            ) : null}

                                            {awaitsManualDeliveryCost ? (
                                                <p className="text-sm text-text-muted">
                                                    {t("shopStore.manualDeliveryCostPending")}
                                                </p>
                                            ) : (
                                                <PaymentProofUploader
                                                    id="commerce-payment-proof"
                                                    label={t("shopStore.uploadProof")}
                                                    acceptedTypesLabel={t("shopStore.acceptedProofTypes")}
                                                    emptyHelpText={
                                                        requiresProof
                                                            ? t("shopStore.proofRequiredHelp")
                                                            : t("shopStore.proofOptionalHelp")
                                                    }
                                                    changeLabel={t("shopStore.changeProof")}
                                                    removeLabel={t("shopStore.removeProof")}
                                                    file={paymentProofFile}
                                                    error={paymentProofError}
                                                    onFileChange={(file) => {
                                                        setPaymentProofFile(file);
                                                        setPaymentProofError(null);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div>
                            <label className="mb-2 block text-sm font-medium">{t("shopStore.storeNotes")}</label>
                            <textarea
                                className="min-h-24 w-full rounded-xl border border-surface-border bg-page px-3 py-3"
                                value={form.customerNotes}
                                onChange={(event) => setForm((prev) => ({ ...prev, customerNotes: event.target.value }))}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="bg-brand text-white hover:bg-brand-hover"
                            disabled={
                                submitting ||
                                authLoading ||
                                identityBusy === "start" ||
                                enabledPaymentMethods.length === 0 ||
                                Boolean(pendingCheckoutSessionId && !isAuthenticated)
                            }
                        >
                            {submitting
                                ? t("shopStore.creatingOrder")
                                : !isAuthenticated
                                  ? t("shopStore.sendCodeToConfirm")
                                  : t("shopStore.createOrder")}
                        </Button>
                    </form>

                    <aside className="rounded-3xl border border-surface-border bg-surface p-6 shadow-card">
                        <p className="text-sm text-text-muted">{t("shopStore.subtotal")}</p>
                        <p className="mt-2 text-3xl font-bold">
                            {formatCurrencyAmount(subtotal, company?.currency)}
                        </p>
                        <div className="mt-4 rounded-2xl bg-page p-4">
                            <p className="text-sm text-text-muted">{t("shopStore.selectedMethod")}</p>
                            <p className="mt-1 text-lg font-semibold">{getPaymentMethodLabel(paymentMethod, t)}</p>
                        </div>
                        <p className="mt-3 text-sm text-text-muted">{t("shopStore.manualDeliveryHint")}</p>
                    </aside>
                </div>
            </div>
        </main>
    );
}
