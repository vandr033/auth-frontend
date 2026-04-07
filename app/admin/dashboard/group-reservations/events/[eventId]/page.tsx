"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, MessageCircle, RefreshCcw, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useGroupReservationsAccess } from "../../lib/useGroupReservationsAccess";
import { formatDateTime, formatMoneyFromCents } from "../../lib/format";
import {
    cancelGroupEventBooking,
    checkInGroupByTicketCode,
    confirmGroupEventBooking,
    getAdminCompanyLocation,
    getGroupBookingFlowSettings,
    getGroupEventById,
    getStaff,
    listGroupEventAttendance,
    listGroupEventBookings,
    listGroupEventInterests,
    listGroupTickets,
    listFreeEventRegistrations,
    listFreeEventInterested,
    removeFreeEventRegistration,
    inviteFreeEventInterested,
    setGroupEventStatus,
    unconfirmGroupEventBooking,
    uploadAdminImage,
    updateGroupEvent,
    type GroupAttendanceRow,
    type AdminCompanyLocation,
    type GroupBookingFlowSettings,
    type GroupEvent,
    type GroupEventBooking,
    type GroupEventInterest,
    type GroupItemStatus,
    type GroupTicket,
    type GroupStaffRole,
    type StaffMember,
    type FreeEventRegistration,
    type FreeEventInterestedUser,
} from "@/app/admin/lib/adminApi";
import { GroupBookingStatusBadge, GroupPaymentStatusBadge, GroupStatusBadge, GroupTicketStatusBadge } from "../../components/GroupBadges";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { getImageUrl } from "@/utils/image-url";
import { formatCurrencyInputFromCents, parseCurrencyInputToCents } from "@/lib/currency";

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
    start_at: string;
    end_at: string;
    location_text: string;
    status: GroupItemStatus;
    linked_staff_ids: number[];
    manual_staff: ManualStaff[];
};

const GROUP_MEDIA_RECOMMENDED_SIZE = "1920px x 1080px";

function toLocalInput(iso: string): string {
    const date = new Date(iso);
    const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return normalized.toISOString().slice(0, 16);
}

function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

function fromEvent(event: GroupEvent): EventFormState {
    const linked = (event.staff_assignments ?? [])
        .filter((item) => item.staff_profile_id !== null)
        .map((item) => item.staff_profile_id as number);

    const manual = (event.staff_assignments ?? [])
        .filter((item) => item.staff_profile_id === null)
        .map((item) => ({
            display_name: item.display_name ?? "",
            display_phone: item.display_phone ?? "",
            role: item.role ?? "INSTRUCTOR",
        }));

    return {
        title: event.title,
        slug: event.slug,
        description: event.description ?? "",
        no_availability_message: event.no_availability_message ?? "",
        cover_image_url: event.cover_image_url ?? "",
        thumbnail_url: event.thumbnail_url ?? "",
        is_free: event.is_free,
        price_cents: formatCurrencyInputFromCents(event.price_cents),
        max_capacity: String(event.max_capacity),
        start_at: toLocalInput(event.start_at),
        end_at: toLocalInput(event.end_at),
        location_text: event.location_text ?? "",
        status: event.status,
        linked_staff_ids: linked,
        manual_staff: manual,
    };
}

