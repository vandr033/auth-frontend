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
import { Switch } from "@/components/ui/switch";
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
    createGroupEvent,
    getAdminCompanyLocation,
    getGroupBookingFlowSettings,
    getStaff,
    listGroupEvents,
    setGroupEventStatus,
    updateGroupEvent,
    uploadAdminImage,
    type AdminCompanyLocation,
    type CreateGroupEventPayload,
    type GroupBookingFlowSettings,
    type GroupEvent,
    type GroupItemStatus,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { GroupStatusBadge } from "../components/GroupBadges";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { formatDateTime, formatMoneyFromCents } from "../lib/format";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { parseCurrencyInputToCents } from "@/lib/currency";

type ManualStaff = {
    display_name: string;
    display_phone: string;
    role: GroupStaffRole;
};

type EventFormState = {
    title: string;
    slug: string;
    description: string;
    no_availability_message: string;
    cover_image_url: string;
    thumbnail_url: string;
    is_free: boolean;
    price_cents: string;
    max_capacity: string;
    capacity_visible: boolean;
    start_at: string;
    end_at: string;
    location_text: string;
    status: GroupItemStatus;
    linked_staff_ids: number[];
    manual_staff: ManualStaff[];
};

const GROUP_MEDIA_RECOMMENDED_SIZE = "1920px x 1080px";

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

function toLocalInputValue(date: Date): string {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 16);
}

function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

function createDefaultForm(defaultLocationText = ""): EventFormState {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
        title: "",
        slug: "",
        description: "",
        no_availability_message: "",
        cover_image_url: "",
        thumbnail_url: "",
        is_free: true,
        price_cents: "0",
        max_capacity: "20",
        capacity_visible: false,
        start_at: toLocalInputValue(start),
        end_at: toLocalInputValue(end),
        location_text: defaultLocationText,
        status: "DRAFT",
        linked_staff_ids: [],
        manual_staff: [],
    };
}

