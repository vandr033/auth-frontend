"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Save, MapPin, Globe, CreditCard, CalendarClock, Bell, Share2, Languages } from "lucide-react";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SocialLinksForm } from "@/components/admin/settings/SocialLinksForm";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT, SUPPORTED_LOCALES } from "@/lib/i18n";
import { canUseEntitledFeature } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { RequestProductCTA } from "@/components/admin/product/RequestProductCTA";
import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
import type { SocialLinks } from "@/types/shop";
import type {
    ShopPendingProductRequestItem,
    ShopProductHistoryItem,
    ShopSubscriptionHistoryItem,
    ShopSubscriptionSnapshot,
} from "@/types/subscription-history";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { resolveApiUrl } from "@/lib/api-url";
import { normalizeApiError } from "@/lib/api-error";
import {
    LocationPicker,
    type LocationAutofillUpdate,
} from "@/components/admin/location/LocationPicker";
import { formatCurrencyAmount } from "@/lib/currency";
import { AdminPageHeader, AdminPageShell, ErrorBanner } from "@/components/admin/shared";
import {
    getProductAccessRecommendationForCapability,
    hasProductCapability,
} from "@/lib/product-access";

type SettingsTab = "booking" | "payments" | "subscription";

type SettingsPageProps = {
    initialTab?: SettingsTab;
    visibleTabs?: SettingsTab[];
    titleKey?: string;
    subtitleKey?: string;
};

// Combined interface
interface CompanySettings {
    // General (Company Model)
    name: string;
    slug: string;
    email: string;
    phone_prefix: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country_code: string;
    timezone: string;
    currency: string;
    google_maps_url: string;
    latitude: string;
    longitude: string;
    is_active: boolean;

    // Configuration (CompanySettings Model)
    booking_buffer_minutes: number;
    booking_time_granularity_minutes: number;
    booking_time_view_default: "hour" | "all";
    cancel_limit_minutes: number;
    reschedule_limit_minutes: number;
    auto_approve_staff_time_off: boolean;
    max_advance_booking_days: number | null;
    min_advance_booking_minutes: number | null;
    allow_qr_payment: boolean;
    qr_image_url: string | null;
    allow_cash_payment: boolean;
    require_comprobante_for_qr: boolean;
    auto_confirm_bookings: boolean;
    send_email_notifications: boolean;
    send_whatsapp_notifications: boolean;
    social_links: SocialLinks;
    default_language: string;
    custom_tos: string;
    staff_label: string;
}

const initialSettings: CompanySettings = {
    name: "",
    slug: "",
    email: "",
    phone_prefix: "591",
    phone: "",
    address: "",
    city: "",
    state: "",
    country_code: "BO",
    timezone: "America/La_Paz",
    currency: "Bs.",
    google_maps_url: "",
    latitude: "",
    longitude: "",
    is_active: true,
    // Defaults
    booking_buffer_minutes: 10,
    booking_time_granularity_minutes: 30,
    booking_time_view_default: "hour",
    cancel_limit_minutes: 120,
    reschedule_limit_minutes: 120,
    auto_approve_staff_time_off: false,
    max_advance_booking_days: null,
    min_advance_booking_minutes: null,
    allow_qr_payment: true,
    qr_image_url: null,
    allow_cash_payment: true,
    require_comprobante_for_qr: true,
    auto_confirm_bookings: true,
    send_email_notifications: true,
    send_whatsapp_notifications: false,
    social_links: {},
    default_language: "es",
    custom_tos: "",
    // Product terminology decision pending: staff_label is persisted as a merchant-customizable resource label.
    staff_label: "Equipo",
};

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString();
}

function formatPrice(value: string | null, currency?: string | null): string {
    if (!value) return "—";
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return value;
    return formatCurrencyAmount(parsed, currency);
}

function formatChangePair(previousValue: string, nextValue: string): string {
    return `${previousValue} → ${nextValue}`;
}

function formatProductHistoryValue(value: unknown): string {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "—";

    const record = value as {
        productName?: string;
        tierName?: string;
        tierCode?: string;
        requestedProducts?: Array<{ tierName?: string }>;
    };

    if (record.productName && record.tierName) {
        return `${record.productName} • ${record.tierName}`;
    }

    if (Array.isArray(record.requestedProducts)) {
        return record.requestedProducts
            .map((product) => product.tierName)
            .filter(Boolean)
            .join(", ") || "—";
    }

    if (typeof record.tierCode === "string") {
        return record.tierCode.replaceAll("_", " ");
    }

    return "—";
}

