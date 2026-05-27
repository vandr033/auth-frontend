"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    CalendarClock,
    Eye,
    ImageIcon,
    Loader2,
    PencilLine,
    Plus,
    RefreshCcw,
    Send,
    Ticket,
    Trash2,
    Upload,
    UserPlus,
    Users,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    adminCreateGroupClassEnrollment,
    cancelGroupClassEnrollment,
    cancelGroupClassSession,
    confirmGroupClassEnrollment,
    confirmGroupClassEnrollmentPayment,
    issueGroupClassEnrollmentTicket,
    adminResendGroupTicket,
    generateGroupClassSessions,
    getAdminCompanyLocation,
    getCustomers,
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
    uploadAdminQrProof,
    uploadAdminImage,
    updateGroupEnrollmentInstallments,
    updateGroupClass,
    type CustomerRecord,
    type GroupAttendanceRow,
    type AdminCompanyLocation,
    type GroupClass,
    type GroupClassEnrollment,
    type GroupClassSession,
    type GroupEnrollmentInstallmentPlan,
    type GroupPaymentStatus,
    type GroupTicket,
    type StaffMember,
    type UpdateGroupEnrollmentInstallmentInput,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { AdminSectionCard } from "@/app/admin/dashboard/components/AdminSectionCard";
import { AdminStatCard } from "@/app/admin/dashboard/components/AdminStatCard";
import { GroupClassEditorForm } from "@/app/admin/dashboard/group-reservations/classes/components/GroupClassEditorForm";
import {
    type ClassFormState,
    getCompanyLocationLabel,
    getPricingModeLabelKey,
} from "@/app/admin/dashboard/group-reservations/classes/components/groupClassForm.shared";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { ProofAssetPreview } from "@/components/ui/proof-asset-preview";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { hasProductCapability } from "@/lib/product-access";
import { formatCurrencyInputFromCents, parseCurrencyInputToCents } from "@/lib/currency";
import { getImageUrl } from "@/utils/image-url";

import { useGroupReservationsAccess } from "../../lib/useGroupReservationsAccess";
import {
    GroupBookingStatusBadge,
    GroupPaymentStatusBadge,
    GroupStatusBadge,
    GroupTicketStatusBadge,
} from "../../components/GroupBadges";
import { formatDate, formatDateTime, formatMoneyFromCents } from "../../lib/format";

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
        capacity_visible: groupClass.capacity_visible ?? false,
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

type EditableInstallmentDraft = {
    id?: number;
    due_date: string;
    amount_input: string;
    payment_status: GroupPaymentStatus;
    payment_method: "NONE" | "CASH" | "QR";
};

function toDateInputValue(value?: string | null): string {
    return value ? value.slice(0, 10) : "";
}

function buildEditableInstallmentDrafts(
    plan: GroupEnrollmentInstallmentPlan,
): EditableInstallmentDraft[] {
    return plan.installments.map((installment) => ({
        id: installment.id,
        due_date: toDateInputValue(installment.due_date),
        amount_input: formatCurrencyInputFromCents(installment.amount_cents),
        payment_status: installment.payment_status,
        payment_method: installment.payment_method,
    }));
}

function addMonthToDateInput(value?: string | null): string {
    const base = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : new Date();
    base.setUTCMonth(base.getUTCMonth() + 1);
    return base.toISOString().slice(0, 10);
}