export default function GroupEventsAdminPage() {
    const t = useT();
    const { companyId, companyUser } = useAdminAuth();
    const { canUseAdvanced, canUseEvents } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [settings, setSettings] = useState<GroupBookingFlowSettings | null>(null);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [statusFilter, setStatusFilter] = useState<GroupItemStatus | "ALL">("ALL");
    const [upcomingOnly, setUpcomingOnly] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<EventFormState>(createDefaultForm);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventsData, staffData, settingsData, companyLocation] = await Promise.all([
                listGroupEvents({
                    status: statusFilter === "ALL" ? undefined : statusFilter,
                    upcoming: upcomingOnly || undefined,
                }),
                getStaff(),
                getGroupBookingFlowSettings(),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);
            setEvents(eventsData);
            setStaff(staffData);
            setSettings(settingsData);
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
    }, [companyId, statusFilter, t, upcomingOnly]);

    useEffect(() => {
        if (!canUseEvents) return;
        void loadData();
    }, [canUseEvents, loadData]);

    const resetForm = () => {
        setForm(createDefaultForm(storeLocationText));
        setCoverImageFile(null);
        setThumbnailImageFile(null);
        setCoverImagePreview(null);
        setThumbnailImagePreview(null);
    };

    const capacitySummary = useMemo(() => {
        const totalCapacity = events.reduce((sum, event) => sum + event.max_capacity, 0);
        const booked = events.reduce((sum, event) => sum + (event._count?.bookings ?? 0), 0);
        return { totalCapacity, booked };
    }, [events]);

    const handleCreate = async () => {
        if (!form.title.trim()) {
            await notify.warning(t("adminGroup.forms.titleRequired"));
            return;
        }

        const startAt = new Date(form.start_at);
        const endAt = new Date(form.end_at);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
            await notify.warning(t("adminGroup.forms.invalidDateRange"));
            return;
        }

        const maxCapacity = Number.parseInt(form.max_capacity, 10);
        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }

        const priceCents = parseCurrencyInputToCents(form.price_cents);
        if (!form.is_free && priceCents === null) {
            await notify.warning(t("adminGroup.forms.invalidPrice"));
            return;
        }

        setCreating(true);
        try {
            const manualAssignments = form.manual_staff
                .filter((entry) => entry.display_name.trim().length > 0)
                .map((entry) => ({
                    display_name: entry.display_name.trim(),
                    display_phone: entry.display_phone.trim() || null,
                    role: entry.role,
                }));

            const payload: CreateGroupEventPayload = {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                no_availability_message: form.is_free ? (form.no_availability_message.trim() || null) : null,
                cover_image_url: form.cover_image_url.trim() || null,
                thumbnail_url: form.thumbnail_url.trim() || null,
                is_free: form.is_free,
                price_cents: form.is_free ? 0 : (priceCents ?? 0),
                max_capacity: maxCapacity,
                capacity_visible: form.capacity_visible,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                location_text: form.location_text.trim() || null,
                staff_assignments: [
                    ...form.linked_staff_ids.map((staffId) => ({
                        staff_profile_id: staffId,
                        role: "INSTRUCTOR" as GroupStaffRole,
                    })),
                    ...manualAssignments,
                ],
            };

            const created = await createGroupEvent(payload);

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const imagePatch: { cover_image_url?: string | null; thumbnail_url?: string | null } = {};
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        imagePatch.cover_image_url = await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_event_cover",
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
                            type: "group_event_thumbnail",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (Object.keys(imagePatch).length > 0) {
                    await updateGroupEvent(created.id, imagePatch);
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            if (form.status !== "DRAFT") {
                await setGroupEventStatus(created.id, form.status);
            }

            await notify.success(t("adminGroup.events.created"));
            setDialogOpen(false);
            resetForm();
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.events.createError"));
        } finally {
            setCreating(false);
        }
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

    if (!canUseEvents) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnBusiness")}
                feature="GROUP_EVENTS"
                requiredPlan="BUSINESS"
                fullPage
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t("adminGroup.events.title")}</h2>
                    <p className="text-sm text-slate-600">{t("adminGroup.events.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadData()}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.refresh")}
                    </Button>
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("adminGroup.events.newEvent")}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.totalEvents")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{events.length}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.seatsBooked")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{capacitySummary.booked}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.totalCapacity")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{capacitySummary.totalCapacity}</CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">{t("adminGroup.events.listTitle")}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
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
                        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                            <Switch checked={upcomingOnly} onCheckedChange={setUpcomingOnly} />
                            {t("adminGroup.events.upcomingOnly")}
                        </label>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/group-reservations/events/upcoming">
                                <CalendarClock className="mr-2 h-4 w-4" />
                                {t("adminGroup.events.upcomingView")}
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        </div>
                    ) : events.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.events.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.title")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.startAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.endAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.price")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.capacity")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => {
                                    const booked = event._count?.bookings ?? 0;
                                    const soldOut = booked >= event.max_capacity;
                                    return (
                                        <TableRow key={event.id}>
                                            <TableCell className="font-medium text-slate-900">
                                                <div>{event.title}</div>
                                                <div className="text-xs text-slate-500">{event.slug}</div>
                                            </TableCell>
                                            <TableCell>{formatDateTime(event.start_at)}</TableCell>
                                            <TableCell>{formatDateTime(event.end_at)}</TableCell>
                                            <TableCell>
                                                {event.is_free
                                                    ? t("adminGroup.events.free")
                                                    : formatMoneyFromCents(event.price_cents, currency)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-900">
                                                    {booked}/{event.max_capacity}
                                                </div>
                                                {soldOut ? (
                                                    <div className="text-xs font-medium text-rose-600">{t("adminGroup.states.soldOut")}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <GroupStatusBadge status={event.status} />
                                            </TableCell>
                                            <TableCell>
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/admin/dashboard/group-reservations/events/${event.id}`}>
                                                        {t("adminGroup.actions.manage")}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
                        <DialogTitle>{t("adminGroup.events.newEvent")}</DialogTitle>
                        <DialogDescription>{t("adminGroup.events.createDescription")}</DialogDescription>
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
                            <Label>{t("adminGroup.fields.startAt")}</Label>
                            <Input
                                type="datetime-local"
                                value={form.start_at}
                                onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.endAt")}</Label>
                            <Input
                                type="datetime-local"
                                value={form.end_at}
                                onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.capacity")}</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.max_capacity}
                                onChange={(e) => setForm((prev) => ({ ...prev, max_capacity: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                            <Label className="text-sm">Cupos visibles</Label>
                            <Switch
                                checked={form.capacity_visible}
                                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, capacity_visible: checked }))}
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
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.eventType")}</Label>
                            <Select
                                value={form.is_free ? "FREE" : "PAID"}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, is_free: value === "FREE" }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">{t("adminGroup.events.free")}</SelectItem>
                                    <SelectItem value="PAID">{t("adminGroup.events.paid")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {!form.is_free ? (
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.priceCents", { currency: currency || "Bs." })}</Label>
                                <Input
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={form.price_cents}
                                    onChange={(e) => setForm((prev) => ({ ...prev, price_cents: e.target.value }))}
                                />
                            </div>
                        ) : null}
                        {form.is_free ? (
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("adminGroup.fields.noAvailabilityMessage")}</Label>
                                <textarea
                                    className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    value={form.no_availability_message}
                                    onChange={(e) => setForm((prev) => ({ ...prev, no_availability_message: e.target.value }))}
                                    placeholder={t("adminGroup.fields.noAvailabilityMessagePlaceholder")}
                                />
                            </div>
                        ) : null}
                    </div>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm">{t("adminGroup.staff.linkedStaff")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 md:grid-cols-2">
                            {staff
                                .filter((member) => member.is_bookable)
                                .map((member) => (
                                    <label
                                        key={member.id}
                                        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.linked_staff_ids.includes(member.id)}
                                            onChange={() => toggleLinkedStaff(member.id)}
                                        />
                                        <span>{member.display_name}</span>
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

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p>{t("adminGroup.events.bookingFlowNote")}</p>
                        <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                            <li>
                                {t("adminGroup.events.autoConfirmState", {
                                    value: settings?.auto_confirm_bookings ? t("adminGroup.values.on") : t("adminGroup.values.off"),
                                })}
                            </li>
                            <li>
                                {t("adminGroup.events.paymentMethodsState", {
                                    cash: settings?.allow_cash_payment ? t("adminGroup.values.enabled") : t("adminGroup.values.disabled"),
                                    qr: settings?.allow_qr_payment ? t("adminGroup.values.enabled") : t("adminGroup.values.disabled"),
                                })}
                            </li>
                            {canUseAdvanced ? <li>{t("adminGroup.events.waitlistEnabled")}</li> : null}
                        </ul>
                    </div>

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
