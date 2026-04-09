"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2, RefreshCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { GroupLocationPicker } from "@/components/maps/GroupLocationPicker";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useGroupReservationsAccess } from "../../lib/useGroupReservationsAccess";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import {
    cancelGroupClassEnrollment,
    cancelGroupClassSession,
    confirmGroupClassEnrollment,
    confirmGroupClassEnrollmentPayment,
    issueGroupClassEnrollmentTicket,
    adminResendGroupTicket,
    generateGroupClassSessions,
    getAdminCompanyLocation,
    getGroupClassById,
    getStaff,
    listGroupEnrollmentInstallments,
    listGroupClassEnrollments,
    listGroupClassSessionAttendance,
    listGroupClassSessions,
    listGroupTickets,
    markGroupEnrollmentInstallmentPaid,
    sendGroupInstallmentReminder,
    confirmGroupEnrollmentInstallmentQr,
    setGroupClassStatus,
    unconfirmGroupClassEnrollment,
    uploadAdminImage,
    updateGroupClass,
    type GroupAttendanceRow,
    type AdminCompanyLocation,
    type GroupClass,
    type GroupClassEnrollment,
    type GroupClassSession,
    type GroupEnrollmentInstallmentPlan,
    type GroupItemStatus,
    type GroupPricingMode,
    type GroupRecurrenceType,
    type GroupStaffRole,
    type GroupTicket,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { GroupBookingStatusBadge, GroupPaymentStatusBadge, GroupStatusBadge, GroupTicketStatusBadge } from "../../components/GroupBadges";
import { formatDate, formatDateTime, formatMoneyFromCents } from "../../lib/format";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { getImageUrl } from "@/utils/image-url";
import { formatCurrencyInputFromCents, parseCurrencyInputToCents } from "@/lib/currency";

type ManualStaff = {
    display_name: string;
    display_phone: string;
    role: GroupStaffRole;
};

type ClassFormState = {
    title: string;
    slug: string;
    description: string;
    cover_image_url: string;
    thumbnail_url: string;
    status: GroupItemStatus;
    pricing_mode: GroupPricingMode;
    price_cents: string;
    max_capacity_per_session: string;
    session_duration_minutes: string;
    recurrence_type: GroupRecurrenceType;
    recurrence_start_date: string;
    recurrence_end_date: string;
    start_time: string;
    location_text: string;
    weekdays: number[];
    monthdays: string;
    linked_staff_ids: number[];
    manual_staff: ManualStaff[];
};

const GROUP_MEDIA_RECOMMENDED_SIZE = "1920px x 1080px";

const WEEKDAYS = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
];

const EMPTY_MANUAL_STAFF: ManualStaff = {
    display_name: "",
    display_phone: "",
    role: "INSTRUCTOR",
};

function normalizeSlugInput(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .slice(0, 255);
}

function slugifyInput(value: string): string {
    return normalizeSlugInput(value).replace(/-+$/g, "");
}

function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

function fromGroupClass(groupClass: GroupClass): ClassFormState {
    const recurrenceConfig = groupClass.recurrence_config || {};
    const weekdays = Array.isArray((recurrenceConfig as { weekdays?: unknown }).weekdays)
        ? ((recurrenceConfig as { weekdays?: unknown }).weekdays as unknown[])
            .map((value) => Number.parseInt(String(value), 10))
            .filter((value) => Number.isFinite(value))
        : [];
    const monthdays = Array.isArray((recurrenceConfig as { monthdays?: unknown }).monthdays)
        ? ((recurrenceConfig as { monthdays?: unknown }).monthdays as unknown[])
            .map((value) => String(value))
            .join(",")
        : "";
    const linkedStaffIds = (groupClass.staff_assignments ?? [])
        .filter((item) => item.staff_profile_id !== null)
        .map((item) => item.staff_profile_id as number);
    const manualStaff = (groupClass.staff_assignments ?? [])
        .filter((item) => item.staff_profile_id === null)
        .map((item) => ({
            display_name: item.display_name ?? "",
            display_phone: item.display_phone ?? "",
            role: item.role ?? "INSTRUCTOR",
        }));

    return {
        title: groupClass.title,
        slug: groupClass.slug,
        description: groupClass.description ?? "",
        cover_image_url: groupClass.cover_image_url ?? "",
        thumbnail_url: groupClass.thumbnail_url ?? "",
        status: groupClass.status,
        pricing_mode: groupClass.pricing_mode,
        price_cents: formatCurrencyInputFromCents(groupClass.price_cents),
        max_capacity_per_session: String(groupClass.max_capacity_per_session),
        session_duration_minutes: String(groupClass.session_duration_minutes),
        recurrence_type: groupClass.recurrence_type,
        recurrence_start_date: groupClass.recurrence_start_date.slice(0, 10),
        recurrence_end_date: groupClass.recurrence_end_date ? groupClass.recurrence_end_date.slice(0, 10) : "",
        start_time: groupClass.start_time,
        location_text: groupClass.location_text ?? "",
        weekdays,
        monthdays,
        linked_staff_ids: linkedStaffIds,
        manual_staff: manualStaff,
    };
}

