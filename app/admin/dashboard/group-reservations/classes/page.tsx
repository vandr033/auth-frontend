"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Layers3,
    Loader2,
    Plus,
    RefreshCcw,
    Users,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    createGroupClass,
    getAdminCompanyLocation,
    getStaff,
    listGroupClasses,
    setGroupClassStatus,
    updateGroupClass,
    uploadAdminImage,
    type AdminCompanyLocation,
    type CreateGroupClassPayload,
    type GroupClass,
    type GroupItemStatus,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { AdminSectionCard } from "@/app/admin/dashboard/components/AdminSectionCard";
import { AdminStatCard } from "@/app/admin/dashboard/components/AdminStatCard";
import { GroupClassEditorForm } from "@/app/admin/dashboard/group-reservations/classes/components/GroupClassEditorForm";
import {
    type ClassFormState,
    defaultClassForm,
    getCompanyLocationLabel,
    getPricingModeLabelKey,
} from "@/app/admin/dashboard/group-reservations/classes/components/groupClassForm.shared";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { parseCurrencyInputToCents } from "@/lib/currency";

import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { GroupStatusBadge } from "../components/GroupBadges";
import { formatDate, formatMoneyFromCents } from "../lib/format";

function stripHtml(value: string | null | undefined): string {
    if (!value) return "";
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function GroupClassesPage() {
    const t = useT();
    const { companyId, companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const { canUseClasses } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [statusFilter, setStatusFilter] = useState<GroupItemStatus | "ALL">("ALL");
    const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
    const [form, setForm] = useState<ClassFormState>(defaultClassForm);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [classesData, staffData, companyLocation] = await Promise.all([
                listGroupClasses({
                    status: statusFilter === "ALL" ? undefined : statusFilter,
                }),
                getStaff(),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);
            setClasses(classesData);
            setStaff(staffData);
            setStoreLocation(companyLocation);
            const defaultLocationText = getCompanyLocationLabel(companyLocation);
            setStoreLocationText(defaultLocationText);
            setForm((prev) => {
                if (prev.location_text.trim().length > 0 || defaultLocationText.length === 0) {
                    return prev;
                }
                return { ...prev, location_text: defaultLocationText };
            });
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [companyId, statusFilter, t]);

    useEffect(() => {
        if (!canUseClasses) return;
        void loadData();
    }, [canUseClasses, loadData]);

    const summary = useMemo(
        () => ({
            total: classes.length,
            published: classes.filter((item) => item.status === "PUBLISHED").length,
            upcomingSessions: classes.reduce((sum, item) => sum + (item._count?.sessions ?? 0), 0),
            enrollments: classes.reduce((sum, item) => sum + (item._count?.enrollments ?? 0), 0),
        }),
        [classes],
    );

    const resetForm = () => {
        setForm(defaultClassForm(storeLocationText));
        setCoverImageFile(null);
        setThumbnailImageFile(null);
        setCoverImagePreview(null);
        setThumbnailImagePreview(null);
    };

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

    const handleCreate = async () => {
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
            recurrenceConfig = { monthdays };
            if (monthdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidMonthdays"));
                return;
            }
        } else {
            const weekdays = [...new Set(form.weekdays)].sort((a, b) => a - b);
            recurrenceConfig = { weekdays };
            if (weekdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidWeekdays"));
                return;
            }
        }

        setCreating(true);
        try {
            const payload: CreateGroupClassPayload = {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                cover_image_url: form.cover_image_url.trim() || null,
                thumbnail_url: form.thumbnail_url.trim() || null,
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
                    ...form.linked_staff_ids.map((id) => ({
                        staff_profile_id: id,
                        role: "INSTRUCTOR" as GroupStaffRole,
                    })),
                    ...form.manual_staff
                        .filter((entry) => entry.display_name.trim().length > 0)
                        .map((entry) => ({
                            display_name: entry.display_name.trim(),
                            display_phone: entry.display_phone.trim() || null,
                            role: entry.role,
                        })),
                ],
            };

            const created = await createGroupClass(payload);

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const imagePatch: { cover_image_url?: string | null; thumbnail_url?: string | null } = {};
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        imagePatch.cover_image_url = await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_class_cover",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload cover image");
                    }
                }

                if (thumbnailImageFile) {
                    try {
                        imagePatch.thumbnail_url = await uploadAdminImage({
                            file: thumbnailImageFile,
                            companyId,
                            type: "group_class_thumbnail",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (Object.keys(imagePatch).length > 0) {
                    await updateGroupClass(created.id, imagePatch);
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            if (form.status !== "DRAFT") {
                await setGroupClassStatus(created.id, form.status);
            }

            await notify.success(t("adminGroup.classes.created"));
            setDialogOpen(false);
            resetForm();
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.classes.createError"));
        } finally {
            setCreating(false);
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

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title={t("adminGroup.classes.title")}
                subtitle={t("adminGroup.classes.subtitle")}
                actions={
                    <>
                        <Button variant="outline" onClick={() => void loadData()}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {t("adminGroup.actions.refresh")}
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/group-reservations/classes/upcoming">
                                <CalendarClock className="mr-2 h-4 w-4" />
                                {t("adminGroup.classes.upcomingSessions")}
                            </Link>
                        </Button>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("adminGroup.classes.newClass")}
                        </Button>
                    </>
                }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    label={t("adminGroup.classes.totalClasses")}
                    value={summary.total}
                    icon={<Layers3 className="h-5 w-5" />}
                    iconClassName="bg-blue-50 text-blue-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.publishedClasses")}
                    value={summary.published}
                    hint={statusFilter === "ALL" ? undefined : t("adminGroup.filters.allStatuses")}
                    icon={<ChevronRight className="h-5 w-5" />}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.upcomingSessions")}
                    value={summary.upcomingSessions}
                    icon={<CalendarClock className="h-5 w-5" />}
                    iconClassName="bg-amber-50 text-amber-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.enrollments")}
                    value={summary.enrollments}
                    icon={<Users className="h-5 w-5" />}
                    iconClassName="bg-violet-50 text-violet-700"
                />
            </div>

            <AdminSectionCard
                title={t("adminGroup.classes.listTitle")}
                description={
                    loading ? undefined : `${classes.length} ${t("adminGroup.classes.title").toLowerCase()}`
                }
                actions={
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as GroupItemStatus | "ALL")}
                    >
                        <SelectTrigger className="w-[190px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("adminGroup.filters.allStatuses")}</SelectItem>
                            <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                            <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                            <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                        </SelectContent>
                    </Select>
                }
                contentClassName="p-0"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-7 w-7 animate-spin text-brand" />
                    </div>
                ) : classes.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.classes.empty")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>{t("adminGroup.fields.title")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.pricingMode")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.price")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.sessions")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.enrollments")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map((item) => {
                                    const isExpanded = expandedClassId === item.id;
                                    const description = stripHtml(item.description);
                                    return (
                                        <Fragment key={item.id}>
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() =>
                                                            setExpandedClassId((current) =>
                                                                current === item.id ? null : item.id,
                                                            )
                                                        }
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">
                                                    <div>{item.title}</div>
                                                    <div className="text-xs text-slate-500">{item.slug}</div>
                                                </TableCell>
                                                <TableCell>{t(getPricingModeLabelKey(item.pricing_mode))}</TableCell>
                                                <TableCell>{formatMoneyFromCents(item.price_cents, currency)}</TableCell>
                                                <TableCell>{item._count?.sessions ?? 0}</TableCell>
                                                <TableCell>{item._count?.enrollments ?? 0}</TableCell>
                                                <TableCell>
                                                    <GroupStatusBadge status={item.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/admin/dashboard/group-reservations/classes/${item.id}`}>
                                                            {t("adminGroup.actions.manage")}
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded ? (
                                                <TableRow className="bg-slate-50/80">
                                                    <TableCell colSpan={8}>
                                                        <div className="grid gap-4 px-1 py-2 md:grid-cols-2 xl:grid-cols-4">
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.location")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.location_text || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.startTime")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.start_time}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.recurrenceStartDate")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {formatDate(item.recurrence_start_date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.recurrenceEndDate")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {formatDate(item.recurrence_end_date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.durationMinutes")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.session_duration_minutes}
                                                                </p>
                                                            </div>
                                                            <div className="md:col-span-2 xl:col-span-3">
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.description")}
                                                                </p>
                                                                <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                                                                    {description || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </AdminSectionCard>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.classes.newClass")}</DialogTitle>
                        <DialogDescription>{t("adminGroup.classes.createDescription")}</DialogDescription>
                    </DialogHeader>

                    <GroupClassEditorForm
                        form={form}
                        onFormChange={(updater) => setForm(updater)}
                        staff={staff}
                        currency={currency}
                        storeLocation={storeLocation}
                        storeLocationText={storeLocationText}
                        coverImagePreview={coverImagePreview}
                        thumbnailImagePreview={thumbnailImagePreview}
                        onSelectCoverImage={handleSelectCoverImage}
                        onSelectThumbnailImage={handleSelectThumbnailImage}
                        sectionTitle={t("adminGroup.classes.newClass")}
                        footer={
                            <Button onClick={() => void handleCreate()} disabled={creating}>
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("adminGroup.actions.create")}
                            </Button>
                        }
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
