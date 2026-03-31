"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GroupLocationPicker } from "@/components/maps/GroupLocationPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
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
    type GroupPricingMode,
    type GroupRecurrenceType,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { GroupStatusBadge } from "../components/GroupBadges";
import { formatMoneyFromCents } from "../lib/format";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";

type ManualStaff = {
    display_name: string;
    display_phone: string;
    role: GroupStaffRole;
};

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

function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

function defaultClassForm(defaultLocationText = ""): ClassFormState {
    const today = new Date();
    const day = today.toISOString().slice(0, 10);
    return {
        title: "",
        slug: "",
        description: "",
        cover_image_url: "",
        thumbnail_url: "",
        status: "DRAFT",
        pricing_mode: "PER_SESSION",
        price_cents: "0",
        max_capacity_per_session: "20",
        session_duration_minutes: "60",
        recurrence_type: "WEEKLY",
        recurrence_start_date: day,
        recurrence_end_date: "",
        start_time: "10:00",
        location_text: defaultLocationText,
        weekdays: [1, 3, 5],
        monthdays: "1,15",
        linked_staff_ids: [],
        manual_staff: [],
    };
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

    const toggleWeekday = (weekday: number) => {
        setForm((prev) => {
            const exists = prev.weekdays.includes(weekday);
            return {
                ...prev,
                weekdays: exists ? prev.weekdays.filter((day) => day !== weekday) : [...prev.weekdays, weekday],
            };
        });
    };

    const toggleLinkedStaff = (staffId: number) => {
        setForm((prev) => {
            const exists = prev.linked_staff_ids.includes(staffId);
            return {
                ...prev,
                linked_staff_ids: exists
                    ? prev.linked_staff_ids.filter((id) => id !== staffId)
                    : [...prev.linked_staff_ids, staffId],
            };
        });
    };

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

    const handleCreate = async () => {
        if (!form.title.trim()) {
            await notify.warning(t("adminGroup.forms.titleRequired"));
            return;
        }

        const maxCapacity = Number.parseInt(form.max_capacity_per_session, 10);
        const duration = Number.parseInt(form.session_duration_minutes, 10);
        const price = Number.parseInt(form.price_cents, 10);

        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }
        if (!Number.isFinite(duration) || duration < 5) {
            await notify.warning(t("adminGroup.forms.invalidDuration"));
            return;
        }
        if (!Number.isFinite(price) || price < 0) {
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
                price_cents: price,
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t("adminGroup.classes.title")}</h2>
                    <p className="text-sm text-slate-600">{t("adminGroup.classes.subtitle")}</p>
                </div>
                <div className="flex gap-2">
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
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.classes.totalClasses")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{summary.total}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.classes.publishedClasses")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{summary.published}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.classes.upcomingSessions")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{summary.upcomingSessions}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.classes.enrollments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{summary.enrollments}</CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">{t("adminGroup.classes.listTitle")}</CardTitle>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as GroupItemStatus | "ALL")}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("adminGroup.filters.allStatuses")}</SelectItem>
                            <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                            <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                            <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-brand" />
                        </div>
                    ) : classes.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.classes.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
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
                                {classes.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            <div>{item.title}</div>
                                            <div className="text-xs text-slate-500">{item.slug}</div>
                                        </TableCell>
                                        <TableCell>{item.pricing_mode}</TableCell>
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
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.classes.newClass")}</DialogTitle>
                        <DialogDescription>{t("adminGroup.classes.createDescription")}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t("adminGroup.fields.title")}</Label>
                            <Input
                                value={form.title}
                                onChange={(e) =>
                                    setForm((prev) => {
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
                                onChange={(e) => setForm((prev) => ({ ...prev, slug: normalizeSlugInput(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.status")}</Label>
                            <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as GroupItemStatus }))}>
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
                                onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
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
                            {coverImagePreview ? (
                                <div className="h-44 overflow-hidden rounded-md border border-slate-200 md:h-64">
                                    <img src={coverImagePreview} alt="Cover preview" className="h-full w-full object-cover" />
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
                            {thumbnailImagePreview ? (
                                <div className="h-44 overflow-hidden rounded-md border border-slate-200 md:h-64">
                                    <img src={thumbnailImagePreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                                </div>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.pricingMode")}</Label>
                            <Select
                                value={form.pricing_mode}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, pricing_mode: value as GroupPricingMode }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PER_SESSION">{t("adminGroup.pricing.perSession")}</SelectItem>
                                    <SelectItem value="WEEKLY_PASS">{t("adminGroup.pricing.weeklyPass")}</SelectItem>
                                    <SelectItem value="MONTHLY_PASS">{t("adminGroup.pricing.monthlyPass")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.priceCents", { currency: currency || "Bs." })}</Label>
                            <Input type="number" min={0} value={form.price_cents} onChange={(e) => setForm((prev) => ({ ...prev, price_cents: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.capacityPerSession")}</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.max_capacity_per_session}
                                onChange={(e) => setForm((prev) => ({ ...prev, max_capacity_per_session: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.durationMinutes")}</Label>
                            <Input
                                type="number"
                                min={5}
                                value={form.session_duration_minutes}
                                onChange={(e) => setForm((prev) => ({ ...prev, session_duration_minutes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceType")}</Label>
                            <Select
                                value={form.recurrence_type}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, recurrence_type: value as GroupRecurrenceType }))}
                            >
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
                            <Input type="time" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceStartDate")}</Label>
                            <Input
                                type="date"
                                value={form.recurrence_start_date}
                                onChange={(e) => setForm((prev) => ({ ...prev, recurrence_start_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceEndDate")}</Label>
                            <Input
                                type="date"
                                value={form.recurrence_end_date}
                                onChange={(e) => setForm((prev) => ({ ...prev, recurrence_end_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <GroupLocationPicker
                                label={t("adminGroup.fields.location")}
                                value={form.location_text}
                                onChange={(nextValue) => setForm((prev) => ({ ...prev, location_text: nextValue }))}
                                placeholder={storeLocationText || undefined}
                                defaultLatitude={storeLocation?.latitude ?? null}
                                defaultLongitude={storeLocation?.longitude ?? null}
                            />
                        </div>
                    </div>

                    {form.recurrence_type === "MONTHLY" ? (
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.monthdays")}</Label>
                            <Input
                                value={form.monthdays}
                                placeholder="1,15,28"
                                onChange={(e) => setForm((prev) => ({ ...prev, monthdays: e.target.value }))}
                            />
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
                                onClick={() => setForm((prev) => ({ ...prev, manual_staff: [...prev.manual_staff, { ...EMPTY_MANUAL_STAFF }] }))}
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
                                                setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, i) =>
                                                        i === index ? { ...item, display_name: e.target.value } : item,
                                                    ),
                                                }))
                                            }
                                        />
                                        <Input
                                            placeholder={t("adminGroup.fields.phone")}
                                            value={entry.display_phone}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, i) =>
                                                        i === index ? { ...item, display_phone: e.target.value } : item,
                                                    ),
                                                }))
                                            }
                                        />
                                        <Select
                                            value={entry.role}
                                            onValueChange={(value) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, i) =>
                                                        i === index ? { ...item, role: value as GroupStaffRole } : item,
                                                    ),
                                                }))
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
                                                setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.filter((_, i) => i !== index),
                                                }))
                                            }
                                        >
                                            {t("adminGroup.actions.remove")}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDialogOpen(false);
                                resetForm();
                            }}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={() => void handleCreate()} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("adminGroup.actions.create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