export default function GroupClassDetailPage() {
    const t = useT();
    const params = useParams<{ classId: string }>();
    const classIdRaw = typeof params?.classId === "string" ? params.classId : "";
    const classId = Number.parseInt(classIdRaw, 10);
    const { canUseAdvanced, canUseClasses, getRequiredPlan } = useGroupReservationsAccess();
    const { companyId, companyUser, user } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const capabilities = companyUser?.company?.capabilities;
    const hasClassesPro = Boolean(user?.is_super_admin) || hasProductCapability(capabilities, "CLASES_PRO");
    const hasMessagingPro = Boolean(user?.is_super_admin) || hasProductCapability(capabilities, "MENSAJERIA_PRO");
    const canViewCustomerProfiles = Boolean(user?.is_super_admin) || hasProductCapability(capabilities, "CRM_BASE");
    const canSendInstallmentReminders = hasClassesPro && hasMessagingPro;

    const [activeTab, setActiveTab] = useState("overview");
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
    const [form, setForm] = useState<ClassFormState | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);
    const [qrProofDialog, setQrProofDialog] = useState<string | null>(null);
    const [installmentPlanDialog, setInstallmentPlanDialog] = useState<GroupEnrollmentInstallmentPlan | null>(null);
    const [installmentPlanLoading, setInstallmentPlanLoading] = useState(false);
    const [installmentPlanSaving, setInstallmentPlanSaving] = useState(false);
    const [installmentActionKey, setInstallmentActionKey] = useState<string | null>(null);
    const [installmentEditMode, setInstallmentEditMode] = useState(false);
    const [installmentDrafts, setInstallmentDrafts] = useState<EditableInstallmentDraft[]>([]);

    // Add Member dialog
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [addMemberMode, setAddMemberMode] = useState<"existing" | "new">("existing");
    const [addMemberSearch, setAddMemberSearch] = useState("");
    const [addMemberCustomers, setAddMemberCustomers] = useState<CustomerRecord[]>([]);
    const [addMemberSearching, setAddMemberSearching] = useState(false);
    const [addMemberSelected, setAddMemberSelected] = useState<CustomerRecord | null>(null);
    const [addMemberNewName, setAddMemberNewName] = useState("");
    const [addMemberNewEmail, setAddMemberNewEmail] = useState("");
    const [addMemberNewPhone, setAddMemberNewPhone] = useState("");
    const [addMemberNewPhonePrefix, setAddMemberNewPhonePrefix] = useState("591");
    const [addMemberNewCountryCode, setAddMemberNewCountryCode] = useState("BO");
    const [addMemberPaymentMethod, setAddMemberPaymentMethod] = useState<"NONE" | "CASH" | "QR">("CASH");
    const [addMemberMarkAsPaid, setAddMemberMarkAsPaid] = useState(false);
    const [addMemberQrProofUrl, setAddMemberQrProofUrl] = useState<string | null>(null);
    const [addMemberUploadingQr, setAddMemberUploadingQr] = useState(false);
    const [addMemberBusy, setAddMemberBusy] = useState(false);

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
            setActiveTab("attendance");
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

    const assignedStaff = useMemo(() => {
        if (!groupClass?.staff_assignments) return [];
        return groupClass.staff_assignments.map((assignment) => {
            if (assignment.staff_profile_id) {
                const member = staff.find((staffMember) => staffMember.id === assignment.staff_profile_id);
                return {
                    key: `staff-${assignment.staff_profile_id}`,
                    name: member?.display_name || `#${assignment.staff_profile_id}`,
                    role: assignment.role,
                };
            }

            return {
                key: `manual-${assignment.display_name}-${assignment.display_phone}`,
                name: assignment.display_name || t("adminGroup.fields.name"),
                role: assignment.role,
            };
        });
    }, [groupClass?.staff_assignments, staff, t]);

    const attendanceSummary = useMemo(() => {
        const pendingQrCount = enrollments.filter((item) => item.payment_status === "PENDING_CONFIRMATION").length;
        return {
            sessions: sessions.length,
            enrollments: enrollments.length,
            activePasses: activePassHolders.length,
            pendingQrCount,
        };
    }, [activePassHolders.length, enrollments, sessions.length]);

    const handleSelectCoverImage = (file: File | null) => {
        setCoverImageFile(file);
        if (!file) {
            setCoverImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            setCoverImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        };
        reader.readAsDataURL(file);
    };

    const handleSelectThumbnailImage = (file: File | null) => {
        setThumbnailImageFile(file);
        if (!file) {
            setThumbnailImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            setThumbnailImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        };
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
                ...(coverImageFile ? {} : { cover_image_url: form.cover_image_url.trim() || null }),
                ...(thumbnailImageFile ? {} : { thumbnail_url: form.thumbnail_url.trim() || null }),
                pricing_mode: form.pricing_mode,
                price_cents: priceCents,
                max_capacity_per_session: maxCapacity,
                capacity_visible: form.capacity_visible,
                session_duration_minutes: duration,
                recurrence_type: form.recurrence_type,
                recurrence_config: recurrenceConfig,
                recurrence_start_date: form.recurrence_start_date,
                recurrence_end_date: form.recurrence_end_date.trim() || null,
                start_time: form.start_time,
                location_text: form.location_text.trim() || null,
                staff_assignments: [
                    ...form.linked_staff_ids.map((id) => ({
                        staff_profile_id: id,
                        role: "INSTRUCTOR" as const,
                    })),
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

    const refreshInstallmentPlanDialog = useCallback(async (
        enrollmentId: number,
        options?: { startEditing?: boolean },
    ) => {
        const plan = await listGroupEnrollmentInstallments(enrollmentId);
        setInstallmentPlanDialog(plan);
        setInstallmentDrafts(buildEditableInstallmentDrafts(plan));
        setInstallmentEditMode(options?.startEditing === true);
    }, []);

    const handleOpenInstallmentPlan = async (
        enrollmentId: number,
        options?: { startEditing?: boolean },
    ) => {
        setInstallmentPlanLoading(true);
        try {
            await refreshInstallmentPlanDialog(enrollmentId, options);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setInstallmentPlanLoading(false);
        }
    };

    const handleStartInstallmentEditing = () => {
        if (!installmentPlanDialog) return;
        setInstallmentDrafts(buildEditableInstallmentDrafts(installmentPlanDialog));
        setInstallmentEditMode(true);
    };

    const handleCancelInstallmentEditing = () => {
        if (installmentPlanDialog) {
            setInstallmentDrafts(buildEditableInstallmentDrafts(installmentPlanDialog));
        }
        setInstallmentEditMode(false);
    };

    const handleInstallmentDraftChange = (
        index: number,
        updater: (current: EditableInstallmentDraft) => EditableInstallmentDraft,
    ) => {
        setInstallmentDrafts((current) =>
            current.map((draft, draftIndex) => (draftIndex === index ? updater(draft) : draft)),
        );
    };

    const handleAddInstallmentDraft = () => {
        const lastDraft = installmentDrafts[installmentDrafts.length - 1];
        setInstallmentDrafts((current) => [
            ...current,
            {
                due_date: addMonthToDateInput(lastDraft?.due_date),
                amount_input: lastDraft?.amount_input || formatCurrencyInputFromCents(groupClass?.price_cents ?? 0),
                payment_status: "UNPAID",
                payment_method: "NONE",
            },
        ]);
    };

    const handleRemoveInstallmentDraft = (index: number) => {
        setInstallmentDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
    };

    const handleSaveInstallmentPlan = async () => {
        if (!installmentPlanDialog) return;

        const payload: UpdateGroupEnrollmentInstallmentInput[] = [];
        for (const [index, draft] of installmentDrafts.entries()) {
            if (!draft.due_date) {
                await notify.warning(
                    t("adminGroup.payments.installmentDueDateRequired", { number: index + 1 }),
                );
                return;
            }

            const amountCents = parseCurrencyInputToCents(draft.amount_input);
            if (amountCents === null) {
                await notify.warning(
                    t("adminGroup.payments.installmentAmountInvalid", { number: index + 1 }),
                );
                return;
            }

            if (
                (draft.payment_status === "PENDING_CONFIRMATION" || draft.payment_status === "REJECTED")
                && draft.payment_method !== "QR"
            ) {
                await notify.warning(
                    t("adminGroup.payments.installmentQrStatusRequiresQr", { number: index + 1 }),
                );
                return;
            }

            if (draft.payment_status === "PAID" && amountCents > 0 && draft.payment_method === "NONE") {
                await notify.warning(
                    t("adminGroup.payments.installmentPaidMethodRequired", { number: index + 1 }),
                );
                return;
            }

            payload.push({
                ...(draft.id ? { id: draft.id } : {}),
                due_date: draft.due_date,
                amount_cents: amountCents,
                payment_status: draft.payment_status,
                payment_method: draft.payment_method,
            });
        }

        setInstallmentPlanSaving(true);
        try {
            const updatedPlan = await updateGroupEnrollmentInstallments(installmentPlanDialog.enrollment.id, payload);
            setInstallmentPlanDialog(updatedPlan);
            setInstallmentDrafts(buildEditableInstallmentDrafts(updatedPlan));
            setInstallmentEditMode(false);
            await notify.success(t("adminGroup.payments.planUpdated"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.payments.planUpdateError"));
        } finally {
            setInstallmentPlanSaving(false);
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

    const resetAddMemberDialog = () => {
        setAddMemberOpen(false);
        setAddMemberMode("existing");
        setAddMemberSearch("");
        setAddMemberCustomers([]);
        setAddMemberSelected(null);
        setAddMemberNewName("");
        setAddMemberNewEmail("");
        setAddMemberNewPhone("");
        setAddMemberNewPhonePrefix("591");
        setAddMemberNewCountryCode("BO");
        setAddMemberPaymentMethod("CASH");
        setAddMemberMarkAsPaid(false);
        setAddMemberQrProofUrl(null);
        setAddMemberUploadingQr(false);
    };

    const handleAddMemberSearchChange = async (value: string) => {
        setAddMemberSearch(value);
        setAddMemberSelected(null);
        if (!value.trim()) {
            setAddMemberCustomers([]);
            return;
        }
        setAddMemberSearching(true);
        try {
            const results = await getCustomers(value.trim());
            setAddMemberCustomers(results.slice(0, 8));
        } catch {
            setAddMemberCustomers([]);
        } finally {
            setAddMemberSearching(false);
        }
    };

    const handleAddMemberQrUpload = async (file: File | null) => {
        if (!file || !companyId) return;
        setAddMemberUploadingQr(true);
        try {
            const url = await uploadAdminQrProof(file, companyId);
            setAddMemberQrProofUrl(url);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminBookings.qrUploadFailed"));
        } finally {
            setAddMemberUploadingQr(false);
        }
    };

    const handleAddMember = async () => {
        if (!groupClass) return;

        if (addMemberMode === "existing" && !addMemberSelected) return;
        if (addMemberMode === "new") {
            if (!addMemberNewName.trim() || (!addMemberNewEmail.trim() && !addMemberNewPhone.trim())) {
                await notify.warning(t("adminGroup.classes.newMemberRequired"));
                return;
            }
        }

        if (addMemberPaymentMethod === "QR" && !addMemberQrProofUrl) {
            await notify.warning(t("adminBookings.singleQrProofRequired"));
            return;
        }

        setAddMemberBusy(true);
        try {
            const createdEnrollment = await adminCreateGroupClassEnrollment(groupClass.id, {
                ...(addMemberMode === "existing"
                    ? { customer_id: addMemberSelected?.id }
                    : {
                        new_member: {
                            name: addMemberNewName.trim(),
                            email: addMemberNewEmail.trim() || undefined,
                            phone: addMemberNewPhone.trim() || undefined,
                            phone_prefix: addMemberNewPhonePrefix,
                            country_code: addMemberNewCountryCode,
                        },
                    }),
                payment_method: groupClass.price_cents === 0 ? "NONE" : addMemberPaymentMethod,
                mark_as_paid: addMemberMarkAsPaid,
                qr_proof_image_url: addMemberPaymentMethod === "QR" ? addMemberQrProofUrl : null,
            });
            await notify.success(t("adminGroup.classes.memberAdded"));
            resetAddMemberDialog();
            await loadData();
            if (createdEnrollment.pricing_mode === "FULL_COURSE") {
                await handleOpenInstallmentPlan(createdEnrollment.id, { startEditing: true });
            }
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        } finally {
            setAddMemberBusy(false);
        }
    };

    if (!canUseClasses) {
        const requiredPlan = getRequiredPlan("GROUP_CLASSES");
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                feature="GROUP_CLASSES"
                requiredPlan={requiredPlan}
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
                <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title={
                    <span className="flex flex-wrap items-center gap-2">
                        <span>{groupClass.title}</span>
                        <GroupStatusBadge status={groupClass.status} />
                    </span>
                }
                subtitle={groupClass.location_text || t(getPricingModeLabelKey(groupClass.pricing_mode))}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/group-reservations/classes">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t("adminGroup.actions.backToClasses")}
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={() => void loadData()}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {t("adminGroup.actions.refresh")}
                        </Button>
                        <Button onClick={() => void handleGenerateSessions()}>
                            {t("adminGroup.classes.generateSessions")}
                        </Button>
                    </>
                }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    label={t("adminGroup.fields.price")}
                    value={formatMoneyFromCents(groupClass.price_cents, currency)}
                    hint={t(getPricingModeLabelKey(groupClass.pricing_mode))}
                    icon={<Ticket className="h-5 w-5" />}
                    iconClassName="bg-blue-50 text-blue-700"
                />
                <AdminStatCard
                    label={t("adminGroup.fields.sessions")}
                    value={sessions.length}
                    hint={t("adminGroup.classes.upcomingSessions")}
                    icon={<CalendarClock className="h-5 w-5" />}
                    iconClassName="bg-amber-50 text-amber-700"
                />
                <AdminStatCard
                    label={t("adminGroup.fields.enrollments")}
                    value={enrollments.length}
                    hint={t("adminGroup.fields.activePassHolders")}
                    icon={<Users className="h-5 w-5" />}
                    iconClassName="bg-violet-50 text-violet-700"
                />
                <AdminStatCard
                    label={t("adminGroup.fields.activePassHolders")}
                    value={activePassHolders.length}
                    hint={t("adminGroup.fields.capacityPerSession")}
                    icon={<ImageIcon className="h-5 w-5" />}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-100 bg-white p-2">
                        <TabsTrigger value="overview" className="flex-none px-3">
                            {t("adminGroup.nav.overview")}
                        </TabsTrigger>
                        <TabsTrigger value="edit" className="flex-none px-3">
                            {t("adminGroup.classes.editClass")}
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="flex-none px-3">
                            {t("adminGroup.classes.sessionsTitle")}
                        </TabsTrigger>
                        <TabsTrigger value="enrollments" className="flex-none px-3">
                            {t("adminGroup.classes.enrollmentsTitle")}
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="flex-none px-3">
                            {t("adminGroup.attendance.sessionAttendance")}
                        </TabsTrigger>
                    </TabsList>
                </Card>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                        <AdminSectionCard
                            title={t("adminGroup.nav.overview")}
                            description={t(getPricingModeLabelKey(groupClass.pricing_mode))}
                        >
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.recurrenceStartDate")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                        {formatDate(groupClass.recurrence_start_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.recurrenceEndDate")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                        {formatDate(groupClass.recurrence_end_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.startTime")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">{groupClass.start_time}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.capacityPerSession")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                        {groupClass.max_capacity_per_session}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.durationMinutes")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                        {groupClass.session_duration_minutes}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("adminGroup.fields.location")}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                        {groupClass.location_text || "—"}
                                    </p>
                                </div>
                            </div>
                            {groupClass.description ? (
                                <div
                                    className="prose prose-sm mt-4 max-w-none text-slate-700"
                                    dangerouslySetInnerHTML={{ __html: groupClass.description }}
                                />
                            ) : null}
                        </AdminSectionCard>

                        <div className="space-y-4">
                            <AdminSectionCard title={t("adminGroup.staff.linkedStaff")}>
                                {assignedStaff.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t("adminGroup.staff.manualEmpty")}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {assignedStaff.map((entry) => (
                                            <span
                                                key={entry.key}
                                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                                            >
                                                {entry.name} · {entry.role}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </AdminSectionCard>

                            <AdminSectionCard title={t("adminGroup.fields.coverImageUrl")} contentClassName="space-y-3">
                                {(groupClass.cover_image_url || groupClass.thumbnail_url) ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {groupClass.cover_image_url ? (
                                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                                <img
                                                    src={getImageUrl(groupClass.cover_image_url) || undefined}
                                                    alt="Cover"
                                                    className="h-32 w-full object-cover"
                                                />
                                            </div>
                                        ) : null}
                                        {groupClass.thumbnail_url ? (
                                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                                <img
                                                    src={getImageUrl(groupClass.thumbnail_url) || undefined}
                                                    alt="Thumbnail"
                                                    className="h-32 w-full object-cover"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">—</p>
                                )}
                            </AdminSectionCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="edit" className="space-y-4">
                    <GroupClassEditorForm
                        form={form}
                        onFormChange={(updater) => setForm((prev) => (prev ? updater(prev) : prev))}
                        staff={staff}
                        currency={currency}
                        storeLocation={storeLocation}
                        storeLocationText={storeLocationText}
                        coverImagePreview={coverImagePreview}
                        thumbnailImagePreview={thumbnailImagePreview}
                        onSelectCoverImage={handleSelectCoverImage}
                        onSelectThumbnailImage={handleSelectThumbnailImage}
                        footer={
                            <>
                                <Button onClick={() => void handleSave()} disabled={saving} variant="outline">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t("adminGroup.actions.save")}
                                </Button>
                                <Button onClick={() => void handleSaveAndGenerateSessions()} disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t("adminGroup.classes.updateAndGenerateSessions")}
                                </Button>
                            </>
                        }
                    />
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <AdminSectionCard
                        title={t("adminGroup.classes.sessionsTitle")}
                        description={`${attendanceSummary.sessions} ${t("adminGroup.fields.sessions").toLowerCase()}`}
                    >
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
                                            <TableCell>
                                                {session.max_capacity ?? groupClass.max_capacity_per_session}
                                            </TableCell>
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
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        type="button"
                                                        onClick={() => void handleCancelSession(session.id)}
                                                    >
                                                        {t("adminGroup.actions.cancelSession")}
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </AdminSectionCard>
                </TabsContent>

                <TabsContent value="enrollments" className="space-y-4">
                    <AdminSectionCard
                        title={t("adminGroup.classes.enrollmentsTitle")}
                        description={`${attendanceSummary.enrollments} ${t("adminGroup.classes.enrollments").toLowerCase()}`}
                        actions={
                            <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                {t("adminGroup.classes.addMember")}
                            </Button>
                        }
                    >
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
                                        const phone = enrollment.user?.phoneNumber
                                            ? `${enrollment.user.phone_prefix ? `+${enrollment.user.phone_prefix} ` : ""}${enrollment.user.phoneNumber}`
                                            : null;
                                        return (
                                            <TableRow key={enrollment.id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-slate-900">
                                                            {enrollment.user?.name || enrollment.user?.email || enrollment.user_id}
                                                        </div>
                                                        {enrollment.user?.email ? (
                                                            <div className="text-xs text-slate-500">{enrollment.user.email}</div>
                                                        ) : null}
                                                        {phone ? (
                                                            <div className="text-xs text-slate-500">{phone}</div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <GroupBookingStatusBadge status={enrollment.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <GroupPaymentStatusBadge
                                                        status={enrollment.payment_status as GroupPaymentStatus}
                                                    />
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
                                                            <div className="text-xs text-slate-500">
                                                                {ticket.ticket_code}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">
                                                            {canUseAdvanced
                                                                ? t("adminGroup.ticket.none")
                                                                : t("adminGroup.ticket.proOnly")}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="flex flex-wrap gap-2">
                                                    {enrollment.status === "PENDING" ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                void handleEnrollmentAction(enrollment.id, "confirm")
                                                            }
                                                        >
                                                            {t("common.confirm")}
                                                        </Button>
                                                    ) : null}
                                                    {enrollment.status === "CONFIRMED" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                void handleEnrollmentAction(enrollment.id, "unconfirm")
                                                            }
                                                        >
                                                            {t("adminGroup.actions.unconfirm")}
                                                        </Button>
                                                    ) : null}
                                                    {enrollment.payment_status === "PENDING_CONFIRMATION" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleConfirmPayment(enrollment.id)}
                                                        >
                                                            {t("adminGroup.actions.confirmPayment")}
                                                        </Button>
                                                    ) : null}
                                                    {enrollment.pricing_mode === "FULL_COURSE" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleOpenInstallmentPlan(enrollment.id)}
                                                        >
                                                            {installmentPlanLoading &&
                                                            installmentPlanDialog?.enrollment.id === enrollment.id ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            {t("adminGroup.payments.viewPlan")}
                                                        </Button>
                                                    ) : null}
                                                    {canViewCustomerProfiles && enrollment.customer_key ? (
                                                        <Button size="sm" variant="outline" asChild>
                                                            <Link href={`/admin/dashboard/customers/${encodeURIComponent(enrollment.customer_key)}`}>
                                                                {t("adminCustomers.viewProfile")}
                                                            </Link>
                                                        </Button>
                                                    ) : null}
                                                    {canUseAdvanced &&
                                                    enrollment.status === "CONFIRMED" &&
                                                    (!ticket || ticket.status === "CANCELLED") ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleIssueTicket(enrollment.id)}
                                                        >
                                                            {t("adminGroup.ticket.issue")}
                                                        </Button>
                                                    ) : null}
                                                    {canUseAdvanced && ticket && ticket.status === "ACTIVE" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleResendTicket(ticket.ticket_code)}
                                                        >
                                                            {t("adminGroup.ticket.resend")}
                                                        </Button>
                                                    ) : null}
                                                    {enrollment.qr_proof_image_url ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setQrProofDialog(enrollment.qr_proof_image_url!)
                                                            }
                                                        >
                                                            <Eye className="mr-1 h-3 w-3" />
                                                            {t("adminGroup.actions.viewQrProof")}
                                                        </Button>
                                                    ) : null}
                                                    {enrollment.status !== "CANCELLED" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                void handleEnrollmentAction(enrollment.id, "cancel")
                                                            }
                                                        >
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
                    </AdminSectionCard>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                    <AdminSectionCard
                        title={t("adminGroup.attendance.sessionAttendance")}
                        description={
                            selectedSessionId
                                ? `${t("adminGroup.fields.session")} #${selectedSessionId}`
                                : undefined
                        }
                    >
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
                    </AdminSectionCard>
                </TabsContent>
            </Tabs>

            <Dialog
                open={!!installmentPlanDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setInstallmentPlanDialog(null);
                        setInstallmentDrafts([]);
                        setInstallmentEditMode(false);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.payments.viewPlan")}</DialogTitle>
                    </DialogHeader>
                    {installmentPlanDialog ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <p className="font-medium text-slate-900">
                                    {installmentPlanDialog.enrollment.user?.name ||
                                        installmentPlanDialog.enrollment.user?.email ||
                                        installmentPlanDialog.enrollment.user_id}
                                </p>
                                <p>
                                    {t("adminGroup.payments.planSummary", {
                                        paid: installmentPlanDialog.summary.paid_count,
                                        total: installmentPlanDialog.summary.total_installments,
                                    })}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                {installmentEditMode ? (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAddInstallmentDraft}
                                            disabled={installmentPlanSaving}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t("adminGroup.payments.addInstallment")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelInstallmentEditing}
                                            disabled={installmentPlanSaving}
                                        >
                                            {t("common.cancel")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => void handleSaveInstallmentPlan()}
                                            disabled={installmentPlanSaving}
                                        >
                                            {installmentPlanSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t("adminGroup.payments.savePlan")}
                                        </Button>
                                    </>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={handleStartInstallmentEditing}>
                                        <PencilLine className="mr-2 h-4 w-4" />
                                        {t("adminGroup.payments.editPlan")}
                                    </Button>
                                )}
                            </div>
                            {!canSendInstallmentReminders ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                    Los recordatorios automáticos de cuotas requieren Clases Pro y Mensajería Pro.
                                </div>
                            ) : null}
                            {installmentEditMode
                                ? installmentDrafts.map((draft, index) => (
                                    <div key={draft.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <p className="font-medium text-slate-900">
                                                {t("adminGroup.payments.installmentNumber", {
                                                    number: index + 1,
                                                })}
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveInstallmentDraft(index)}
                                                disabled={installmentPlanSaving || installmentDrafts.length <= 1}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t("adminGroup.payments.removeInstallment")}
                                            </Button>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-700">
                                                    {t("adminGroup.payments.installmentDueDate")}
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={draft.due_date}
                                                    onChange={(event) =>
                                                        handleInstallmentDraftChange(index, (current) => ({
                                                            ...current,
                                                            due_date: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-700">
                                                    {t("adminGroup.payments.installmentAmount")}
                                                </Label>
                                                <Input
                                                    type="text"
                                                    value={draft.amount_input}
                                                    onChange={(event) =>
                                                        handleInstallmentDraftChange(index, (current) => ({
                                                            ...current,
                                                            amount_input: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-700">
                                                    {t("adminGroup.payments.paymentStatus")}
                                                </Label>
                                                <Select
                                                    value={draft.payment_status}
                                                    onValueChange={(value) =>
                                                        handleInstallmentDraftChange(index, (current) => ({
                                                            ...current,
                                                            payment_status: value as GroupPaymentStatus,
                                                            payment_method:
                                                                value === "PENDING_CONFIRMATION" || value === "REJECTED"
                                                                    ? "QR"
                                                                    : value === "PAID" && current.payment_method === "NONE"
                                                                        ? "CASH"
                                                                        : current.payment_method,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UNPAID">{t("adminGroup.paymentStatus.unpaid")}</SelectItem>
                                                        <SelectItem value="PENDING_CONFIRMATION">{t("adminGroup.paymentStatus.pendingConfirmation")}</SelectItem>
                                                        <SelectItem value="PAID">{t("adminGroup.paymentStatus.paid")}</SelectItem>
                                                        <SelectItem value="REJECTED">{t("adminGroup.paymentStatus.rejected")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-700">
                                                    {t("adminBookings.paymentMethod")}
                                                </Label>
                                                <Select
                                                    value={draft.payment_method}
                                                    onValueChange={(value) =>
                                                        handleInstallmentDraftChange(index, (current) => ({
                                                            ...current,
                                                            payment_method: value as "NONE" | "CASH" | "QR",
                                                            payment_status:
                                                                value !== "QR"
                                                                && (current.payment_status === "PENDING_CONFIRMATION" || current.payment_status === "REJECTED")
                                                                    ? "UNPAID"
                                                                    : current.payment_status,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">{t("adminBookings.notSpecified")}</SelectItem>
                                                        <SelectItem value="CASH">{t("adminBookings.paymentCash")}</SelectItem>
                                                        <SelectItem value="QR">{t("adminBookings.paymentQr")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))
                                : installmentPlanDialog.installments.map((installment) => (
                                    <div key={installment.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {t("adminGroup.payments.installmentNumber", {
                                                        number: installment.installment_number,
                                                    })}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {t("adminGroup.payments.installmentMeta", {
                                                        due: formatDate(installment.due_date),
                                                        amount: formatMoneyFromCents(
                                                            installment.amount_cents,
                                                            currency,
                                                        ),
                                                    })}
                                                </p>
                                                {installment.last_reminder_at ? (
                                                    <p className="text-xs text-slate-500">
                                                        {t("adminGroup.payments.lastReminder")}:{" "}
                                                        {formatDateTime(installment.last_reminder_at)} ·{" "}
                                                        {installment.last_reminder_channel || ""}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <GroupPaymentStatusBadge status={installment.payment_status} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {installment.qr_proof_image_url ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setQrProofDialog(installment.qr_proof_image_url!)
                                                    }
                                                >
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    {t("adminGroup.actions.viewQrProof")}
                                                </Button>
                                            ) : null}
                                            {installment.payment_status === "PENDING_CONFIRMATION" ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        void handleInstallmentConfirmQr(
                                                            installmentPlanDialog.enrollment.id,
                                                            installment.id,
                                                        )
                                                    }
                                                    disabled={installmentActionKey === `confirm:${installment.id}`}
                                                >
                                                    {installmentActionKey === `confirm:${installment.id}` ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : null}
                                                    {t("adminGroup.payments.confirmQr")}
                                                </Button>
                                            ) : null}
                                            {installment.payment_status !== "PAID" ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        void handleInstallmentMarkCashPaid(
                                                            installmentPlanDialog.enrollment.id,
                                                            installment.id,
                                                        )
                                                    }
                                                    disabled={installmentActionKey === `cash:${installment.id}`}
                                                >
                                                    {installmentActionKey === `cash:${installment.id}` ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : null}
                                                    {t("adminGroup.payments.markCashPaid")}
                                                </Button>
                                            ) : null}
                                            {installment.payment_status !== "PAID" ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        void handleInstallmentReminder(
                                                            installmentPlanDialog.enrollment.id,
                                                            installment.id,
                                                        )
                                                    }
                                                    disabled={installmentActionKey === `reminder:${installment.id}` || !canSendInstallmentReminders}
                                                >
                                                    {installmentActionKey === `reminder:${installment.id}` ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Send className="mr-2 h-4 w-4" />
                                                    )}
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

            <Dialog
                open={!!qrProofDialog}
                onOpenChange={(open) => {
                    if (!open) setQrProofDialog(null);
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.actions.viewQrProof")}</DialogTitle>
                    </DialogHeader>
                    {qrProofDialog ? (
                        <ProofAssetPreview
                            alt="QR proof"
                            title={t("adminGroup.actions.viewQrProof")}
                            url={getImageUrl(qrProofDialog) || qrProofDialog}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog
                open={addMemberOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        resetAddMemberDialog();
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.classes.addMember")}</DialogTitle>
                        <DialogDescription>
                            {t("adminBookings.searchCustomer")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-1">
                        <Tabs value={addMemberMode} onValueChange={(value) => setAddMemberMode(value as "existing" | "new")}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="existing">{t("adminBookings.existingClient")}</TabsTrigger>
                                <TabsTrigger value="new">{t("adminGroup.classes.newMemberOption")}</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {addMemberMode === "existing" ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">
                                        {t("adminBookings.searchCustomer")}
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder={t("adminBookings.searchCustomer")}
                                        value={addMemberSearch}
                                        onChange={(e) => void handleAddMemberSearchChange(e.target.value)}
                                    />
                                </div>
                                {addMemberSearching ? (
                                    <p className="flex items-center gap-2 text-xs text-slate-500">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        {t("common.loading")}
                                    </p>
                                ) : addMemberCustomers.length > 0 ? (
                                    <div className="space-y-2">
                                        {addMemberCustomers.map((customer) => {
                                            const isSelected = addMemberSelected?.id === customer.id;
                                            const phone = customer.phone
                                                ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}`
                                                : null;

                                            return (
                                                <button
                                                    key={customer.id}
                                                    type="button"
                                                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                                                        isSelected
                                                            ? "border-admin-brand bg-admin-brand-soft/60 shadow-sm"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                    }`}
                                                    onClick={() => {
                                                        setAddMemberSelected(customer);
                                                        setAddMemberSearch(customer.name || customer.email || "");
                                                        setAddMemberCustomers([]);
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                                {customer.name || t("adminGroup.fields.name")}
                                                            </p>
                                                            {customer.email ? (
                                                                <p className="truncate text-xs text-slate-500">{customer.email}</p>
                                                            ) : null}
                                                            {phone ? (
                                                                <p className="truncate text-xs text-slate-500">{phone}</p>
                                                            ) : null}
                                                        </div>
                                                        {isSelected ? (
                                                            <span className="rounded-full bg-admin-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                                                                ✓
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : addMemberSearch.trim() && !addMemberSearching ? (
                                    <p className="text-xs text-slate-500">{t("adminBookings.noCustomersFound")}</p>
                                ) : (
                                    <p className="text-xs text-slate-500">{t("adminBookings.searchCustomer")}</p>
                                )}
                                {addMemberSelected ? (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                        <p className="font-semibold">✓ {addMemberSelected.name || addMemberSelected.email}</p>
                                        {addMemberSelected.email ? <p>{addMemberSelected.email}</p> : null}
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-medium text-slate-700">{t("adminGroup.fields.name")}</Label>
                                    <Input
                                        type="text"
                                        value={addMemberNewName}
                                        onChange={(e) => setAddMemberNewName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">{t("adminSettings.email")}</Label>
                                    <Input
                                        type="email"
                                        value={addMemberNewEmail}
                                        onChange={(e) => setAddMemberNewEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">{t("adminSettings.phone")}</Label>
                                    <PhoneInput
                                        phoneNumber={addMemberNewPhone}
                                        phonePrefix={addMemberNewPhonePrefix}
                                        countryCode={addMemberNewCountryCode}
                                        defaultCountry="BO"
                                        placeholder={t("common.phoneNumber")}
                                        onChange={(value) => {
                                            setAddMemberNewPhone(value.phoneNumber);
                                            setAddMemberNewPhonePrefix(value.phonePrefix);
                                            setAddMemberNewCountryCode(value.countryCode);
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {groupClass.price_cents > 0 ? (
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-700">
                                            {t("adminBookings.paymentMethod")}
                                        </Label>
                                        <Select
                                            value={addMemberPaymentMethod}
                                            onValueChange={(value) => setAddMemberPaymentMethod(value as "NONE" | "CASH" | "QR")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">{t("adminBookings.paymentCash")}</SelectItem>
                                                <SelectItem value="QR">{t("adminBookings.paymentQr")}</SelectItem>
                                                <SelectItem value="NONE">{t("adminBookings.notSpecified")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                        <Checkbox
                                            checked={addMemberMarkAsPaid}
                                            onCheckedChange={(checked) => setAddMemberMarkAsPaid(checked === true)}
                                        />
                                        {t("adminBookings.markAsPaid")}
                                    </label>
                                </div>

                                {addMemberPaymentMethod === "QR" ? (
                                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-medium text-slate-700">{t("adminBookings.uploadQrProof")}</p>
                                        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                            <Upload className="mr-2 h-4 w-4" />
                                            {addMemberUploadingQr ? t("common.loading") : t("adminBookings.uploadQrProof")}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                                className="hidden"
                                                onChange={(e) => void handleAddMemberQrUpload(e.target.files?.[0] ?? null)}
                                                disabled={addMemberUploadingQr}
                                            />
                                        </label>
                                        {addMemberQrProofUrl ? (
                                            <button
                                                type="button"
                                                className="text-xs font-medium text-admin-brand underline-offset-4 hover:underline"
                                                onClick={() => setQrProofDialog(addMemberQrProofUrl)}
                                            >
                                                {t("adminBookings.viewUploadedQrProof")}
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {groupClass.pricing_mode === "FULL_COURSE" ? (
                            <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                {t("adminGroup.classes.fullCourseInstallmentsNote")}
                            </p>
                        ) : null}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetAddMemberDialog()}
                                disabled={addMemberBusy}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => void handleAddMember()}
                                disabled={addMemberBusy || (addMemberMode === "existing" ? !addMemberSelected : false)}
                            >
                                {addMemberBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("adminGroup.classes.addMember")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