function formatProductHistoryAction(action: string): string {
    return action
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

const PLAN_LABEL_KEY: Record<string, string> = {
    STARTER: "adminSettings.planStarter",
    BUSINESS: "adminSettings.planBusiness",
    PRO: "adminSettings.planPro",
};

const BILLING_LABEL_KEY: Record<string, string> = {
    MONTHLY: "adminSettings.billingMonthly",
    YEARLY: "adminSettings.billingYearly",
};

function MessagingCapabilityRow({
    label,
    description,
    checked,
}: {
    label: string;
    description: string;
    checked: boolean;
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 pr-4">
                <Label className="text-base">{label}</Label>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            <Switch checked={checked} disabled />
        </div>
    );
}

export default function SettingsPage({
    initialTab = "booking",
    visibleTabs = ["booking", "payments", "subscription"],
    titleKey = "adminSettings.title",
    subtitleKey = "adminSettings.subtitle",
}: SettingsPageProps) {
    const { companyId, companyUser, user, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const capabilities = companyUser?.company?.capabilities;
    const hasBookingModule =
        isSuperAdmin ||
        hasProductCapability(capabilities, "RESERVAS_BASE") ||
        hasProductCapability(capabilities, "RESERVAS_PRO");
    const hasStoreModule =
        isSuperAdmin || hasProductCapability(capabilities, "COMMERCE_ACCESS");
    const canUseBasicMessaging = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_BASE");
    const hasMessagingPro = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_PRO");
    const hasMessagingReminders = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_REMINDERS");
    const hasMessagingReviewRequests = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_REVIEW_REQUESTS");
    const hasMessagingCampaigns = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_CAMPAIGNS");
    const hasBulkMessaging = isSuperAdmin || hasProductCapability(capabilities, "MENSAJERIA_BULK_WHATSAPP");
    const canCustomizeBookingFlow = Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, "BOOKING_FLOW_CUSTOMIZATION");
    const messagingBaseRecommendation = getProductAccessRecommendationForCapability("MENSAJERIA_BASE");
    const resolvedVisibleTabs = useMemo(
        () => visibleTabs.filter((tab) => tab !== "booking" || hasBookingModule),
        [hasBookingModule, visibleTabs],
    );
    const visibleTabSet = useMemo(() => new Set<SettingsTab>(resolvedVisibleTabs), [resolvedVisibleTabs]);
    const showStorefrontHandoff = resolvedVisibleTabs.some((tab) => tab !== "subscription");
    const showSaveActions = resolvedVisibleTabs.some((tab) => tab !== "subscription");

    const [settings, setSettings] = useState<CompanySettings>(initialSettings);
    const [subscriptionSummary, setSubscriptionSummary] = useState<ShopSubscriptionSnapshot | null>(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState<ShopSubscriptionHistoryItem[]>([]);
    const [productHistory, setProductHistory] = useState<ShopProductHistoryItem[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ShopPendingProductRequestItem[]>([]);
    const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedQR, setSelectedQR] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (!visibleTabSet.has(activeTab)) {
            setActiveTab(resolvedVisibleTabs[0] ?? "subscription");
        }
    }, [activeTab, resolvedVisibleTabs, visibleTabSet]);

    // Fetch company settings
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            // Fetch both Company Config and General Details
            const [companyRes, settingsRes, historyRes] = await Promise.all([
                fetch(resolveApiUrl(`/api/company/id/${companyId}`), { credentials: "include" }),
                fetch(resolveApiUrl(`/api/admin/settings`), { credentials: "include" }),
                fetch(resolveApiUrl(`/api/admin/settings/subscription-history`), { credentials: "include" }),
            ]);

            const companyData = companyRes.ok ? (await companyRes.json()) : {};
            const settingsData = settingsRes.ok ? (await settingsRes.json()) : {};
            const historyData = historyRes.ok ? (await historyRes.json()) : {};

            const company = companyData.data || companyData || {};
            const config = settingsData.data || settingsData || {};
            const historyPayload = historyData.data || {};

            setSettings(prev => ({
                ...prev,
                // General
                name: company.name || prev.name,
                slug: company.slug || prev.slug,
                email: company.email || prev.email,
                phone_prefix: company.phone_prefix || prev.phone_prefix,
                phone: company.phone || prev.phone,
                address: company.address || prev.address,
                city: company.city || prev.city,
                state: company.state || prev.state,
                country_code: company.country_code || prev.country_code,
                timezone: company.timezone || prev.timezone,
                currency: company.currency || prev.currency,
                google_maps_url: company.google_maps_url || prev.google_maps_url,
                latitude: company.latitude?.toString() || prev.latitude,
                longitude: company.longitude?.toString() || prev.longitude,
                is_active: company.is_active ?? prev.is_active,
                // Config
                booking_buffer_minutes: config.booking_buffer_minutes ?? prev.booking_buffer_minutes,
                booking_time_granularity_minutes: config.booking_time_granularity_minutes ?? prev.booking_time_granularity_minutes,
                booking_time_view_default: config.booking_time_view_default === "all" ? "all" : "hour",
                cancel_limit_minutes: config.cancel_limit_minutes ?? prev.cancel_limit_minutes,
                reschedule_limit_minutes: config.reschedule_limit_minutes ?? prev.reschedule_limit_minutes,
                auto_approve_staff_time_off: config.auto_approve_staff_time_off ?? prev.auto_approve_staff_time_off,
                max_advance_booking_days: config.max_advance_booking_days ?? prev.max_advance_booking_days,
                min_advance_booking_minutes: config.min_advance_booking_minutes ?? prev.min_advance_booking_minutes,
                allow_qr_payment: config.allow_qr_payment ?? prev.allow_qr_payment,
                qr_image_url: config.qr_image_url ?? prev.qr_image_url,
                allow_cash_payment: config.allow_cash_payment ?? prev.allow_cash_payment,
                require_comprobante_for_qr: config.require_comprobante_for_qr ?? prev.require_comprobante_for_qr,
                auto_confirm_bookings: config.auto_confirm_bookings ?? prev.auto_confirm_bookings,
                send_email_notifications: config.send_email_notifications ?? prev.send_email_notifications,
                send_whatsapp_notifications: config.send_whatsapp_notifications ?? prev.send_whatsapp_notifications,
                social_links: config.social_links ?? prev.social_links,
                default_language: config.default_language ?? prev.default_language,
                custom_tos: config.custom_tos ?? prev.custom_tos,
                staff_label: config.staff_label ?? prev.staff_label,
            }));

            if (historyPayload.company) {
                setSubscriptionSummary(historyPayload.company);
                setSubscriptionHistory(Array.isArray(historyPayload.history) ? historyPayload.history : []);
                setProductHistory(Array.isArray(historyPayload.productHistory) ? historyPayload.productHistory : []);
                setPendingRequests(Array.isArray(historyPayload.pendingRequests) ? historyPayload.pendingRequests : []);
                setSubscriptionError(null);
            } else {
                setSubscriptionSummary(null);
                setSubscriptionHistory([]);
                setProductHistory([]);
                setPendingRequests([]);
                setSubscriptionError(t("adminSettings.historyLoadFailed"));
            }

        } catch (err) {
            console.error("Failed to fetch settings:", err);
            void notify.error(t("adminSettings.failedToLoad"));
            setProductHistory([]);
            setPendingRequests([]);
            setSubscriptionError(t("adminSettings.historyLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Handle input change
    const handleChange = (field: keyof CompanySettings, value: string | boolean | number | null | SocialLinks) => {
        setSettings(prev => {
            const next = { ...prev, [field]: value };

            // Auto-extract from Google Maps URL
            if (field === 'google_maps_url' && typeof value === 'string') {
                let url = value;

                // If user pasted an iframe, extract src
                if (value.includes('<iframe')) {
                    const srcMatch = value.match(/src="([^"]+)"/);
                    if (srcMatch && srcMatch[1]) {
                        url = srcMatch[1];
                        next.google_maps_url = url; // Update field to just URL
                    }
                }

                // Extract coordinates from pb parameter
                // Format: ...!2d-63.19750242438211!3d-17.767202574620846!...
                const longMatch = url.match(/!2d(-?\d+\.?\d*)/);
                const latMatch = url.match(/!3d(-?\d+\.?\d*)/);

                if (longMatch && longMatch[1]) {
                    next.longitude = longMatch[1];
                }
                if (latMatch && latMatch[1]) {
                    next.latitude = latMatch[1];
                }
            }

            return next;
        });
    };

    const handleLocationAutofill = useCallback((update: LocationAutofillUpdate) => {
        setSettings((prev) => {
            const fields = { ...update.fields };
            if (timezoneManuallyEdited) {
                delete fields.timezone;
            }

            // Field mapping: stateRegion -> state, countryCode -> country_code.
            return {
                ...prev,
                address: fields.address ?? prev.address,
                city: fields.city ?? prev.city,
                state: fields.stateRegion ?? prev.state,
                country_code: fields.countryCode ?? prev.country_code,
                timezone: fields.timezone ?? prev.timezone,
                latitude: fields.latitude ?? prev.latitude,
                longitude: fields.longitude ?? prev.longitude,
            };
        });
    }, [timezoneManuallyEdited]);

    // Save changes
    const handleSave = async () => {
        if (!companyId) return;

        const normalizedCurrency = settings.currency.trim();
        if (!normalizedCurrency || normalizedCurrency.length > 3) {
            await notify.warning(t("adminSettings.currencyInvalid"));
            return;
        }

        setSaving(true);
        try {
            let qrUrl = settings.qr_image_url;

            // Upload QR if selected
            if (selectedQR) {
                const formData = new FormData();
                formData.append('image', selectedQR);
                formData.append('company_id', companyId.toString());
                const uploadRes = await fetch(resolveApiUrl('/api/upload/qr'), {
                    method: 'POST',
                    body: formData,
                    credentials: "include",
                });

                if (!uploadRes.ok) {
                    const uploadPayload = await uploadRes.json().catch(() => null);
                    throw normalizeApiError(uploadPayload, uploadRes.status, t('adminSettings.uploadQrFailed'));
                }

                const uploadData = await uploadRes.json();
                qrUrl = uploadData.data?.url || uploadData.url;
            }

            // Payload for Company (General)
            const payloadCompany = {
                name: settings.name,
                slug: settings.slug,
                email: settings.email,
                phone: settings.phone,
                phone_prefix: settings.phone_prefix,
                address: settings.address,
                city: settings.city,
                state: settings.state,
                country_code: settings.country_code,
                timezone: settings.timezone,
                currency: normalizedCurrency,
                google_maps_url: settings.google_maps_url,
                latitude: settings.latitude ? parseFloat(settings.latitude) : null,
                longitude: settings.longitude ? parseFloat(settings.longitude) : null,
                is_active: settings.is_active,
            };

            // Payload for Admin Settings (Config)
            const payloadSettings = {
                booking_buffer_minutes: Number(settings.booking_buffer_minutes),
                booking_time_granularity_minutes: Number(settings.booking_time_granularity_minutes),
                booking_time_view_default: settings.booking_time_view_default,
                cancel_limit_minutes: Number(settings.cancel_limit_minutes),
                reschedule_limit_minutes: Number(settings.reschedule_limit_minutes),
                auto_approve_staff_time_off: settings.auto_approve_staff_time_off,
                max_advance_booking_days: settings.max_advance_booking_days,
                min_advance_booking_minutes: settings.min_advance_booking_minutes,
                allow_qr_payment: settings.allow_qr_payment,
                qr_image_url: qrUrl,
                allow_cash_payment: settings.allow_cash_payment,
                require_comprobante_for_qr: settings.require_comprobante_for_qr,
                auto_confirm_bookings: settings.auto_confirm_bookings,
                send_email_notifications: settings.send_email_notifications,
                send_whatsapp_notifications: settings.send_whatsapp_notifications,
                social_links: settings.social_links,
                default_language: settings.default_language,
                custom_tos: settings.custom_tos || "",
                staff_label: settings.staff_label || t("adminSettings.staffLabelPlaceholder"),
            };

            const [companyRes, settingsRes] = await Promise.all([
                fetch(resolveApiUrl(`/api/company/id/${companyId}`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payloadCompany),
                }),
                fetch(resolveApiUrl(`/api/admin/settings`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payloadSettings),
                }),
            ]);

            if (!companyRes.ok) {
                const errorData = await companyRes.json().catch(() => ({}));
                throw normalizeApiError(errorData, companyRes.status, t('adminSettings.saveSettingsFailed'));
            }
            if (!settingsRes.ok) {
                const errorData = await settingsRes.json().catch(() => ({}));
                throw normalizeApiError(errorData, settingsRes.status, t('adminSettings.saveConfigFailed'));
            }

            // Update state with new URL if uploaded
            setSettings(prev => ({ ...prev, qr_image_url: qrUrl }));
            setSelectedQR(null); // Clear selection after upload
            await notify.success(t("adminSettings.savedTitle"), t("adminSettings.savedMessage"));
        } catch (err) {
            console.error("Save error:", err);
            await notify.error(err instanceof Error ? err.message : t('adminSettings.saveSettingsFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
            </div>
        );
    }

    return (
        <AdminPageShell className="max-w-4xl pb-12">
            <AdminPageHeader
                title={t(titleKey)}
                subtitle={t(subtitleKey)}
                actions={showStorefrontHandoff ? (
                    <Link href="/admin/dashboard/storefront/business">
                        <Button variant="outline">{t("adminNav.groups.storefront")}</Button>
                    </Link>
                ) : undefined}
            />

            {showStorefrontHandoff ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("adminNav.groups.storefront")}</CardTitle>
                        <CardDescription>{t("storefrontBuilder.subtitle")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            {t("storefrontBuilder.legacyToolsBody")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/admin/dashboard/storefront/content">
                                <Button variant="outline" size="sm">{t("storefrontBuilder.content")}</Button>
                            </Link>
                            <Link href="/admin/dashboard/storefront/appearance">
                                <Button variant="outline" size="sm">{t("adminTheme.visualStyle")}</Button>
                            </Link>
                            <Link href="/admin/dashboard/storefront/business">
                                <Button variant="outline" size="sm">{t("storefrontBuilder.businessInfo")}</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-6 min-w-0">
                <TabsList className="config-tabs w-full justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-md border border-admin-border bg-admin-surface p-1 text-slate-600 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {visibleTabSet.has("booking") ? (
                        <TabsTrigger
                            value="booking"
                            className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-admin-brand-soft data-[state=active]:text-admin-brand-hover data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-admin-border-strong"
                        >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            {t('adminSettings.bookingRules')}
                        </TabsTrigger>
                    ) : null}
                    {visibleTabSet.has("payments") ? (
                        <TabsTrigger
                            value="payments"
                            className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-admin-brand-soft data-[state=active]:text-admin-brand-hover data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-admin-border-strong"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t('adminSettings.payments')}
                        </TabsTrigger>
                    ) : null}
                    {visibleTabSet.has("subscription") ? (
                        <TabsTrigger
                            value="subscription"
                            className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-admin-brand-soft data-[state=active]:text-admin-brand-hover data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-admin-border-strong"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t('adminSettings.subscription')}
                        </TabsTrigger>
                    ) : null}
                </TabsList>

                {/* --- GENERAL TAB --- */}
                <TabsContent value="general" className="space-y-6">
                    {/* General Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.companyInformation')}</CardTitle>
                            <CardDescription>{t('adminSettings.companyInformationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('adminSettings.companyName')}</Label>
                                <Input
                                    id="name"
                                    value={settings.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder={t('adminSettings.companyNamePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">
                                    {t('adminSettings.slug')}
                                    <span className="ml-1 text-xs text-slate-400 font-normal">
                                        ({t('adminSettings.slugHelpPrefix')}<strong>{t('adminSettings.slugHelpExample')}</strong>)
                                    </span>
                                </Label>
                                <Input
                                    id="slug"
                                    value={settings.slug}
                                    onChange={(e) => handleChange('slug', e.target.value)}
                                    placeholder={t('adminSettings.slugPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('adminSettings.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder={t('adminSettings.emailPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">{t('adminSettings.currency')}</Label>
                                <Input
                                    id="currency"
                                    value={settings.currency}
                                    onChange={(e) =>
                                        handleChange('currency', e.target.value.slice(0, 3))
                                    }
                                    placeholder={t('adminSettings.currencyPlaceholder')}
                                    maxLength={3}
                                    className="uppercase"
                                />
                                <p className="text-xs text-slate-500">{t('adminSettings.currencyCodeHelp')}</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-4">
                                <div className="space-y-2 sm:col-span-1">
                                    <Label htmlFor="phone_prefix">{t('adminSettings.prefix')}</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={settings.phone_prefix}
                                        onChange={(e) => handleChange('phone_prefix', e.target.value)}
                                        placeholder="591"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-3">
                                    <Label htmlFor="phone">{t('adminSettings.phone')}</Label>
                                    <Input
                                        id="phone"
                                        value={settings.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col justify-end pb-2">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.activeStatus')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.visibleToPublic')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.is_active}
                                        onCheckedChange={(checked) => handleChange('is_active', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.locationAddress')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <LocationPicker
                                    value={{
                                        address: settings.address,
                                        city: settings.city,
                                        stateRegion: settings.state,
                                        countryCode: settings.country_code,
                                        timezone: settings.timezone,
                                        latitude: settings.latitude,
                                        longitude: settings.longitude,
                                    }}
                                    text={{
                                        searchLabel: t('adminSettings.searchLocation'),
                                        searchPlaceholder: t('adminSettings.searchLocationPlaceholder'),
                                        helperText: t('adminSettings.searchLocationHelper'),
                                        searchLoadingText: t('adminSettings.locationSearchLoading'),
                                        searchErrorText: t('adminSettings.locationSearchError'),
                                        noResultsText: t('adminSettings.locationSearchNoResults'),
                                        reverseGeocodeLoadingText: t('adminSettings.reverseGeocodeLoading'),
                                        reverseGeocodeErrorText: t('adminSettings.reverseGeocodeError'),
                                        mapUnavailableText: t('adminSettings.mapUnavailable'),
                                        missingTokenText: t('adminSettings.mapTokenMissing'),
                                    }}
                                    onLocationAutofill={handleLocationAutofill}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">{t('adminSettings.address')}</Label>
                                <Input
                                    id="address"
                                    value={settings.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder={t('adminSettings.addressPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">{t('adminSettings.city')}</Label>
                                <Input
                                    id="city"
                                    value={settings.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder={t('adminSettings.cityPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">{t('adminSettings.stateProvince')}</Label>
                                <Input
                                    id="state"
                                    value={settings.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    placeholder={t('adminSettings.statePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country_code">{t('adminSettings.countryCode')}</Label>
                                <Input
                                    id="country_code"
                                    value={settings.country_code}
                                    onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                                    placeholder={t('adminSettings.countryCodePlaceholder')}
                                    maxLength={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timezone">{t('adminSettings.timezone')}</Label>
                                <Input
                                    id="timezone"
                                    value={settings.timezone}
                                    onChange={(e) => {
                                        setTimezoneManuallyEdited(true);
                                        handleChange('timezone', e.target.value);
                                    }}
                                    placeholder={t('adminSettings.timezonePlaceholder')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Map Integration Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.mapIntegration')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="google_maps_url">{t('adminSettings.googleMapsUrl')}</Label>
                                <Input
                                    id="google_maps_url"
                                    value={settings.google_maps_url}
                                    onChange={(e) => handleChange('google_maps_url', e.target.value)}
                                    placeholder={t('adminSettings.googleMapsPlaceholder')}
                                />
                                <p className="text-xs text-slate-500">
                                    {t('adminSettings.googleMapsHelp')}
                                </p>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="latitude">{t('adminSettings.latitude')}</Label>
                                    <Input
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        value={settings.latitude}
                                        onChange={(e) => handleChange('latitude', e.target.value)}
                                        placeholder="-16.5000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitude">{t('adminSettings.longitude')}</Label>
                                    <Input
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        value={settings.longitude}
                                        onChange={(e) => handleChange('longitude', e.target.value)}
                                        placeholder="-68.1500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">{t('adminSettings.coordinatesHelper')}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- BOOKING TAB --- */}
                <TabsContent value="booking" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.bookingConfiguration')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.bookingConfigurationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="booking_buffer_minutes">{t('adminSettings.bufferTime')}</Label>
                                <Input
                                    id="booking_buffer_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.booking_buffer_minutes}
                                    onChange={(e) => handleChange('booking_buffer_minutes', e.target.value)}
                                    placeholder="10"
                                />
                                <p className="text-xs text-slate-500">
                                    Minimum time before a booking can be made
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="booking_time_granularity_minutes">{t('adminSettings.timeSlotInterval')}</Label>
                                <Input
                                    id="booking_time_granularity_minutes"
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={settings.booking_time_granularity_minutes}
                                    onChange={(e) => handleChange('booking_time_granularity_minutes', e.target.value)}
                                    placeholder="30"
                                />
                                <p className="text-xs text-slate-500">
                                    Frequency of available time slots (e.g., every 15, 30, 60 mins)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="booking_time_view_default">{t('adminSettings.bookingTimeViewDefault')}</Label>
                                <Select
                                    value={settings.booking_time_view_default}
                                    onValueChange={(value) => handleChange('booking_time_view_default', value as "hour" | "all")}
                                >
                                    <SelectTrigger id="booking_time_view_default">
                                        <SelectValue placeholder={t('adminSettings.bookingTimeViewDefault')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hour">{t('adminSettings.bookingTimeViewHour')}</SelectItem>
                                        <SelectItem value="all">{t('adminSettings.bookingTimeViewAll')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    {t('adminSettings.bookingTimeViewDefaultDesc')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cancel_limit_minutes">{t('adminSettings.cancellationLimit')}</Label>
                                <Input
                                    id="cancel_limit_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.cancel_limit_minutes}
                                    onChange={(e) => handleChange('cancel_limit_minutes', e.target.value)}
                                    placeholder="120"
                                />
                                <p className="text-xs text-slate-500">
                                    Minutes before appointment customers can cancel (0 = always)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reschedule_limit_minutes">{t('adminSettings.rescheduleLimit')}</Label>
                                <Input
                                    id="reschedule_limit_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.reschedule_limit_minutes}
                                    onChange={(e) => handleChange('reschedule_limit_minutes', e.target.value)}
                                    placeholder="120"
                                />
                                <p className="text-xs text-slate-500">
                                    Minutes before appointment customers can reschedule
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.autoApproveTimeOff')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.autoApproveTimeOffDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.auto_approve_staff_time_off}
                                        onCheckedChange={(checked) => handleChange('auto_approve_staff_time_off', checked)}
                                    />
                                </div>

                                {/* Advance booking limits */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('adminSettings.maxAdvanceDays')}</Label>
                                        <p className="text-xs text-slate-500">{t('adminSettings.maxAdvanceDaysDesc')}</p>
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder={t('adminSettings.noLimit')}
                                            value={settings.max_advance_booking_days ?? ""}
                                            onChange={(e) => handleChange('max_advance_booking_days', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminSettings.minAdvanceMinutes')}</Label>
                                        <p className="text-xs text-slate-500">{t('adminSettings.minAdvanceMinutesDesc')}</p>
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder={t('adminSettings.noLimit')}
                                            value={settings.min_advance_booking_minutes ?? ""}
                                            onChange={(e) => handleChange('min_advance_booking_minutes', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- PAYMENTS & NOTIFICATIONS TAB --- */}
                <TabsContent value="payments" className="space-y-6">
                    {hasBookingModule ? (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-slate-500" />
                                    <CardTitle>{t('adminSettings.paymentMethods')}</CardTitle>
                                </div>
                                <CardDescription>{t('adminSettings.paymentMethodsDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {hasStoreModule ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                                        <p>{t("adminSettings.bookingQrStoreHint")}</p>
                                        <Link
                                            href="/admin/dashboard/store/settings"
                                            className="mt-2 inline-flex font-medium text-amber-900 underline underline-offset-2"
                                        >
                                            {t("adminSettings.openStoreSettings")}
                                        </Link>
                                    </div>
                                ) : null}

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.allowCash')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.allowCashDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.allow_cash_payment}
                                        onCheckedChange={(checked) => handleChange('allow_cash_payment', checked)}
                                    />
                                </div>

                                <div className="space-y-4 rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">{t('adminSettings.allowQR')}</Label>
                                            <p className="text-sm text-slate-500">
                                                {t('adminSettings.allowQRDesc')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.allow_qr_payment}
                                            onCheckedChange={(checked) => handleChange('allow_qr_payment', checked)}
                                        />
                                    </div>

                                    {settings.allow_qr_payment && (
                                        <div className="mt-4 border-t pt-4">
                                            <Label className="mb-2 block">{t('adminSettings.qrImage')}</Label>
                                            <p className="text-sm text-slate-500 mb-4">
                                                {t('adminSettings.qrImageDesc')}
                                            </p>
                                            <div className="flex justify-start">
                                                <ImageUpload
                                                    companyId={Number(companyId)}
                                                    type="qr"
                                                    autoUpload={false}
                                                    currentUrl={selectedQR ? URL.createObjectURL(selectedQR) : (settings.qr_image_url || undefined)}
                                                    onFileSelect={setSelectedQR}
                                                    aspectRatio="1:1"
                                                    className="w-full max-w-[250px]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {settings.allow_qr_payment && (
                                    <div className={`flex items-center justify-between rounded-lg border p-4 ${!canCustomizeBookingFlow ? "opacity-50" : ""}`}>
                                        <div className="space-y-0.5">
                                            <Label className="text-base">{t('adminSettings.requireComprobante')}</Label>
                                            <p className="text-sm text-slate-500">
                                                {t('adminSettings.requireComprobanteDesc')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.require_comprobante_for_qr}
                                            onCheckedChange={(checked) => handleChange('require_comprobante_for_qr', checked)}
                                            disabled={!canCustomizeBookingFlow}
                                        />
                                    </div>
                                )}

                                <div className={`flex items-center justify-between rounded-lg border p-4 ${!canCustomizeBookingFlow ? "opacity-50" : ""}`}>
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.autoConfirmBookings')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.autoConfirmBookingsDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.auto_confirm_bookings}
                                        onCheckedChange={(checked) => handleChange('auto_confirm_bookings', checked)}
                                        disabled={!canCustomizeBookingFlow}
                                    />
                                </div>
                                {!canCustomizeBookingFlow && (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.availableOnBusiness")}
                                        feature="BOOKING_FLOW_CUSTOMIZATION"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.messagingBasic')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.messagingBasicDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!canUseBasicMessaging ? (
                                <RequestProductCTA
                                    productCode={messagingBaseRecommendation.productCode}
                                    tierCode={messagingBaseRecommendation.tierCode}
                                    capability={messagingBaseRecommendation.capability}
                                    title={t("adminSettings.messagingBasicLockedTitle")}
                                    description={t("adminSettings.messagingBasicLockedDescription")}
                                    ctaLabel={messagingBaseRecommendation.ctaLabel}
                                    source="SETTINGS_LOCKED_CONTROL"
                                />
                            ) : null}
                            <div className={`flex items-center justify-between rounded-lg border p-4 ${!canUseBasicMessaging ? "opacity-50" : ""}`}>
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('adminSettings.emailNotifications')}</Label>
                                    <p className="text-sm text-slate-500">
                                        {t('adminSettings.emailNotificationsDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.send_email_notifications}
                                    onCheckedChange={(checked) => handleChange('send_email_notifications', checked)}
                                    disabled={!canUseBasicMessaging}
                                />
                            </div>
                            <div className={`flex items-center justify-between rounded-lg border p-4 ${!canUseBasicMessaging ? "opacity-50" : ""}`}>
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('adminSettings.whatsappNotifications')}</Label>
                                    <p className="text-sm text-slate-500">
                                        {t('adminSettings.whatsappNotificationsDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.send_whatsapp_notifications}
                                    onCheckedChange={(checked) => handleChange('send_whatsapp_notifications', checked)}
                                    disabled={!canUseBasicMessaging}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.communicationAutomation')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.communicationAutomationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!hasMessagingPro ? (
                                <EntitlementLockedCard
                                    title={t("adminSettings.communicationAutomation")}
                                    description={t("adminSettings.communicationAutomationDesc")}
                                    capability="MENSAJERIA_PRO"
                                    source="SETTINGS_LOCKED_CONTROL"
                                    notice={t("entitlements.messagingProLocked")}
                                    compact
                                />
                            ) : null}

                            <MessagingCapabilityRow
                                label={t("adminSettings.automaticReminders")}
                                description={t("adminSettings.automaticRemindersDesc")}
                                checked={hasMessagingReminders}
                            />
                            <MessagingCapabilityRow
                                label={t("adminSettings.reviewRequests")}
                                description={t("adminSettings.reviewRequestsDesc")}
                                checked={hasMessagingReviewRequests}
                            />
                            <MessagingCapabilityRow
                                label={t("adminSettings.bulkMessages")}
                                description={t("adminSettings.bulkMessagesDesc")}
                                checked={hasBulkMessaging}
                            />
                            <MessagingCapabilityRow
                                label={t("adminSettings.campaigns")}
                                description={t("adminSettings.campaignsDesc")}
                                checked={hasMessagingCampaigns}
                            />
                            <MessagingCapabilityRow
                                label={t("adminSettings.templates")}
                                description={t("adminSettings.templatesDesc")}
                                checked={hasMessagingPro}
                            />

                            {hasMessagingPro ? (
                                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    {t("adminSettings.messagingProEnabledHint")}
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SOCIAL MEDIA TAB --- */}
                <TabsContent value="social" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.socialMediaLinks')}</CardTitle>
                            </div>
                            <CardDescription>
                                {t('adminSettings.socialMediaLinksDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SocialLinksForm
                                socialLinks={settings.social_links}
                                onChange={(links) => handleChange('social_links', links)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- LANGUAGE TAB --- */}
                <TabsContent value="language" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Languages className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.language')}</CardTitle>
                            </div>
                            <CardDescription>
                                {t('adminSettings.defaultLanguageDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 max-w-xs">
                                <Label htmlFor="default_language">{t('adminSettings.defaultLanguage')}</Label>
                                <Select
                                    value={settings.default_language}
                                    onValueChange={(value) => handleChange('default_language', value)}
                                >
                                    <SelectTrigger id="default_language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_LOCALES.map((locale) => (
                                            <SelectItem key={locale} value={locale}>
                                                {t(`language.${locale}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 max-w-xs">
                                <Label htmlFor="staff_label">{t('adminSettings.staffLabelTitle')}</Label>
                                <Input
                                    id="staff_label"
                                    value={settings.staff_label}
                                    onChange={(e) => handleChange('staff_label', e.target.value)}
                                    placeholder={t('adminSettings.staffLabelPlaceholder')}
                                    maxLength={50}
                                />
                                <p className="text-xs text-slate-500">{t('adminSettings.staffLabelDesc')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TOS TAB --- */}
                <TabsContent value="tos" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.tosTitle')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.tosDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <textarea
                                id="custom_tos"
                                rows={12}
                                value={settings.custom_tos}
                                onChange={(e) => handleChange('custom_tos', e.target.value)}
                                placeholder={t('adminSettings.tosPlaceholder')}
                                className="admin-textarea resize-y"
                            />
                            <p className="text-xs text-slate-500">{t('adminSettings.tosHelp')}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.planHistory')}</CardTitle>
                            <CardDescription>{t('adminSettings.billingSubtitle')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscriptionSummary ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Productos activos</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {subscriptionSummary.activeProducts
                                                    .filter((product) => product.isCoreProduct)
                                                    .map((product) => product.tierName)
                                                    .join(", ") || "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Add-ons activos</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {subscriptionSummary.activeProducts
                                                    .filter((product) => !product.isCoreProduct)
                                                    .map((product) => product.tierName)
                                                    .join(", ") || "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Solicitudes pendientes</p>
                                            <p className="text-sm font-semibold text-slate-900">{pendingRequests.length}</p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Compatibilidad legacy</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {subscriptionSummary.legacyPlanCompatibility}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.billingCycle')}</p>
                                            <p className="text-sm font-semibold text-slate-900">{t(BILLING_LABEL_KEY[subscriptionSummary.billingCycle] ?? 'adminSettings.billingMonthly')}</p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.availableUntil')}</p>
                                            <p className="text-sm font-semibold text-slate-900">{formatDateTime(subscriptionSummary.availableUntil)}</p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.pricePaid')}</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatPrice(subscriptionSummary.pricePaid, settings.currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.expirationStatus')}</p>
                                            <Badge className={subscriptionSummary.isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                                                {subscriptionSummary.isExpired ? t('adminSettings.expired') : t('adminSettings.active')}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Producto</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>{t('adminSettings.billingCycle')}</TableHead>
                                                    <TableHead>{t('adminSettings.availableUntil')}</TableHead>
                                                    <TableHead>{t('adminSettings.pricePaid')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subscriptionSummary.activeProducts.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                                                            No hay productos activos.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    subscriptionSummary.activeProducts.map((product) => (
                                                        <TableRow key={`${product.productCode}-${product.tierCode}`}>
                                                            <TableCell>{product.productName}</TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span>{product.tierName}</span>
                                                                    <Badge variant="secondary">
                                                                        {product.isCoreProduct ? "Core" : "Add-on"}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{t(BILLING_LABEL_KEY[product.billingCycle] ?? 'adminSettings.billingMonthly')}</TableCell>
                                                            <TableCell>{formatDateTime(product.availableUntil)}</TableCell>
                                                            <TableCell>{formatPrice(product.pricePaid, product.currency || settings.currency)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Solicitudes pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subscriptionError ? (
                                <ErrorBanner description={subscriptionError} />
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Solicitada</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Tier</TableHead>
                                                <TableHead>Origen</TableHead>
                                                <TableHead>Mensaje</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingRequests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                                                        No hay solicitudes pendientes.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                pendingRequests.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <p>{formatDateTime(entry.createdAt)}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {entry.requestedBy?.displayName || entry.requestedBy?.email || "—"}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{entry.productName}</TableCell>
                                                        <TableCell>{entry.tierName}</TableCell>
                                                        <TableCell>{entry.source}</TableCell>
                                                        <TableCell>{entry.message || "—"}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subscriptionError ? (
                                <ErrorBanner description={subscriptionError} />
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('adminSettings.changedAt')}</TableHead>
                                                <TableHead>{t('adminSettings.changedBy')}</TableHead>
                                                <TableHead>Acción</TableHead>
                                                <TableHead>Anterior</TableHead>
                                                <TableHead>Nuevo</TableHead>
                                                <TableHead>Origen</TableHead>
                                                <TableHead>{t('adminSettings.note')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productHistory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="py-6 text-center text-slate-500">
                                                        No hay cambios de productos todavía.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                productHistory.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                                                        <TableCell>{entry.actor?.displayName || entry.actor?.email || t('adminSettings.systemActor')}</TableCell>
                                                        <TableCell>{formatProductHistoryAction(entry.action)}</TableCell>
                                                        <TableCell>{formatProductHistoryValue(entry.previousValue)}</TableCell>
                                                        <TableCell>{formatProductHistoryValue(entry.newValue)}</TableCell>
                                                        <TableCell>{entry.source || "—"}</TableCell>
                                                        <TableCell>{entry.note || "—"}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.subscriptionChanges')}</CardTitle>
                            <CardDescription>Cambios legacy conservados por compatibilidad administrativa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscriptionError ? (
                                <ErrorBanner description={subscriptionError} />
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('adminSettings.changedAt')}</TableHead>
                                                <TableHead>{t('adminSettings.changedBy')}</TableHead>
                                                <TableHead>{t('adminSettings.plan')}</TableHead>
                                                <TableHead>{t('adminSettings.billingCycle')}</TableHead>
                                                <TableHead>{t('adminSettings.pricePaid')}</TableHead>
                                                <TableHead>{t('adminSettings.availableUntil')}</TableHead>
                                                <TableHead>{t('adminSettings.visibleInMarketplace')}</TableHead>
                                                <TableHead>{t('adminSettings.note')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subscriptionHistory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                                                        {t('adminSettings.noSubscriptionChanges')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                subscriptionHistory.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{formatDateTime(entry.changedAt)}</TableCell>
                                                        <TableCell>{entry.changedBy?.displayName || entry.changedBy?.email || t('adminSettings.systemActor')}</TableCell>
                                                        <TableCell>{formatChangePair(entry.previousPlan ? t(PLAN_LABEL_KEY[entry.previousPlan] ?? 'adminSettings.planStarter') : '—', t(PLAN_LABEL_KEY[entry.newPlan] ?? 'adminSettings.planStarter'))}</TableCell>
                                                        <TableCell>{formatChangePair(entry.previousBillingCycle ? t(BILLING_LABEL_KEY[entry.previousBillingCycle] ?? 'adminSettings.billingMonthly') : '—', t(BILLING_LABEL_KEY[entry.newBillingCycle] ?? 'adminSettings.billingMonthly'))}</TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                formatPrice(entry.previousPricePaid, settings.currency),
                                                                formatPrice(entry.newPricePaid, settings.currency),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                formatDateTime(entry.previousAvailableUntil),
                                                                formatDateTime(entry.newAvailableUntil),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                entry.previousMarketplaceVisible === null
                                                                    ? '—'
                                                                    : entry.previousMarketplaceVisible
                                                                        ? t('superAdminShops.yes')
                                                                        : t('superAdminShops.no'),
                                                                entry.newMarketplaceVisible ? t('superAdminShops.yes') : t('superAdminShops.no'),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{entry.note || '—'}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {subscriptionSummary ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Solicitar productos adicionales</CardTitle>
                                <CardDescription>
                                    Si necesitas ampliar el stack de tu negocio, puedes enviar una solicitud desde aquí.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    "EVENTOS",
                                    "CLASES",
                                    "CRM",
                                    "MENSAJERIA",
                                ].map((productCode) => {
                                    const alreadyCovered =
                                        subscriptionSummary.activeProducts.some((product) => product.productCode === productCode) ||
                                        subscriptionSummary.requestedProducts.some((product) => product.productCode === productCode);

                                    if (alreadyCovered) return null;

                                    const recommendation = getProductAccessRecommendationForCapability(
                                        productCode === "EVENTOS"
                                            ? "EVENTOS_BASE"
                                            : productCode === "CLASES"
                                                ? "CLASES_PRO"
                                                : productCode === "CRM"
                                                    ? "CRM_PRO"
                                                    : "MENSAJERIA_PRO",
                                    );

                                    return (
                                        <RequestProductCTA
                                            key={productCode}
                                            productCode={recommendation.productCode}
                                            tierCode={recommendation.tierCode}
                                            capability={recommendation.capability}
                                            title={recommendation.title}
                                            description={recommendation.description}
                                            ctaLabel={recommendation.ctaLabel}
                                            source="SETTINGS_LOCKED_CONTROL"
                                        />
                                    );
                                })}
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>
            </Tabs>

            {showSaveActions ? (
                <StickyFormActions
                    onSave={handleSave}
                    loading={saving}
                    saveLabel={t('common.save')}
                    loadingLabel={t('adminSettings.saving')}
                    saveIcon={<Save className="h-4 w-4" />}
                    saveClassName="bg-admin-brand hover:bg-admin-brand-hover text-white"
                />
            ) : null}
        </AdminPageShell>
    );
}