export default function GroupClassDetailPage() {
    const t = useT();
    const params = useParams<{ classId: string }>();
    const classIdRaw = typeof params?.classId === "string" ? params.classId : "";
    const classId = Number.parseInt(classIdRaw, 10);
    const { canUseAdvanced, canUseClasses } = useGroupReservationsAccess();
    const { companyId, companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groupClass, setGroupClass] = useState<GroupClass | null>(null);
    const [sessions, setSessions] = useState<GroupClassSession[]>([]);
    const [enrollments, setEnrollments] = useState<GroupClassEnrollment[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [tickets, setTickets] = useState<GroupTicket[]>([]);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [sessionAttendance, setSessionAttendance] = useState<GroupAttendanceRow[]>([]);
    const attendanceSectionRef = useRef<HTMLDivElement | null>(null);
    const [form, setForm] = useState<ClassFormState | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);
    const [qrProofDialog, setQrProofDialog] = useState<string | null>(null);
    const [installmentPlanDialog, setInstallmentPlanDialog] = useState<GroupEnrollmentInstallmentPlan | null>(null);
    const [installmentPlanLoading, setInstallmentPlanLoading] = useState(false);
    const [installmentActionKey, setInstallmentActionKey] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!Number.isInteger(classId) || classId <= 0) return;

        setLoading(true);
        try {
            const [
                classData,
                sessionsData,
                enrollmentsData,
                staffData,
                ticketsData,
                companyLocation,
            ] = await Promise.all([
                getGroupClassById(classId),
                listGroupClassSessions(classId, { include_cancelled: true }),
                listGroupClassEnrollments(classId),
                getStaff(),
                canUseAdvanced ? listGroupTickets() : Promise.resolve([] as GroupTicket[]),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);

            setGroupClass(classData);
            setStoreLocation(companyLocation);
            const defaultLocationText = getCompanyLocationLabel(companyLocation);
            setStoreLocationText(defaultLocationText);
            const mapped = fromGroupClass(classData);
            setForm({
                ...mapped,
                location_text: mapped.location_text.trim() || defaultLocationText,
            });
            setSessions(sessionsData);
            setEnrollments(enrollmentsData);
            setStaff(staffData);
            setTickets(ticketsData);
            setCoverImageFile(null);
            setThumbnailImageFile(null);
            setCoverImagePreview(null);
            setThumbnailImagePreview(null);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [canUseAdvanced, classId, companyId, t]);

    const loadSessionAttendance = useCallback(async (sessionId: number) => {
        try {
            const data = await listGroupClassSessionAttendance(sessionId);
            setSelectedSessionId(sessionId);
            setSessionAttendance(data);
            requestAnimationFrame(() => {
                const section = attendanceSectionRef.current;
                if (!section) return;
                section.scrollIntoView({ behavior: "smooth", block: "start" });
                if (typeof window !== "undefined") {
                    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#session-attendance`);
                }
            });
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        }
    }, [t]);

    useEffect(() => {
        if (!canUseClasses) return;
        void loadData();
    }, [canUseClasses, loadData]);

    const ticketByEnrollmentId = useMemo(() => {
        const map = new Map<number, GroupTicket>();
        tickets.forEach((ticket) => {
            if (ticket.group_class_enrollment_id) {
                map.set(ticket.group_class_enrollment_id, ticket);
            }
        });
        return map;
    }, [tickets]);

    const activePassHolders = useMemo(() => {
        const now = Date.now();
        return enrollments.filter((enrollment) =>
            enrollment.status === "CONFIRMED" && new Date(enrollment.valid_until).getTime() >= now,
        );
    }, [enrollments]);

    const toggleWeekday = (weekday: number) => {
        if (!form) return;
        const exists = form.weekdays.includes(weekday);
        setForm({
            ...form,
            weekdays: exists ? form.weekdays.filter((day) => day !== weekday) : [...form.weekdays, weekday],
        });
    };

    const toggleLinkedStaff = (staffId: number) => {
        if (!form) return;
        const exists = form.linked_staff_ids.includes(staffId);
        setForm({
            ...form,
            linked_staff_ids: exists ? form.linked_staff_ids.filter((id) => id !== staffId) : [...form.linked_staff_ids, staffId],
        });
    };

    const handleSelectCoverImage = (file: File | null) => {
        setCoverImageFile(file);
        if (!file) {
            setCoverImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => setCoverImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        reader.readAsDataURL(file);
    };

    const handleSelectThumbnailImage = (file: File | null) => {
        setThumbnailImageFile(file);
        if (!file) {
            setThumbnailImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => setThumbnailImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!groupClass || !form) return;
        if (!form.title.trim()) {
            await notify.warning(t("adminGroup.forms.titleRequired"));
            return;
        }

        const maxCapacity = Number.parseInt(form.max_capacity_per_session, 10);
        const duration = Number.parseInt(form.session_duration_minutes, 10);
        const priceCents = parseCurrencyInputToCents(form.price_cents);

        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }
        if (!Number.isFinite(duration) || duration < 5) {
            await notify.warning(t("adminGroup.forms.invalidDuration"));
            return;
        }
        if (priceCents === null) {
            await notify.warning(t("adminGroup.forms.invalidPrice"));
            return;
        }

        let recurrenceConfig: Record<string, unknown> = {};
        if (form.recurrence_type === "MONTHLY") {
            const monthdays = form.monthdays
                .split(",")
                .map((part) => Number.parseInt(part.trim(), 10))
                .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31);
            if (monthdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidMonthdays"));
                return;
            }
            recurrenceConfig = { monthdays };
        } else {
            const weekdays = [...new Set(form.weekdays)].sort((a, b) => a - b);
            if (weekdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidWeekdays"));
                return;
            }
            recurrenceConfig = { weekdays };
        }

        setSaving(true);
        try {
            await updateGroupClass(groupClass.id, {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                // Skip image fields that will be updated by uploadAdminImage to avoid a
                // temporary null write that could cause the public page to show the wrong image.
                ...(coverImageFile ? {} : { cover_image_url: form.cover_image_url.trim() || null }),
                ...(thumbnailImageFile ? {} : { thumbnail_url: form.thumbnail_url.trim() || null }),
                pricing_mode: form.pricing_mode,
                price_cents: priceCents,
                max_capacity_per_session: maxCapacity,
                session_duration_minutes: duration,
                recurrence_type: form.recurrence_type,
                recurrence_config: recurrenceConfig,
                recurrence_start_date: form.recurrence_start_date,
                recurrence_end_date: form.recurrence_end_date.trim() || null,
                start_time: form.start_time,
                location_text: form.location_text.trim() || null,
                staff_assignments: [
                    ...form.linked_staff_ids.map((id) => ({ staff_profile_id: id, role: "INSTRUCTOR" as GroupStaffRole })),
                    ...form.manual_staff
                        .filter((entry) => entry.display_name.trim().length > 0)
                        .map((entry) => ({
                            display_name: entry.display_name.trim(),
                            display_phone: entry.display_phone.trim() || null,
                            role: entry.role,
                        })),
                ],
            });

            if (form.status !== groupClass.status) {
                await setGroupClassStatus(groupClass.id, form.status);
            }

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_class_cover",
                            entityId: groupClass.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload cover image");
                    }
                }

                if (thumbnailImageFile) {
                    try {
                        await uploadAdminImage({
                            file: thumbnailImageFile,
                            companyId,
                            type: "group_class_thumbnail",
                            entityId: groupClass.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            await notify.success(t("adminGroup.classes.updated"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.classes.updateError"));
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateSessions = async () => {
        if (!groupClass) return;
        try {
            const created = await generateGroupClassSessions(groupClass.id);
            await notify.success(t("adminGroup.classes.sessionsGenerated", { count: created }));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.classes.generateError"));
        }
    };

    const handleSaveAndGenerateSessions = async () => {
        await handleSave();
        await handleGenerateSessions();
    };

    const handleCancelSession = async (sessionId: number) => {
        try {
            await cancelGroupClassSession(sessionId);
            await notify.success(t("adminGroup.classes.sessionCancelled"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.classes.cancelSessionError"));
        }
    };

    const handleEnrollmentAction = async (enrollmentId: number, action: "confirm" | "unconfirm" | "cancel") => {
        try {
            if (action === "confirm") await confirmGroupClassEnrollment(enrollmentId);
            if (action === "unconfirm") await unconfirmGroupClassEnrollment(enrollmentId);
            if (action === "cancel") await cancelGroupClassEnrollment(enrollmentId);
            await notify.success(t("adminGroup.bookings.actionSuccess"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        }
    };

    const handleConfirmPayment = async (enrollmentId: number) => {
        try {
            await confirmGroupClassEnrollmentPayment(enrollmentId);
            await notify.success(t("adminGroup.bookings.paymentConfirmed"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        }
    };

    const refreshInstallmentPlanDialog = useCallback(async (enrollmentId: number) => {
        const plan = await listGroupEnrollmentInstallments(enrollmentId);
        setInstallmentPlanDialog(plan);
    }, []);

    const handleOpenInstallmentPlan = async (enrollmentId: number) => {
        setInstallmentPlanLoading(true);
        try {
            await refreshInstallmentPlanDialog(enrollmentId);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setInstallmentPlanLoading(false);
        }
    };

    const handleInstallmentReminder = async (enrollmentId: number, installmentId: number) => {
        setInstallmentActionKey(`reminder:${installmentId}`);
        try {
            await sendGroupInstallmentReminder(installmentId);
            await notify.success(t("adminGroup.payments.reminderSent"));
            await refreshInstallmentPlanDialog(enrollmentId);
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.payments.reminderError"));
        } finally {
            setInstallmentActionKey(null);
        }
    };

    const handleInstallmentMarkCashPaid = async (enrollmentId: number, installmentId: number) => {
        setInstallmentActionKey(`cash:${installmentId}`);
        try {
            await markGroupEnrollmentInstallmentPaid(enrollmentId, installmentId, "CASH");
            await notify.success(t("adminGroup.payments.installmentMarkedPaid"));
            await refreshInstallmentPlanDialog(enrollmentId);
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        } finally {
            setInstallmentActionKey(null);
        }
    };

    const handleInstallmentConfirmQr = async (enrollmentId: number, installmentId: number) => {
        setInstallmentActionKey(`confirm:${installmentId}`);
        try {
            await confirmGroupEnrollmentInstallmentQr(enrollmentId, installmentId);
            await notify.success(t("adminGroup.payments.installmentConfirmed"));
            await refreshInstallmentPlanDialog(enrollmentId);
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        } finally {
            setInstallmentActionKey(null);
        }
    };

    const handleIssueTicket = async (enrollmentId: number) => {
        try {
            await issueGroupClassEnrollmentTicket(enrollmentId);
            await notify.success(t("adminGroup.ticket.issued"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        }
    };

    const handleResendTicket = async (ticketCode: string) => {
        try {
            await adminResendGroupTicket(ticketCode);
            await notify.success(t("adminGroup.ticket.resent"));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        }
    };

    if (!canUseClasses) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnPro")}
                feature="GROUP_CLASSES"
                requiredPlan="PRO"
                fullPage
            />
        );
    }

    if (!Number.isInteger(classId) || classId <= 0) {
        return <p className="text-sm text-rose-600">{t("adminGroup.classes.invalidClassId")}</p>;
    }

    if (loading || !groupClass || !form) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button asChild variant="outline">
                    <Link href="/admin/dashboard/group-reservations/classes">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.backToClasses")}
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadData()}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.refresh")}
                    </Button>
                    <Button onClick={() => void handleGenerateSessions()}>
                        {t("adminGroup.classes.generateSessions")}
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {groupClass.title}
                        <GroupStatusBadge status={groupClass.status} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.pricingMode")}</p>
                        <p className="text-sm text-slate-900">
                            {t(`adminGroup.pricing.${groupClass.pricing_mode === "PER_SESSION" ? "perSession" : groupClass.pricing_mode === "WEEKLY_PASS" ? "weeklyPass" : groupClass.pricing_mode === "MONTHLY_PASS" ? "monthlyPass" : "fullCourse"}`)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.price")}</p>
                        <p className="text-sm text-slate-900">{formatMoneyFromCents(groupClass.price_cents, currency)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.capacityPerSession")}</p>
                        <p className="text-sm text-slate-900">{groupClass.max_capacity_per_session}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.durationMinutes")}</p>
                        <p className="text-sm text-slate-900">{groupClass.session_duration_minutes}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.recurrenceStartDate")}</p>
                        <p className="text-sm text-slate-900">{formatDate(groupClass.recurrence_start_date)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.recurrenceEndDate")}</p>
                        <p className="text-sm text-slate-900">{formatDate(groupClass.recurrence_end_date)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.activePassHolders")}</p>
                        <p className="text-sm text-slate-900">{activePassHolders.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.sessions")}</p>
                        <p className="text-sm text-slate-900">{sessions.length}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.classes.editClass")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t("adminGroup.fields.title")}</Label>
                            <Input
                                value={form.title}
                                onChange={(e) =>
                                    setForm((prev) => {
                                        if (!prev) return prev;
                                        const nextTitle = e.target.value;
                                        const prevAutoSlug = slugifyInput(prev.title);
                                        const shouldSyncSlug = prev.slug.trim().length === 0 || prev.slug.trim() === prevAutoSlug;
                                        return {
                                            ...prev,
                                            title: nextTitle,
                                            slug: shouldSyncSlug ? slugifyInput(nextTitle) : prev.slug,
                                        };
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.slug")}</Label>
                            <Input
                                value={form.slug}
                                onChange={(e) =>
                                    setForm((prev) => prev ? { ...prev, slug: normalizeSlugInput(e.target.value) } : prev)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.status")}</Label>
                            <Select value={form.status} onValueChange={(value) => setForm((prev) => prev ? { ...prev, status: value as GroupItemStatus } : prev)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                                    <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                                    <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t("adminGroup.fields.description")}</Label>
                            <RichTextEditor
                                value={form.description}
                                onChange={(html) => setForm((prev) => prev ? { ...prev, description: html } : prev)}
                                placeholder="<p><strong>Descripcion en HTML</strong></p>"
                                minHeightClassName="min-h-[120px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.coverImageUrl")}</Label>
                            <p className="text-xs text-slate-500">{t("adminGroup.fields.recommendedSize", { size: GROUP_MEDIA_RECOMMENDED_SIZE })}</p>
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => handleSelectCoverImage(event.target.files?.[0] ?? null)}
                            />
                            {(coverImagePreview || form.cover_image_url) ? (
                                <div className="h-44 overflow-hidden rounded-md border border-slate-200 md:h-64">
                                    <img
                                        src={coverImagePreview || getImageUrl(form.cover_image_url) || undefined}
                                        alt="Cover preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.thumbnailUrl")}</Label>
                            <p className="text-xs text-slate-500">{t("adminGroup.fields.recommendedSize", { size: GROUP_MEDIA_RECOMMENDED_SIZE })}</p>
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => handleSelectThumbnailImage(event.target.files?.[0] ?? null)}
                            />
                            {(thumbnailImagePreview || form.thumbnail_url) ? (
                                <div className="h-44 overflow-hidden rounded-md border border-slate-200 md:h-64">
                                    <img
                                        src={thumbnailImagePreview || getImageUrl(form.thumbnail_url) || undefined}
                                        alt="Thumbnail preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.pricingMode")}</Label>
                            <Select value={form.pricing_mode} onValueChange={(value) => setForm((prev) => prev ? { ...prev, pricing_mode: value as GroupPricingMode } : prev)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PER_SESSION">{t("adminGroup.pricing.perSession")}</SelectItem>
                                    <SelectItem value="WEEKLY_PASS">{t("adminGroup.pricing.weeklyPass")}</SelectItem>
                                    <SelectItem value="MONTHLY_PASS">{t("adminGroup.pricing.monthlyPass")}</SelectItem>
                                    <SelectItem value="FULL_COURSE">{t("adminGroup.pricing.fullCourse")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.priceCents", { currency: currency || "Bs." })}</Label>
                            <Input type="number" min={0} step="0.01" value={form.price_cents} onChange={(e) => setForm((prev) => prev ? { ...prev, price_cents: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.capacityPerSession")}</Label>
                            <Input type="number" min={1} value={form.max_capacity_per_session} onChange={(e) => setForm((prev) => prev ? { ...prev, max_capacity_per_session: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.durationMinutes")}</Label>
                            <Input type="number" min={5} value={form.session_duration_minutes} onChange={(e) => setForm((prev) => prev ? { ...prev, session_duration_minutes: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceType")}</Label>
                            <Select value={form.recurrence_type} onValueChange={(value) => setForm((prev) => prev ? { ...prev, recurrence_type: value as GroupRecurrenceType } : prev)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WEEKLY">{t("adminGroup.recurrence.weekly")}</SelectItem>
                                    <SelectItem value="MONTHLY">{t("adminGroup.recurrence.monthly")}</SelectItem>
                                    <SelectItem value="CUSTOM">{t("adminGroup.recurrence.custom")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.startTime")}</Label>
                            <Input type="time" value={form.start_time} onChange={(e) => setForm((prev) => prev ? { ...prev, start_time: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceStartDate")}</Label>
                            <Input type="date" value={form.recurrence_start_date} onChange={(e) => setForm((prev) => prev ? { ...prev, recurrence_start_date: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceEndDate")}</Label>
                            <Input type="date" value={form.recurrence_end_date} onChange={(e) => setForm((prev) => prev ? { ...prev, recurrence_end_date: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <GroupLocationPicker
                                label={t("adminGroup.fields.location")}
                                value={form.location_text}
                                onChange={(nextValue) => setForm((prev) => prev ? { ...prev, location_text: nextValue } : prev)}
                                placeholder={storeLocationText || undefined}
                                defaultLatitude={storeLocation?.latitude ?? null}
                                defaultLongitude={storeLocation?.longitude ?? null}
                            />
                        </div>
                    </div>

                    {form.recurrence_type === "MONTHLY" ? (
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.monthdays")}</Label>
                            <Input value={form.monthdays} onChange={(e) => setForm((prev) => prev ? { ...prev, monthdays: e.target.value } : prev)} />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.weekdays")}</Label>
                            <div className="grid gap-2 md:grid-cols-4">
                                {WEEKDAYS.map((day) => (
                                    <label key={day.value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.weekdays.includes(day.value)}
                                            onChange={() => toggleWeekday(day.value)}
                                        />
                                        {day.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm">{t("adminGroup.staff.linkedStaff")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 md:grid-cols-2">
                            {staff
                                .filter((member) => member.is_bookable)
                                .map((member) => (
                                    <label key={member.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.linked_staff_ids.includes(member.id)}
                                            onChange={() => toggleLinkedStaff(member.id)}
                                        />
                                        {member.display_name}
                                    </label>
                                ))}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-sm">{t("adminGroup.staff.manualDisplay")}</CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setForm((prev) =>
                                        prev ? { ...prev, manual_staff: [...prev.manual_staff, { ...EMPTY_MANUAL_STAFF }] } : prev,
                                    )
                                }
                            >
                                {t("adminGroup.actions.add")}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {form.manual_staff.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.staff.manualEmpty")}</p>
                            ) : (
                                form.manual_staff.map((entry, index) => (
                                    <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-4">
                                        <Input
                                            placeholder={t("adminGroup.fields.name")}
                                            value={entry.display_name}
                                            onChange={(e) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            manual_staff: prev.manual_staff.map((item, i) =>
                                                                i === index ? { ...item, display_name: e.target.value } : item,
                                                            ),
                                                        }
                                                        : prev,
                                                )
                                            }
                                        />
                                        <Input
                                            placeholder={t("adminGroup.fields.phone")}
                                            value={entry.display_phone}
                                            onChange={(e) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            manual_staff: prev.manual_staff.map((item, i) =>
                                                                i === index ? { ...item, display_phone: e.target.value } : item,
                                                            ),
                                                        }
                                                        : prev,
                                                )
                                            }
                                        />
                                        <Select
                                            value={entry.role}
                                            onValueChange={(value) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            manual_staff: prev.manual_staff.map((item, i) =>
                                                                i === index ? { ...item, role: value as GroupStaffRole } : item,
                                                            ),
                                                        }
                                                        : prev,
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INSTRUCTOR">{t("adminGroup.staff.instructor")}</SelectItem>
                                                <SelectItem value="ASSISTANT">{t("adminGroup.staff.assistant")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            manual_staff: prev.manual_staff.filter((_, i) => i !== index),
                                                        }
                                                        : prev,
                                                )
                                            }
                                        >
                                            {t("adminGroup.actions.remove")}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button onClick={() => void handleSave()} disabled={saving} variant="outline">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("adminGroup.actions.save")}
                        </Button>
                        <Button onClick={() => void handleSaveAndGenerateSessions()} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("adminGroup.classes.updateAndGenerateSessions")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.classes.sessionsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminGroup.classes.noSessions")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.startAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.endAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.capacity")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.occupancy")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>{formatDateTime(session.start_at)}</TableCell>
                                        <TableCell>{formatDateTime(session.end_at)}</TableCell>
                                        <TableCell>{session.max_capacity ?? groupClass.max_capacity_per_session}</TableCell>
                                        <TableCell>{session.booked_count ?? 0}</TableCell>
                                        <TableCell>
                                            <GroupStatusBadge status={session.status} />
                                        </TableCell>
                                        <TableCell className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                type="button"
                                                onClick={() => void loadSessionAttendance(session.id)}
                                            >
                                                {t("adminGroup.actions.viewAttendance")}
                                            </Button>
                                            {!session.cancelled_at ? (
                                                <Button size="sm" variant="outline" type="button" onClick={() => void handleCancelSession(session.id)}>
                                                    {t("adminGroup.actions.cancelSession")}
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.classes.enrollmentsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {enrollments.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminGroup.classes.noEnrollments")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.payment")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.validity")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.ticket")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.map((enrollment) => {
                                    const ticket = ticketByEnrollmentId.get(enrollment.id);
                                    return (
                                        <TableRow key={enrollment.id}>
                                            <TableCell>{enrollment.user?.name || enrollment.user?.email || enrollment.user_id}</TableCell>
                                            <TableCell>
                                                <GroupBookingStatusBadge status={enrollment.status} />
                                            </TableCell>
                                            <TableCell>
                                                <GroupPaymentStatusBadge status={enrollment.payment_status} />
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {formatDateTime(enrollment.valid_from)}
                                                <br />
                                                {formatDateTime(enrollment.valid_until)}
                                            </TableCell>
                                            <TableCell>
                                                {canUseAdvanced && ticket ? (
                                                    <div className="space-y-1">
                                                        <GroupTicketStatusBadge status={ticket.status} />
                                                        <div className="text-xs text-slate-500">{ticket.ticket_code}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">
                                                        {canUseAdvanced ? t("adminGroup.ticket.none") : t("adminGroup.ticket.proOnly")}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="flex flex-wrap gap-2">
                                                {enrollment.status === "PENDING" ? (
                                                    <Button size="sm" onClick={() => void handleEnrollmentAction(enrollment.id, "confirm")}>
                                                        {t("common.confirm")}
                                                    </Button>
                                                ) : null}
                                                {enrollment.status === "CONFIRMED" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleEnrollmentAction(enrollment.id, "unconfirm")}>
                                                        {t("adminGroup.actions.unconfirm")}
                                                    </Button>
                                                ) : null}
                                                {enrollment.payment_status === "PENDING_CONFIRMATION" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleConfirmPayment(enrollment.id)}>
                                                        {t("adminGroup.actions.confirmPayment")}
                                                    </Button>
                                                ) : null}
                                                {enrollment.pricing_mode === "FULL_COURSE" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleOpenInstallmentPlan(enrollment.id)}>
                                                        {installmentPlanLoading && installmentPlanDialog?.enrollment.id === enrollment.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : null}
                                                        {t("adminGroup.payments.viewPlan")}
                                                    </Button>
                                                ) : null}
                                                {canUseAdvanced && enrollment.status === "CONFIRMED" && (!ticket || ticket.status === "CANCELLED") ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleIssueTicket(enrollment.id)}>
                                                        {t("adminGroup.ticket.issue")}
                                                    </Button>
                                                ) : null}
                                                {canUseAdvanced && ticket && ticket.status === "ACTIVE" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleResendTicket(ticket.ticket_code)}>
                                                        {t("adminGroup.ticket.resend")}
                                                    </Button>
                                                ) : null}
                                                {enrollment.qr_proof_image_url ? (
                                                    <Button size="sm" variant="outline" onClick={() => setQrProofDialog(enrollment.qr_proof_image_url!)}>
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        {t("adminGroup.actions.viewQrProof")}
                                                    </Button>
                                                ) : null}
                                                {enrollment.status !== "CANCELLED" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleEnrollmentAction(enrollment.id, "cancel")}>
                                                        {t("common.cancel")}
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div id="session-attendance" ref={attendanceSectionRef} className="scroll-mt-24">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t("adminGroup.attendance.sessionAttendance")}
                            {selectedSessionId ? ` #${selectedSessionId}` : ""}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedSessionId ? (
                            <p className="text-sm text-slate-500">{t("adminGroup.attendance.selectSession")}</p>
                        ) : sessionAttendance.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminGroup.attendance.empty")}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.checkedInAt")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.method")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessionAttendance.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.user?.name || row.user?.email || row.user_id}</TableCell>
                                            <TableCell>{formatDateTime(row.checked_in_at)}</TableCell>
                                            <TableCell>{row.checked_in_method || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!installmentPlanDialog} onOpenChange={(open) => { if (!open) setInstallmentPlanDialog(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.payments.viewPlan")}</DialogTitle>
                    </DialogHeader>
                    {installmentPlanDialog ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <p className="font-medium text-slate-900">{installmentPlanDialog.enrollment.user?.name || installmentPlanDialog.enrollment.user?.email || installmentPlanDialog.enrollment.user_id}</p>
                                <p>{t("adminGroup.payments.planSummary", {
                                    paid: installmentPlanDialog.summary.paid_count,
                                    total: installmentPlanDialog.summary.total_installments,
                                })}</p>
                            </div>
                            {installmentPlanDialog.installments.map((installment) => (
                                <div key={installment.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {t("adminGroup.payments.installmentNumber", { number: installment.installment_number })}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {t("adminGroup.payments.installmentMeta", {
                                                    due: formatDate(installment.due_date),
                                                    amount: formatMoneyFromCents(installment.amount_cents, currency),
                                                })}
                                            </p>
                                            {installment.last_reminder_at ? (
                                                <p className="text-xs text-slate-500">
                                                    {t("adminGroup.payments.lastReminder")}: {formatDateTime(installment.last_reminder_at)} · {installment.last_reminder_channel || ""}
                                                </p>
                                            ) : null}
                                        </div>
                                        <GroupPaymentStatusBadge status={installment.payment_status} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {installment.qr_proof_image_url ? (
                                            <Button size="sm" variant="outline" onClick={() => setQrProofDialog(installment.qr_proof_image_url!)}>
                                                <Eye className="mr-1 h-3 w-3" />
                                                {t("adminGroup.actions.viewQrProof")}
                                            </Button>
                                        ) : null}
                                        {installment.payment_status === "PENDING_CONFIRMATION" ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleInstallmentConfirmQr(installmentPlanDialog.enrollment.id, installment.id)}
                                                disabled={installmentActionKey === `confirm:${installment.id}`}
                                            >
                                                {installmentActionKey === `confirm:${installment.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("adminGroup.payments.confirmQr")}
                                            </Button>
                                        ) : null}
                                        {installment.payment_status !== "PAID" ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleInstallmentMarkCashPaid(installmentPlanDialog.enrollment.id, installment.id)}
                                                disabled={installmentActionKey === `cash:${installment.id}`}
                                            >
                                                {installmentActionKey === `cash:${installment.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("adminGroup.payments.markCashPaid")}
                                            </Button>
                                        ) : null}
                                        {installment.payment_status !== "PAID" ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleInstallmentReminder(installmentPlanDialog.enrollment.id, installment.id)}
                                                disabled={installmentActionKey === `reminder:${installment.id}`}
                                            >
                                                {installmentActionKey === `reminder:${installment.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                {t("adminGroup.payments.sendReminder")}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={!!qrProofDialog} onOpenChange={(open) => { if (!open) setQrProofDialog(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.actions.viewQrProof")}</DialogTitle>
                    </DialogHeader>
                    {qrProofDialog ? (
                        <div className="flex flex-col items-center gap-3 py-2">
                            <img
                                src={getImageUrl(qrProofDialog) || qrProofDialog}
                                alt="QR proof"
                                className="max-h-80 w-full rounded-lg border border-slate-200 object-contain"
                            />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
