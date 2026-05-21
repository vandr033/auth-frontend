"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Upload, UserRound, Users } from "lucide-react";
import {
    CreateBookingData,
    CreateRecurringBookingData,
    CustomerRecord,
    ServiceCategory,
    ServiceItem,
    StaffMember,
    getCustomers,
    uploadAdminQrProof,
} from "@/app/admin/lib/adminApi";
import { useT } from "@/lib/i18n";
import { formatCurrencyFromCents } from "@/lib/currency";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { getImageUrl } from "@/utils/image-url";

export type StaffOption = StaffMember;
export type ServiceOption = ServiceItem;

type BookingMode = "single" | "recurring";
type CustomerMode = "existing" | "guest";
type PaymentMethodValue = "NONE" | "CASH" | "QR";

interface RecurringTemplate {
    id: string;
    weekday: string;
    time: string;
    serviceIds: string[];
}

interface SessionPaymentState {
    isPaid: boolean;
    paymentMethod: PaymentMethodValue;
    qrProofUrl: string | null;
}

interface SingleSessionSlotState {
    date: string;
    time: string;
}

interface NewBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffList: StaffMember[];
    serviceList: ServiceItem[];
    currency?: string | null;
    fixedStaffId?: number | null;
    allowExistingCustomerSelection?: boolean;
    onCreate: (data: CreateBookingData) => Promise<void>;
    onCreateRecurring: (data: CreateRecurringBookingData) => Promise<void>;
}

const WEEKDAY_OPTIONS = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
];

function createTemplate(): RecurringTemplate {
    return {
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        weekday: "1",
        time: "09:00",
        serviceIds: [],
    };
}

function getServiceDisplayPriceCents(service: ServiceItem): number {
    return service.pricing?.final_price_cents ?? service.price_cents;
}

function combinePhone(prefix?: string | null, phone?: string | null): string | undefined {
    const normalizedPhone = (phone || "").trim();
    if (!normalizedPhone) return undefined;
    const normalizedPrefix = (prefix || "").trim();
    return normalizedPrefix ? `${normalizedPrefix} ${normalizedPhone}` : normalizedPhone;
}

function getWeekdayLabel(t: (key: string) => string, weekday: number) {
    const keys = [
        "common.days.sunday",
        "common.days.monday",
        "common.days.tuesday",
        "common.days.wednesday",
        "common.days.thursday",
        "common.days.friday",
        "common.days.saturday",
    ];
    const key = keys[weekday];
    return key ? t(key) : WEEKDAY_OPTIONS.find((option) => Number(option.value) === weekday)?.label || "";
}

function buildLocalDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`);
}

function doIntervalsOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
) {
    return startA < endB && endA > startB;
}

function ServiceChecklist(props: {
    t: (key: string, vars?: Record<string, string | number>) => string;
    currency?: string | null;
    servicesByCategory: Array<{ category: ServiceCategory; services: ServiceItem[] }>;
    selectedIds: string[];
    onToggle: (serviceId: string, checked: boolean) => void;
    emptyMessage: string;
}) {
    const { t, currency, servicesByCategory, selectedIds, onToggle, emptyMessage } = props;

    if (servicesByCategory.length === 0) {
        return (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className="max-h-56 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {servicesByCategory.map(({ category, services }) => (
                <div key={category.id}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category.name}
                    </h4>
                    <div className="space-y-2">
                        {services.map((service) => (
                            <label
                                key={service.id}
                                htmlFor={`service-${category.id}-${service.id}`}
                                className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent bg-white px-3 py-2 transition hover:border-slate-200 hover:bg-slate-100"
                            >
                                <Checkbox
                                    id={`service-${category.id}-${service.id}`}
                                    checked={selectedIds.includes(String(service.id))}
                                    onCheckedChange={(checked) => onToggle(String(service.id), checked === true)}
                                />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-slate-900">{service.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {t("shopBooking.duration", { minutes: service.duration_minutes })} · {formatCurrencyFromCents(getServiceDisplayPriceCents(service), currency)}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function NewBookingModal({
    isOpen,
    onClose,
    staffList,
    serviceList,
    currency,
    fixedStaffId,
    allowExistingCustomerSelection = true,
    onCreate,
    onCreateRecurring,
}: NewBookingModalProps) {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const companyId = companyUser?.company?.id;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<BookingMode>("single");
    const [customerMode, setCustomerMode] = useState<CustomerMode>("guest");
    const [customerQuery, setCustomerQuery] = useState("");
    const [customerResults, setCustomerResults] = useState<CustomerRecord[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [uploadingSingleQr, setUploadingSingleQr] = useState(false);
    const [uploadingSessions, setUploadingSessions] = useState<Record<string, boolean>>({});
    const [staffId, setStaffId] = useState("");
    const [singleServiceIds, setSingleServiceIds] = useState<string[]>([]);
    const [singleDate, setSingleDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [singleTime, setSingleTime] = useState("09:00");
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [singleIsPaid, setSingleIsPaid] = useState(false);
    const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethodValue>("NONE");
    const [singleQrProofUrl, setSingleQrProofUrl] = useState<string | null>(null);
    const [singleSessionSlots, setSingleSessionSlots] = useState<SingleSessionSlotState[]>([]);
    const [recurringStartDate, setRecurringStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [recurringWeeks, setRecurringWeeks] = useState("2");
    const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([createTemplate()]);
    const [sessionPayments, setSessionPayments] = useState<Record<string, SessionPaymentState>>({});

    useEffect(() => {
        if (!isOpen) return;

        setLoading(false);
        setError(null);
        setMode("single");
        setCustomerMode("guest");
        setCustomerQuery("");
        setCustomerResults([]);
        setSelectedCustomer(null);
        setUploadingSingleQr(false);
        setUploadingSessions({});
        setStaffId(fixedStaffId ? String(fixedStaffId) : "");
        setSingleServiceIds([]);
        setSingleDate(format(new Date(), "yyyy-MM-dd"));
        setSingleTime("09:00");
        setGuestName("");
        setGuestEmail("");
        setGuestPhone("");
        setNotes("");
        setSingleIsPaid(false);
        setSinglePaymentMethod("NONE");
        setSingleQrProofUrl(null);
        setSingleSessionSlots([]);
        setRecurringStartDate(format(new Date(), "yyyy-MM-dd"));
        setRecurringWeeks("2");
        setRecurringTemplates([createTemplate()]);
        setSessionPayments({});
    }, [fixedStaffId, isOpen]);

    useEffect(() => {
        if (!allowExistingCustomerSelection && customerMode !== "guest") {
            setCustomerMode("guest");
        }
    }, [allowExistingCustomerSelection, customerMode]);

    useEffect(() => {
        if (!isOpen || customerMode !== "existing") return;

        const timer = setTimeout(async () => {
            setLoadingCustomers(true);
            try {
                const rows = await getCustomers(customerQuery.trim() || undefined);
                setCustomerResults(rows);
            } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : t("adminCustomers.loadCustomersFailed"));
            } finally {
                setLoadingCustomers(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [customerMode, customerQuery, isOpen, t]);

    const eligibleStaffList = useMemo(
        () => staffList.filter((staff) => staff.is_bookable && (staff.services?.length ?? 0) > 0),
        [staffList],
    );

    const selectedStaff = useMemo(() => {
        if (!staffId) return null;
        return eligibleStaffList.find((staff) => String(staff.id) === staffId) || null;
    }, [eligibleStaffList, staffId]);

    const availableServices = useMemo(() => {
        if (!selectedStaff) return [];

        if (selectedStaff.services && selectedStaff.services.length > 0) {
            return serviceList.filter((service) =>
                selectedStaff.services?.includes(service.id) && service.is_active,
            );
        }

        return [];
    }, [selectedStaff, serviceList]);

    const servicesByCategory = useMemo(() => {
        const grouped = new Map<number, { category: ServiceCategory; services: ServiceItem[] }>();

        availableServices
            .slice()
            .sort((a, b) => a.position - b.position)
            .forEach((service) => {
                const existing = grouped.get(service.category_id);
                if (existing) {
                    existing.services.push(service);
                } else {
                    grouped.set(service.category_id, {
                        category: service.category,
                        services: [service],
                    });
                }
            });

        return Array.from(grouped.values()).sort((a, b) => a.category.position - b.category.position);
    }, [availableServices]);

    const serviceMap = useMemo(() => {
        const map = new Map<number, ServiceItem>();
        serviceList.forEach((service) => map.set(service.id, service));
        return map;
    }, [serviceList]);

    const singleSummary = useMemo(() => {
        const selected = singleServiceIds
            .map((serviceId) => serviceMap.get(Number(serviceId)))
            .filter((service): service is ServiceItem => Boolean(service));

        return {
            totalDuration: selected.reduce((sum, service) => sum + service.duration_minutes, 0),
            totalPrice: selected.reduce((sum, service) => sum + getServiceDisplayPriceCents(service), 0),
        };
    }, [serviceMap, singleServiceIds]);

    const singleSelectedServices = useMemo(
        () =>
            singleServiceIds
                .map((serviceId) => serviceMap.get(Number(serviceId)))
                .filter((service): service is ServiceItem => Boolean(service)),
        [serviceMap, singleServiceIds],
    );

    const singleMultiSessionService = useMemo(() => {
        if (singleSelectedServices.length !== 1) return null;
        const [service] = singleSelectedServices;
        return service.is_multi_session ? service : null;
    }, [singleSelectedServices]);

    const singleMultiSessionCount = Math.max(singleMultiSessionService?.session_count ?? 0, 0);
    const singleMultiSessionDuration = Math.max(
        singleMultiSessionService?.session_duration_minutes ?? 0,
        0,
    );

    useEffect(() => {
        if (!singleMultiSessionService || singleMultiSessionCount === 0) {
            setSingleSessionSlots([]);
            return;
        }

        setSingleSessionSlots((previous) =>
            Array.from({ length: singleMultiSessionCount }, (_, index) => ({
                date: previous[index]?.date ?? (index === 0 ? format(new Date(), "yyyy-MM-dd") : ""),
                time: previous[index]?.time ?? (index === 0 ? "09:00" : ""),
            })),
        );
    }, [singleMultiSessionCount, singleMultiSessionService]);

    const generatedSessions = useMemo(() => {
        const baseDate = new Date(`${recurringStartDate}T00:00:00`);
        const totalWeeks = Math.max(1, Number(recurringWeeks) || 1);

        if (Number.isNaN(baseDate.getTime())) return [];

        const endExclusive = addWeeks(baseDate, totalWeeks);
        const sessions: Array<{
            key: string;
            templateId: string;
            weekday: number;
            date: Date;
            startAt: string;
            serviceIds: number[];
            serviceNames: string[];
            totalDuration: number;
            totalPrice: number;
            payment: SessionPaymentState;
        }> = [];

        for (let cursor = baseDate; cursor < endExclusive; cursor = addDays(cursor, 1)) {
            recurringTemplates.forEach((template) => {
                if (cursor.getDay() !== Number(template.weekday)) return;
                const validServiceIds = template.serviceIds
                    .map((serviceId) => Number(serviceId))
                    .filter((serviceId) => serviceMap.has(serviceId));
                if (validServiceIds.length === 0) return;

                const startAt = `${format(cursor, "yyyy-MM-dd")}T${template.time}:00`;
                const payment = sessionPayments[`${template.id}-${format(cursor, "yyyy-MM-dd")}`] || {
                    isPaid: false,
                    paymentMethod: "NONE" as PaymentMethodValue,
                    qrProofUrl: null,
                };
                const services = validServiceIds
                    .map((serviceId) => serviceMap.get(serviceId))
                    .filter((service): service is ServiceItem => Boolean(service));

                sessions.push({
                    key: `${template.id}-${format(cursor, "yyyy-MM-dd")}`,
                    templateId: template.id,
                    weekday: Number(template.weekday),
                    date: new Date(cursor),
                    startAt,
                    serviceIds: validServiceIds,
                    serviceNames: services.map((service) => service.name),
                    totalDuration: services.reduce((sum, service) => sum + service.duration_minutes, 0),
                    totalPrice: services.reduce((sum, service) => sum + getServiceDisplayPriceCents(service), 0),
                    payment,
                });
            });
        }

        return sessions.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }, [recurringStartDate, recurringTemplates, recurringWeeks, serviceMap, sessionPayments]);

    const handleStaffChange = (value: string) => {
        setStaffId(value);
        setSingleServiceIds([]);
        setSingleSessionSlots([]);
        setRecurringTemplates((previous) =>
            previous.map((template) => ({ ...template, serviceIds: [] })),
        );
    };

    const toggleSingleService = (serviceId: string, checked: boolean) => {
        setSingleServiceIds((previous) => {
            const targetService = serviceMap.get(Number(serviceId));
            if (!targetService) return previous;

            if (!checked) {
                return previous.filter((id) => id !== serviceId);
            }

            if (targetService.is_multi_session) {
                return [serviceId];
            }

            const hasSelectedMultiSession = previous.some((id) => serviceMap.get(Number(id))?.is_multi_session);
            if (hasSelectedMultiSession) {
                return [serviceId];
            }

            if (previous.includes(serviceId)) {
                return previous;
            }

            return [...previous, serviceId];
        });
    };

    const updateSingleSessionSlot = (
        index: number,
        patch: Partial<SingleSessionSlotState>,
    ) => {
        setSingleSessionSlots((previous) =>
            previous.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)),
        );
    };

    const updateTemplate = (templateId: string, patch: Partial<RecurringTemplate>) => {
        setRecurringTemplates((previous) =>
            previous.map((template) => (template.id === templateId ? { ...template, ...patch } : template)),
        );
    };

    const toggleTemplateService = (templateId: string, serviceId: string, checked: boolean) => {
        setRecurringTemplates((previous) =>
            previous.map((template) => {
                if (template.id !== templateId) return template;
                return {
                    ...template,
                    serviceIds: checked
                        ? [...template.serviceIds, serviceId]
                        : template.serviceIds.filter((id) => id !== serviceId),
                };
            }),
        );
    };

    const addTemplate = () => {
        setRecurringTemplates((previous) => [...previous, createTemplate()]);
    };

    const removeTemplate = (templateId: string) => {
        setRecurringTemplates((previous) => previous.filter((template) => template.id !== templateId));
        setSessionPayments((previous) => {
            const next = { ...previous };
            Object.keys(next).forEach((key) => {
                if (key.startsWith(`${templateId}-`)) {
                    delete next[key];
                }
            });
            return next;
        });
    };

    const updateSessionPayment = (sessionKey: string, patch: Partial<SessionPaymentState>) => {
        setSessionPayments((previous) => {
            const current = previous[sessionKey] || {
                isPaid: false,
                paymentMethod: "NONE" as PaymentMethodValue,
                qrProofUrl: null,
            };
            return {
                ...previous,
                [sessionKey]: {
                    ...current,
                    ...patch,
                },
            };
        });
    };

    const handleSingleQrUpload = async (file: File | null) => {
        if (!file || !companyId) return;
        setUploadingSingleQr(true);
        setError(null);
        try {
            const url = await uploadAdminQrProof(file, companyId);
            setSingleQrProofUrl(url);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : t("adminBookings.qrUploadFailed"));
        } finally {
            setUploadingSingleQr(false);
        }
    };

    const handleSessionQrUpload = async (sessionKey: string, file: File | null) => {
        if (!file || !companyId) return;
        setUploadingSessions((previous) => ({ ...previous, [sessionKey]: true }));
        setError(null);
        try {
            const url = await uploadAdminQrProof(file, companyId);
            updateSessionPayment(sessionKey, { qrProofUrl: url });
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : t("adminBookings.qrUploadFailed"));
        } finally {
            setUploadingSessions((previous) => ({ ...previous, [sessionKey]: false }));
        }
    };

    const getCustomerPayload = () => {
        if (customerMode === "existing") {
            if (!selectedCustomer) {
                throw new Error(t("adminBookings.selectExistingCustomer"));
            }

            return {
                customer_id: selectedCustomer.userId ? selectedCustomer.id : undefined,
                customer: {
                    full_name: selectedCustomer.name,
                    email: selectedCustomer.email || undefined,
                    phone: combinePhone(selectedCustomer.phonePrefix, selectedCustomer.phone),
                },
            };
        }

        if (!guestName.trim()) {
            throw new Error(t("adminBookings.fullNameRequired"));
        }

        return {
            customer_id: undefined,
            customer: {
                full_name: guestName.trim(),
                email: guestEmail.trim() || undefined,
                phone: guestPhone.trim() || undefined,
            },
        };
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!staffId) {
                throw new Error(t("adminBookings.selectStaff"));
            }

            const customerPayload = getCustomerPayload();

            if (mode === "single") {
                if (singleServiceIds.length === 0) {
                    throw new Error(t("adminBookings.selectOneService"));
                }

                if (singleIsPaid && singlePaymentMethod === "NONE") {
                    throw new Error(t("adminBookings.selectPaymentMethod"));
                }

                if (singleIsPaid && singlePaymentMethod === "QR" && !singleQrProofUrl) {
                    throw new Error(t("adminBookings.singleQrProofRequired"));
                }

                if (singleMultiSessionService) {
                    if (singleSessionSlots.some((slot) => !slot.date || !slot.time)) {
                        throw new Error(t("adminBookings.multiSessionSlotMissing"));
                    }

                    const slotIntervals = singleSessionSlots.map((slot, index) => {
                        const startAt = buildLocalDateTime(slot.date, slot.time);
                        return {
                            index,
                            startAt,
                            endAt: new Date(startAt.getTime() + singleMultiSessionDuration * 60 * 1000),
                        };
                    });

                    const hasOverlap = slotIntervals.some((current) =>
                        slotIntervals.some((candidate) =>
                            candidate.index !== current.index &&
                            doIntervalsOverlap(
                                current.startAt,
                                current.endAt,
                                candidate.startAt,
                                candidate.endAt,
                            ),
                        ),
                    );

                    if (hasOverlap) {
                        throw new Error(t("adminBookings.multiSessionOverlap"));
                    }
                }

                const primaryStartAt = singleMultiSessionService
                    ? `${singleSessionSlots[0]!.date}T${singleSessionSlots[0]!.time}:00`
                    : `${singleDate}T${singleTime}:00`;

                await onCreate({
                    staff_id: Number(staffId),
                    service_ids: singleServiceIds.map((serviceId) => Number(serviceId)),
                    start_at: primaryStartAt,
                    session_slots: singleMultiSessionService
                        ? singleSessionSlots.map((slot) => ({
                            start_at: `${slot.date}T${slot.time}:00`,
                        }))
                        : undefined,
                    customer_id: customerPayload.customer_id,
                    customer: customerPayload.customer,
                    notes: notes.trim() || undefined,
                    is_paid: singleIsPaid,
                    payment_method: singleIsPaid ? singlePaymentMethod : "NONE",
                    qr_proof_image_url: singleIsPaid && singlePaymentMethod === "QR" ? singleQrProofUrl : null,
                });
            } else {
                if (generatedSessions.length === 0) {
                    throw new Error(t("adminBookings.recurringNoSessions"));
                }

                generatedSessions.forEach((session) => {
                    if (session.payment.isPaid && session.payment.paymentMethod === "NONE") {
                        throw new Error(t("adminBookings.selectPaymentMethod"));
                    }
                    if (session.payment.isPaid && session.payment.paymentMethod === "QR" && !session.payment.qrProofUrl) {
                        throw new Error(t("adminBookings.recurringQrProofRequired"));
                    }
                });

                await onCreateRecurring({
                    staff_id: Number(staffId),
                    customer_id: customerPayload.customer_id,
                    customer: customerPayload.customer,
                    notes: notes.trim() || undefined,
                    sessions: generatedSessions.map((session) => ({
                        service_ids: session.serviceIds,
                        start_at: session.startAt,
                        is_paid: session.payment.isPaid,
                        payment_method: session.payment.isPaid ? session.payment.paymentMethod : "NONE",
                        qr_proof_image_url:
                            session.payment.isPaid && session.payment.paymentMethod === "QR"
                                ? session.payment.qrProofUrl
                                : null,
                    })),
                });
            }

            onClose();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : t("adminBookings.createBookingFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>{t("adminBookings.newBooking")}</DialogTitle>
                        <DialogDescription>
                            {t("adminBookings.newBookingDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("adminBookings.bookingMode")}
                                </Label>
                                <Tabs value={mode} onValueChange={(value) => setMode(value as BookingMode)}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="single">{t("adminBookings.singleBooking")}</TabsTrigger>
                                        <TabsTrigger value="recurring">{t("adminBookings.recurringBooking")}</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <Label htmlFor="staff" className="mb-2 block text-sm font-semibold">
                                    {t("adminBookings.staffMember")}
                                </Label>
                                {fixedStaffId ? (
                                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                                        {selectedStaff?.display_name || t("adminBookings.selectStaff")}
                                    </div>
                                ) : (
                                    <Select value={staffId} onValueChange={handleStaffChange}>
                                        <SelectTrigger id="staff">
                                            <SelectValue placeholder={t("adminBookings.selectStaff")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {eligibleStaffList.map((staff) => (
                                                <SelectItem key={staff.id} value={String(staff.id)}>
                                                    {staff.display_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {selectedStaff
                                        ? t("adminBookings.servicesFilteredForStaff")
                                        : t("adminBookings.selectStaffToViewServices")}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("adminBookings.assignClient")}
                                </Label>
                                {allowExistingCustomerSelection ? (
                                    <Tabs value={customerMode} onValueChange={(value) => setCustomerMode(value as CustomerMode)}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="existing" className="gap-2">
                                                <Users className="h-4 w-4" />
                                                {t("adminBookings.existingClient")}
                                            </TabsTrigger>
                                            <TabsTrigger value="guest" className="gap-2">
                                                <UserRound className="h-4 w-4" />
                                                {t("adminBookings.manualClient")}
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                ) : null}

                                {customerMode === "existing" ? (
                                    <div className="mt-4 space-y-3">
                                        <Input
                                            value={customerQuery}
                                            onChange={(e) => setCustomerQuery(e.target.value)}
                                            placeholder={t("adminBookings.searchCustomer")}
                                        />
                                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                                            {loadingCustomers ? (
                                                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t("common.loading")}
                                                </div>
                                            ) : customerResults.length === 0 ? (
                                                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                    {t("adminBookings.noCustomersFound")}
                                                </p>
                                            ) : (
                                                customerResults.map((customer) => {
                                                    const isSelected = selectedCustomer?.customerKey === customer.customerKey;
                                                    const subtitle = customer.email || combinePhone(customer.phonePrefix, customer.phone) || customer.customerKey;
                                                    return (
                                                        <button
                                                            key={customer.customerKey}
                                                            type="button"
                                                            onClick={() => setSelectedCustomer(customer)}
                                                            className={`w-full rounded-md border px-3 py-2 text-left transition ${
                                                                isSelected
                                                                    ? "border-admin-brand bg-admin-brand-soft"
                                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                                            }`}
                                                        >
                                                            <div className="text-sm font-medium text-slate-900">{customer.name}</div>
                                                            <div className="text-xs text-muted-foreground">{subtitle}</div>
                                                            <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                                                                {customer.userId ? t("adminBookings.linkedCustomer") : t("adminBookings.guestHistoryCustomer")}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-name">{t("adminBookings.fullName")}</Label>
                                            <Input
                                                id="customer-name"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-email">{t("adminSettings.email")}</Label>
                                            <Input
                                                id="customer-email"
                                                type="email"
                                                value={guestEmail}
                                                onChange={(e) => setGuestEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customer-phone">{t("adminSettings.phone")}</Label>
                                            <Input
                                                id="customer-phone"
                                                value={guestPhone}
                                                onChange={(e) => setGuestPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-5">
                            {mode === "single" ? (
                                <>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">{t("shopBooking.services")}</h3>
                                                <p className="text-xs text-muted-foreground">{t("adminBookings.singleBookingServicesHelp")}</p>
                                                {singleMultiSessionService ? (
                                                    <p className="mt-1 text-xs text-amber-700">
                                                        {t("adminBookings.multiSessionExclusiveHelp")}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <ServiceChecklist
                                            t={t}
                                            currency={currency}
                                            servicesByCategory={servicesByCategory}
                                            selectedIds={singleServiceIds}
                                            onToggle={toggleSingleService}
                                            emptyMessage={t("adminBookings.noServicesForStaff")}
                                        />
                                    </div>

                                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),300px]">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <h3 className="mb-3 text-sm font-semibold text-slate-900">{t("adminBookings.schedule")}</h3>
                                            {singleMultiSessionService ? (
                                                <div className="space-y-4">
                                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                                        <p className="font-medium">{t("shopBooking.multiSessionService")}</p>
                                                        <p className="mt-1 text-xs text-amber-800">
                                                            {t("adminBookings.multiSessionServiceHelp", {
                                                                count: singleMultiSessionCount,
                                                                minutes: singleMultiSessionDuration,
                                                            })}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {singleSessionSlots.map((slot, index) => (
                                                            <div key={`${singleMultiSessionService.id}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                                <p className="mb-3 text-sm font-medium text-slate-900">
                                                                    {t("adminBookings.multiSessionSlotLabel", {
                                                                        current: index + 1,
                                                                        total: singleMultiSessionCount,
                                                                    })}
                                                                </p>
                                                                <div className="grid gap-4 sm:grid-cols-2">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`single-session-date-${index}`}>{t("adminBookings.date")}</Label>
                                                                        <Input
                                                                            id={`single-session-date-${index}`}
                                                                            type="date"
                                                                            value={slot.date}
                                                                            onChange={(e) => updateSingleSessionSlot(index, { date: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`single-session-time-${index}`}>{t("adminBookings.time")}</Label>
                                                                        <Input
                                                                            id={`single-session-time-${index}`}
                                                                            type="time"
                                                                            value={slot.time}
                                                                            onChange={(e) => updateSingleSessionSlot(index, { time: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="single-date">{t("adminBookings.date")}</Label>
                                                        <Input
                                                            id="single-date"
                                                            type="date"
                                                            value={singleDate}
                                                            onChange={(e) => setSingleDate(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="single-time">{t("adminBookings.time")}</Label>
                                                        <Input
                                                            id="single-time"
                                                            type="time"
                                                            value={singleTime}
                                                            onChange={(e) => setSingleTime(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                                                    <Checkbox
                                                        id="single-paid"
                                                        checked={singleIsPaid}
                                                        onCheckedChange={(checked) => {
                                                            const value = checked === true;
                                                            setSingleIsPaid(value);
                                                            if (!value) {
                                                                setSinglePaymentMethod("NONE");
                                                                setSingleQrProofUrl(null);
                                                            }
                                                        }}
                                                    />
                                                    <div className="space-y-1">
                                                        <Label htmlFor="single-paid" className="text-sm font-medium">
                                                            {t("adminBookings.markAsPaid")}
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("adminBookings.markAsPaidHelp")}
                                                        </p>
                                                    </div>
                                                </div>

                                                {singleIsPaid && (
                                                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                                                        <div className="space-y-2">
                                                            <Label>{t("adminBookings.paymentMethod")}</Label>
                                                            <Select
                                                                value={singlePaymentMethod}
                                                                onValueChange={(value) => {
                                                                    setSinglePaymentMethod(value as PaymentMethodValue);
                                                                    if (value !== "QR") {
                                                                        setSingleQrProofUrl(null);
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={t("adminBookings.selectPaymentMethod")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="CASH">{t("adminBookings.paymentCash")}</SelectItem>
                                                                    <SelectItem value="QR">{t("adminBookings.paymentQr")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {singlePaymentMethod === "QR" && (
                                                            <div className="space-y-2">
                                                                <Label>{t("adminBookings.qrProof")}</Label>
                                                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                                                        {uploadingSingleQr ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Upload className="h-4 w-4" />
                                                                        )}
                                                                        {t("adminBookings.uploadQrProof")}
                                                                        <input
                                                                            type="file"
                                                                            accept="image/png,image/jpeg,image/webp,application/pdf"
                                                                            className="hidden"
                                                                            onChange={(e) => void handleSingleQrUpload(e.target.files?.[0] || null)}
                                                                        />
                                                                    </label>
                                                                    {singleQrProofUrl && (
                                                                        <a
                                                                            href={getImageUrl(singleQrProofUrl) || singleQrProofUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="mt-3 block text-sm text-admin-brand underline"
                                                                        >
                                                                            {t("adminBookings.viewUploadedQrProof")}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <h3 className="text-sm font-semibold text-slate-900">{t("adminBookings.summary")}</h3>
                                            <div className="mt-4 space-y-3 text-sm text-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <span>{t("shopBooking.services")}</span>
                                                    <span>{singleServiceIds.length}</span>
                                                </div>
                                                {singleMultiSessionService ? (
                                                    <div className="flex items-center justify-between">
                                                        <span>{t("adminBookings.sessionCountLabel")}</span>
                                                        <span>{singleMultiSessionCount}</span>
                                                    </div>
                                                ) : null}
                                                {singleMultiSessionService ? (
                                                    <div className="flex items-center justify-between">
                                                        <span>{t("adminBookings.perSessionDuration")}</span>
                                                        <span>{singleMultiSessionDuration} min</span>
                                                    </div>
                                                ) : null}
                                                <div className="flex items-center justify-between">
                                                    <span>{t("adminBookings.totalDuration")}</span>
                                                    <span>{singleSummary.totalDuration} min</span>
                                                </div>
                                                <div className="flex items-center justify-between font-semibold text-slate-900">
                                                    <span>{t("adminBookings.totalPrice")}</span>
                                                    <span>{formatCurrencyFromCents(singleSummary.totalPrice, currency)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end">
                                            <div className="space-y-2">
                                                <Label htmlFor="recurring-start-date">{t("adminBookings.recurringStartDate")}</Label>
                                                <Input
                                                    id="recurring-start-date"
                                                    type="date"
                                                    value={recurringStartDate}
                                                    onChange={(e) => setRecurringStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="recurring-weeks">{t("adminBookings.numberOfWeeks")}</Label>
                                                <Input
                                                    id="recurring-weeks"
                                                    type="number"
                                                    min={1}
                                                    max={12}
                                                    value={recurringWeeks}
                                                    onChange={(e) => setRecurringWeeks(e.target.value)}
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground lg:pb-2">
                                                {t("adminBookings.recurringWindowHelp")}
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-4">
                                            {recurringTemplates.map((template, index) => (
                                                <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-slate-900">
                                                                {t("adminBookings.sessionTemplate")} {index + 1}
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground">
                                                                {t("adminBookings.sessionTemplateHelp")}
                                                            </p>
                                                        </div>
                                                        {recurringTemplates.length > 1 && (
                                                            <Button type="button" variant="outline" size="sm" onClick={() => removeTemplate(template.id)}>
                                                                {t("adminGroup.actions.remove")}
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <Label>{t("adminBookings.weekday")}</Label>
                                                            <Select
                                                                value={template.weekday}
                                                                onValueChange={(value) => updateTemplate(template.id, { weekday: value })}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {WEEKDAY_OPTIONS.map((option) => (
                                                                        <SelectItem key={option.value} value={option.value}>
                                                                            {getWeekdayLabel(t, Number(option.value))}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>{t("adminBookings.time")}</Label>
                                                            <Input
                                                                type="time"
                                                                value={template.time}
                                                                onChange={(e) => updateTemplate(template.id, { time: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <ServiceChecklist
                                                            t={t}
                                                            currency={currency}
                                                            servicesByCategory={servicesByCategory}
                                                            selectedIds={template.serviceIds}
                                                            onToggle={(serviceId, checked) => toggleTemplateService(template.id, serviceId, checked)}
                                                            emptyMessage={t("adminBookings.noServicesForStaff")}
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            <Button type="button" variant="outline" className="gap-2" onClick={addTemplate}>
                                                <Plus className="h-4 w-4" />
                                                {t("adminBookings.addRecurringSlot")}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                        <div className="mb-4">
                                            <h3 className="text-sm font-semibold text-slate-900">{t("adminBookings.generatedSessions")}</h3>
                                            <p className="text-xs text-muted-foreground">{t("adminBookings.generatedSessionsHelp")}</p>
                                        </div>

                                        {generatedSessions.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
                                                {t("adminBookings.recurringNoSessions")}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {generatedSessions.map((session) => (
                                                    <div key={session.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                            <div className="space-y-1">
                                                                <div className="text-sm font-semibold text-slate-900">
                                                                    {format(session.date, "PPP")} · {getWeekdayLabel(t, session.weekday)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {t("adminBookings.time")}: {format(new Date(session.startAt), "HH:mm")} · {session.totalDuration} min
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {session.serviceNames.join(", ")}
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-semibold text-slate-900">
                                                                {formatCurrencyFromCents(session.totalPrice, currency)}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                                                            <div className="flex items-start gap-3">
                                                                <Checkbox
                                                                    id={`paid-${session.key}`}
                                                                    checked={session.payment.isPaid}
                                                                    onCheckedChange={(checked) => {
                                                                        const value = checked === true;
                                                                        updateSessionPayment(session.key, {
                                                                            isPaid: value,
                                                                            paymentMethod: value ? session.payment.paymentMethod : "NONE",
                                                                            qrProofUrl: value ? session.payment.qrProofUrl : null,
                                                                        });
                                                                        if (!value) {
                                                                            updateSessionPayment(session.key, {
                                                                                paymentMethod: "NONE",
                                                                                qrProofUrl: null,
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                                <div>
                                                                    <Label htmlFor={`paid-${session.key}`} className="text-sm font-medium">
                                                                        {t("adminBookings.markSessionAsPaid")}
                                                                    </Label>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {t("adminBookings.sessionPaymentHelp")}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {session.payment.isPaid && (
                                                                <>
                                                                    <div className="space-y-2">
                                                                        <Label>{t("adminBookings.paymentMethod")}</Label>
                                                                        <Select
                                                                            value={session.payment.paymentMethod}
                                                                            onValueChange={(value) => {
                                                                                updateSessionPayment(session.key, {
                                                                                    paymentMethod: value as PaymentMethodValue,
                                                                                    qrProofUrl: value === "QR" ? session.payment.qrProofUrl : null,
                                                                                });
                                                                            }}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder={t("adminBookings.selectPaymentMethod")} />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="CASH">{t("adminBookings.paymentCash")}</SelectItem>
                                                                                <SelectItem value="QR">{t("adminBookings.paymentQr")}</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {session.payment.paymentMethod === "QR" && (
                                                                        <div className="space-y-2">
                                                                            <Label>{t("adminBookings.qrProof")}</Label>
                                                                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                                                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                                                                    {uploadingSessions[session.key] ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        <Upload className="h-4 w-4" />
                                                                                    )}
                                                                                    {t("adminBookings.uploadQrProof")}
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/png,image/jpeg,image/webp,application/pdf"
                                                                                        className="hidden"
                                                                                        onChange={(e) => void handleSessionQrUpload(session.key, e.target.files?.[0] || null)}
                                                                                    />
                                                                                </label>
                                                                                {session.payment.qrProofUrl && (
                                                                                    <a
                                                                                        href={getImageUrl(session.payment.qrProofUrl) || session.payment.qrProofUrl}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="mt-3 block text-sm text-admin-brand underline"
                                                                                    >
                                                                                        {t("adminBookings.viewUploadedQrProof")}
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <Label htmlFor="booking-notes" className="mb-2 block text-sm font-semibold">
                                    {t("adminBookings.notes")}
                                </Label>
                                <textarea
                                    id="booking-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="flex min-h-[92px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder={t("adminBookings.notesPlaceholder")}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={loading || uploadingSingleQr}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === "single" ? t("adminBookings.createBooking") : t("adminBookings.createRecurringBookings")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