export default function GroupEventDetailPage() {
    const t = useT();
    const params = useParams<{ eventId: string }>();
    const eventIdRaw = typeof params?.eventId === "string" ? params.eventId : "";
    const eventId = Number.parseInt(eventIdRaw, 10);
    const { companyId, companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const { canUseAdvanced, canUseEvents } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [event, setEvent] = useState<GroupEvent | null>(null);
    const [bookings, setBookings] = useState<GroupEventBooking[]>([]);
    const [interests, setInterests] = useState<GroupEventInterest[]>([]);
    const [attendance, setAttendance] = useState<GroupAttendanceRow[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [tickets, setTickets] = useState<GroupTicket[]>([]);
    const [settings, setSettings] = useState<GroupBookingFlowSettings | null>(null);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [checkInTicketCode, setCheckInTicketCode] = useState("");
    const [form, setForm] = useState<EventFormState | null>(null);
    const [freeRegistrations, setFreeRegistrations] = useState<FreeEventRegistration[]>([]);
    const [freeInterested, setFreeInterested] = useState<FreeEventInterestedUser[]>([]);
    const [selectedInterested, setSelectedInterested] = useState<Set<number>>(new Set());
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteChannels, setInviteChannels] = useState({ email: true, whatsapp: false });
    const [inviting, setInviting] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!Number.isInteger(eventId) || eventId <= 0) return;

        setLoading(true);
        try {
            const [
                eventData,
                bookingData,
                interestData,
                attendanceData,
                staffData,
                settingsData,
                ticketsData,
                companyLocation,
            ] = await Promise.all([
                getGroupEventById(eventId),
                listGroupEventBookings(eventId),
                listGroupEventInterests(eventId),
                listGroupEventAttendance(eventId),
                getStaff(),
                getGroupBookingFlowSettings(),
                canUseAdvanced ? listGroupTickets() : Promise.resolve([] as GroupTicket[]),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);

            setEvent(eventData);
            setStoreLocation(companyLocation);
            const defaultLocationText = getCompanyLocationLabel(companyLocation);
            setStoreLocationText(defaultLocationText);
            const mapped = fromEvent(eventData);
            setForm({
                ...mapped,
                location_text: mapped.location_text.trim() || defaultLocationText,
            });
            setBookings(bookingData);
            setInterests(interestData);
            setAttendance(attendanceData);
            setStaff(staffData);
            setSettings(settingsData);
            setTickets(ticketsData);

            if (eventData.is_free) {
                const [freeRegs, freeInt] = await Promise.all([
                    listFreeEventRegistrations(eventId),
                    listFreeEventInterested(eventId),
                ]);
                setFreeRegistrations(freeRegs);
                setFreeInterested(freeInt);
                setSelectedInterested(new Set());
            }
            setCoverImageFile(null);
            setThumbnailImageFile(null);
            setCoverImagePreview(null);
            setThumbnailImagePreview(null);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [canUseAdvanced, companyId, eventId, t]);

    useEffect(() => {
        if (!canUseEvents) return;
        void loadData();
    }, [canUseEvents, loadData]);

    const ticketsByBookingId = useMemo(() => {
        const map = new Map<number, GroupTicket[]>();
        tickets.forEach((ticket) => {
            if (ticket.group_event_booking_id) {
                const list = map.get(ticket.group_event_booking_id) ?? [];
                list.push(ticket);
                map.set(ticket.group_event_booking_id, list);
            }
        });
        map.forEach((list, bookingId) => {
            list.sort((a, b) => {
                const seatA = a.seat_number ?? Number.MAX_SAFE_INTEGER;
                const seatB = b.seat_number ?? Number.MAX_SAFE_INTEGER;
                if (seatA !== seatB) return seatA - seatB;
                return a.ticket_code.localeCompare(b.ticket_code);
            });
            map.set(bookingId, list);
        });
        return map;
    }, [tickets]);

    const pendingBookings = useMemo(
        () => bookings.filter((booking) => booking.status === "PENDING"),
        [bookings],
    );
    const confirmedBookings = useMemo(
        () => bookings.filter((booking) => booking.status === "CONFIRMED"),
        [bookings],
    );
    const waitlistBookings = useMemo(
        () => bookings.filter((booking) => booking.status === "WAITLISTED"),
        [bookings],
    );
    const interestCount = interests.length || event?._count?.interests || 0;

    const soldOut = useMemo(() => {
        if (!event) return false;
        const confirmedSpots = confirmedBookings.reduce((sum, booking) => sum + booking.booked_spots, 0);
        return confirmedSpots >= event.max_capacity;
    }, [confirmedBookings, event]);

    const handleUpdateEvent = async () => {
        if (!event || !form) return;
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
        const priceCents = parseCurrencyInputToCents(form.price_cents);
        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }
        if (!form.is_free && (priceCents === null || priceCents <= 0)) {
            await notify.warning(t("adminGroup.forms.invalidPrice"));
            return;
        }

        setSaving(true);
        try {
            await updateGroupEvent(event.id, {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                no_availability_message: form.is_free ? (form.no_availability_message.trim() || null) : null,
                // Skip image fields that will be updated by uploadAdminImage to avoid a
                // temporary null write that could cause the public page to show the wrong image.
                ...(coverImageFile ? {} : { cover_image_url: form.cover_image_url.trim() || null }),
                ...(thumbnailImageFile ? {} : { thumbnail_url: form.thumbnail_url.trim() || null }),
                is_free: form.is_free,
                price_cents: form.is_free ? 0 : (priceCents ?? 0),
                max_capacity: maxCapacity,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
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

            if (form.status !== event.status) {
                await setGroupEventStatus(event.id, form.status);
            }

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_event_cover",
                            entityId: event.id,
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
                            type: "group_event_thumbnail",
                            entityId: event.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            await notify.success(t("adminGroup.events.updated"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.events.updateError"));
        } finally {
            setSaving(false);
        }
    };

    const handleBookingAction = async (
        bookingId: number,
        action: "confirm" | "unconfirm" | "cancel",
    ) => {
        try {
            if (action === "confirm") await confirmGroupEventBooking(bookingId);
            if (action === "unconfirm") await unconfirmGroupEventBooking(bookingId);
            if (action === "cancel") await cancelGroupEventBooking(bookingId);
            await notify.success(t("adminGroup.bookings.actionSuccess"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        }
    };

    const handleCheckIn = async () => {
        if (!checkInTicketCode.trim() || !event) {
            await notify.warning(t("adminGroup.attendance.ticketRequired"));
            return;
        }

        try {
            const result = await checkInGroupByTicketCode({
                ticket_code: checkInTicketCode.trim(),
                event_id: event.id,
                method: "MANUAL",
            });

            if (result.scan_status === "INVALID") {
                throw new Error(result.reason || t("adminGroup.attendance.invalid"));
            }
            await notify.success(t("adminGroup.attendance.checkedIn"));
            setCheckInTicketCode("");
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.attendance.checkInError"));
        }
    };

    const toggleLinkedStaff = (staffId: number) => {
        if (!form) return;
        const exists = form.linked_staff_ids.includes(staffId);
        setForm({
            ...form,
            linked_staff_ids: exists
                ? form.linked_staff_ids.filter((id) => id !== staffId)
                : [...form.linked_staff_ids, staffId],
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

    const handleRemoveFreeRegistration = async (registrationId: number) => {
        try {
            await removeFreeEventRegistration(eventId, registrationId);
            await notify.success(t("adminGroup.freeReg.removed"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.freeReg.removeError"));
        }
    };

    const toggleInterested = (id: number) => {
        setSelectedInterested((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleInvite = async () => {
        if (selectedInterested.size === 0) return;
        if (!inviteChannels.email && !inviteChannels.whatsapp) {
            await notify.warning(t("adminGroup.freeReg.selectChannel"));
            return;
        }
        setInviting(true);
        let succeeded = 0;
        let failed = 0;
        for (const registrationId of Array.from(selectedInterested)) {
            try {
                await inviteFreeEventInterested(eventId, registrationId, inviteChannels);
                succeeded++;
            } catch {
                failed++;
            }
        }
        setInviting(false);
        setInviteDialogOpen(false);
        if (succeeded > 0) await notify.success(t("adminGroup.freeReg.inviteSent", { count: succeeded }));
        if (failed > 0) await notify.warning(t("adminGroup.freeReg.inviteFailed", { count: failed }));
        await loadData();
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

    if (!Number.isInteger(eventId) || eventId <= 0) {
        return <p className="text-sm text-rose-600">{t("adminGroup.events.invalidEventId")}</p>;
    }

    if (loading || !event || !form) {
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
                    <Link href="/admin/dashboard/group-reservations/events">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.backToEvents")}
                    </Link>
                </Button>
                <Button variant="outline" onClick={() => void loadData()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("adminGroup.actions.refresh")}
                </Button>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {event.title}
                        <GroupStatusBadge status={event.status} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.startAt")}</p>
                        <p className="text-sm text-slate-900">{formatDateTime(event.start_at)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.endAt")}</p>
                        <p className="text-sm text-slate-900">{formatDateTime(event.end_at)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.capacity")}</p>
                        <p className="text-sm text-slate-900">
                            {confirmedBookings.reduce((sum, booking) => sum + booking.booked_spots, 0)}/{event.max_capacity}
                            {soldOut ? ` · ${t("adminGroup.states.soldOut")}` : ""}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.price")}</p>
                        <p className="text-sm text-slate-900">
                            {event.is_free ? t("adminGroup.events.free") : formatMoneyFromCents(event.price_cents, currency)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.pending")}</p>
                        <p className="text-sm text-slate-900">{pendingBookings.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{t("adminGroup.fields.subscribers")}</p>
                        <p className="text-sm text-slate-900">{confirmedBookings.length}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.events.editEvent")}</CardTitle>
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
                            <Label>{t("adminGroup.fields.startAt")}</Label>
                            <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm((prev) => prev ? { ...prev, start_at: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.endAt")}</Label>
                            <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm((prev) => prev ? { ...prev, end_at: e.target.value } : prev)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.capacity")}</Label>
                            <Input type="number" min={1} value={form.max_capacity} onChange={(e) => setForm((prev) => prev ? { ...prev, max_capacity: e.target.value } : prev)} />
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
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.eventType")}</Label>
                            <Select
                                value={form.is_free ? "FREE" : "PAID"}
                                onValueChange={(value) => setForm((prev) => prev ? { ...prev, is_free: value === "FREE" } : prev)}
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
                                    onChange={(e) => setForm((prev) => prev ? { ...prev, price_cents: e.target.value } : prev)}
                                />
                            </div>
                        ) : null}
                        {form.is_free ? (
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("adminGroup.fields.noAvailabilityMessage")}</Label>
                                <textarea
                                    className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    value={form.no_availability_message}
                                    onChange={(e) => setForm((prev) => prev ? { ...prev, no_availability_message: e.target.value } : prev)}
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

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <p>{t("adminGroup.events.autoConfirmState", { value: settings?.auto_confirm_bookings ? t("adminGroup.values.on") : t("adminGroup.values.off") })}</p>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={() => void handleUpdateEvent()} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("adminGroup.actions.save")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.bookings.pendingTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingBookings.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminGroup.bookings.noPending")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.spots")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.payment")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingBookings.map((booking) => {
                                    const canManageBooking = booking.source !== "FREE_REGISTRATION";
                                    return (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.user?.name || booking.user?.email || booking.user_id}</TableCell>
                                            <TableCell>{booking.booked_spots}</TableCell>
                                            <TableCell>
                                                <GroupPaymentStatusBadge status={booking.payment_status} />
                                            </TableCell>
                                            <TableCell className="flex flex-wrap gap-2">
                                                {canManageBooking ? (
                                                    <>
                                                        <Button size="sm" onClick={() => void handleBookingAction(booking.id, "confirm")}>
                                                            {t("common.confirm")}
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => void handleBookingAction(booking.id, "cancel")}>
                                                            {t("common.cancel")}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-500">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.bookings.attendeesTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {bookings.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminGroup.bookings.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.payment")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.ticket")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                                <TableBody>
                                {bookings.map((booking) => {
                                    const bookingTickets = ticketsByBookingId.get(booking.id) ?? [];
                                    const canManageBooking = booking.source !== "FREE_REGISTRATION";
                                    return (
                                        <TableRow key={booking.id}>
                                            <TableCell>
                                                <div>{booking.user?.name || booking.user?.email || booking.user_id}</div>
                                                <div className="text-xs text-slate-500">{booking.user?.phoneNumber || "—"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <GroupBookingStatusBadge status={booking.status} />
                                            </TableCell>
                                            <TableCell>
                                                <GroupPaymentStatusBadge status={booking.payment_status} />
                                            </TableCell>
                                            <TableCell>
                                                {canUseAdvanced && bookingTickets.length > 0 ? (
                                                    <div className="max-h-44 space-y-2 overflow-auto pr-1">
                                                        {bookingTickets.map((ticket) => (
                                                            <div key={ticket.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                                                                <div className="mb-1 flex items-center gap-2">
                                                                    <GroupTicketStatusBadge status={ticket.status} />
                                                                    {ticket.seat_number ? (
                                                                        <span className="text-[11px] font-medium text-slate-600">#{ticket.seat_number}</span>
                                                                    ) : null}
                                                                </div>
                                                                <div className="text-xs font-medium text-slate-700">{ticket.ticket_code}</div>
                                                                {(ticket.holder_name || ticket.holder_email || ticket.holder_phone) ? (
                                                                    <div className="mt-1 text-[11px] text-slate-500">
                                                                        {ticket.holder_name || "—"}
                                                                        {(ticket.holder_email || ticket.holder_phone)
                                                                            ? ` · ${ticket.holder_email || ticket.holder_phone}`
                                                                            : ""}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">
                                                        {canUseAdvanced ? t("adminGroup.ticket.none") : t("adminGroup.ticket.proOnly")}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="flex flex-wrap gap-2">
                                                {canManageBooking && booking.status === "PENDING" ? (
                                                    <Button size="sm" onClick={() => void handleBookingAction(booking.id, "confirm")}>
                                                        {t("common.confirm")}
                                                    </Button>
                                                ) : null}
                                                {canManageBooking && booking.status === "CONFIRMED" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleBookingAction(booking.id, "unconfirm")}>
                                                        {t("adminGroup.actions.unconfirm")}
                                                    </Button>
                                                ) : null}
                                                {canManageBooking && booking.status !== "CANCELLED" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleBookingAction(booking.id, "cancel")}>
                                                        {t("common.cancel")}
                                                    </Button>
                                                ) : null}
                                                {!canManageBooking ? (
                                                    <span className="text-xs text-slate-500">—</span>
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

            {!event.is_free && canUseAdvanced ? (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminGroup.bookings.waitlistTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {waitlistBookings.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminGroup.bookings.waitlistEmpty")}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.createdAt")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {waitlistBookings.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.user?.name || booking.user?.email || booking.user_id}</TableCell>
                                            <TableCell>{formatDateTime(booking.created_at)}</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => void handleBookingAction(booking.id, "cancel")}>
                                                    {t("adminGroup.actions.remove")}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            ) : null}

            {event.is_free ? (
                <>
                    {/* Free event participants */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.freeReg.participantsTitle")} ({freeRegistrations.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {freeRegistrations.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.freeReg.participantsEmpty")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.email")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.phone")}</TableHead>
                                            <TableHead>{t("adminGroup.freeReg.code")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.checkedInAt")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {freeRegistrations.map((reg) => (
                                            <TableRow key={reg.id}>
                                                <TableCell className="font-medium">{reg.firstName} {reg.lastName}</TableCell>
                                                <TableCell>{reg.email}</TableCell>
                                                <TableCell>{reg.phonePrefix && reg.phoneNumber ? `+${reg.phonePrefix}${reg.phoneNumber}` : "—"}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs">{reg.reservationCode ?? "—"}</span>
                                                </TableCell>
                                                <TableCell>{reg.checkedInAt ? formatDateTime(reg.checkedInAt) : "—"}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleRemoveFreeRegistration(reg.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Interested users */}
                    <Card className="border-slate-200">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base">{t("adminGroup.freeReg.interestedTitle")} ({freeInterested.length})</CardTitle>
                            {freeInterested.length > 0 && (
                                <Button
                                    size="sm"
                                    disabled={selectedInterested.size === 0}
                                    onClick={() => setInviteDialogOpen(true)}
                                >
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    {t("adminGroup.freeReg.inviteSelected")} ({selectedInterested.size})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {freeInterested.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.freeReg.interestedEmpty")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.email")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.phone")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.createdAt")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {freeInterested.map((person) => (
                                            <TableRow key={person.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedInterested.has(person.id)}
                                                        onCheckedChange={() => toggleInterested(person.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{person.firstName} {person.lastName}</TableCell>
                                                <TableCell>{person.email}</TableCell>
                                                <TableCell>{person.phonePrefix && person.phoneNumber ? `+${person.phonePrefix}${person.phoneNumber}` : "—"}</TableCell>
                                                <TableCell>{formatDateTime(person.createdAt)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Invite dialog */}
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>{t("adminGroup.freeReg.inviteDialogTitle")}</DialogTitle>
                                <DialogDescription>
                                    {t("adminGroup.freeReg.inviteDialogDesc", { count: selectedInterested.size })}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
                                    <Checkbox
                                        checked={inviteChannels.email}
                                        onCheckedChange={(v) => setInviteChannels((prev) => ({ ...prev, email: Boolean(v) }))}
                                    />
                                    <Mail className="h-4 w-4 text-slate-500" />
                                    {t("adminGroup.freeReg.channelEmail")}
                                </label>
                                <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
                                    <Checkbox
                                        checked={inviteChannels.whatsapp}
                                        onCheckedChange={(v) => setInviteChannels((prev) => ({ ...prev, whatsapp: Boolean(v) }))}
                                    />
                                    <MessageCircle className="h-4 w-4 text-slate-500" />
                                    {t("adminGroup.freeReg.channelWhatsapp")}
                                </label>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                                    {t("common.cancel")}
                                </Button>
                                <Button onClick={() => void handleInvite()} disabled={inviting || (!inviteChannels.email && !inviteChannels.whatsapp)}>
                                    {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t("adminGroup.freeReg.inviteConfirm")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.attendance.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            value={checkInTicketCode}
                            placeholder={t("adminGroup.attendance.ticketCodePlaceholder")}
                            onChange={(e) => setCheckInTicketCode(e.target.value)}
                        />
                        <Button onClick={() => void handleCheckIn()}>{t("adminGroup.attendance.manualCheckIn")}</Button>
                    </div>
                    {attendance.length === 0 ? (
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
                                {attendance.map((row) => (
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
    );
}
