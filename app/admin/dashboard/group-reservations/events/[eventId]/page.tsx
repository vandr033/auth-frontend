"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Eye, Loader2, Mail, MessageCircle, RefreshCcw, Send, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
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
import { canUsePlanFeature } from "@/lib/plans/capabilities";
import { useGroupReservationsAccess } from "../../lib/useGroupReservationsAccess";
import { formatDateTime, formatMoneyFromCents } from "../../lib/format";
import {
    approveGroupEventBookingQrPayment,
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
    listWhatsappEventGroups,
    createWhatsappEventGroup,
    sendWhatsappGroupMessage,
    type WhatsappEventGroup,
    streamGroupEventMassMessage,
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
    type GroupEventMassMessageDeliveryMode,
    type GroupEventInterest,
    type GroupItemStatus,
    type MassCustomerMessageProgress,
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

type EventMessageRecipient = {
    key: string;
    id: number;
    source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
    label: string;
    email: string | null;
    phone: string | null;
    status: string;
};

type FailedEventMessageTarget = {
    source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
    id: number;
    failed_channels: Array<"WHATSAPP" | "EMAIL">;
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

function getMassRecipientKey(source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION", id: number): string {
    return `${source}:${id}`;
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
    capacity_visible: boolean;
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
        capacity_visible: event.capacity_visible ?? false,
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
    const { canUseAdvanced, canUseEvents, getRequiredPlan } = useGroupReservationsAccess();
    const canBulkMessaging = canUsePlanFeature(companyUser?.company, "BULK_WHATSAPP_MESSAGING");

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
    const [massDialogOpen, setMassDialogOpen] = useState(false);
    const [massMessageBody, setMassMessageBody] = useState("");
    const [massMessageDeliveryMode, setMassMessageDeliveryMode] = useState<GroupEventMassMessageDeliveryMode>("BOTH");
    const [sendingMassMessage, setSendingMassMessage] = useState(false);
    const [selectedMassRecipients, setSelectedMassRecipients] = useState<Set<string>>(new Set());
    const [massRecipientSearch, setMassRecipientSearch] = useState("");
    const [massMessageProgress, setMassMessageProgress] = useState<MassCustomerMessageProgress | null>(null);
    const [massRecipientMenuOpen, setMassRecipientMenuOpen] = useState(false);
    const [failedMassRecipients, setFailedMassRecipients] = useState<FailedEventMessageTarget[]>([]);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);
    const [qrProofDialog, setQrProofDialog] = useState<string | null>(null);
    const massRecipientSearchInputRef = useRef<HTMLInputElement | null>(null);
    const [waGroups, setWaGroups] = useState<WhatsappEventGroup[]>([]);
    const [waGroupDialogOpen, setWaGroupDialogOpen] = useState(false);
    const [waGroupName, setWaGroupName] = useState("");
    const [waGroupIncludeParticipants, setWaGroupIncludeParticipants] = useState(true);
    const [waGroupSelectedStaff, setWaGroupSelectedStaff] = useState<Set<number>>(new Set());
    const [waGroupCreating, setWaGroupCreating] = useState(false);
    const [waMsgDialogGroup, setWaMsgDialogGroup] = useState<WhatsappEventGroup | null>(null);
    const [waMsgText, setWaMsgText] = useState("");
    const [waMsgSending, setWaMsgSending] = useState(false);

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
                const [freeRegs, freeInt, waGroupsData] = await Promise.all([
                    listFreeEventRegistrations(eventId),
                    listFreeEventInterested(eventId),
                    listWhatsappEventGroups(eventId),
                ]);
                setFreeRegistrations(freeRegs);
                setFreeInterested(freeInt);
                setSelectedInterested(new Set());
                setWaGroups(waGroupsData);
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
    const activeAudienceCount = useMemo(
        () => bookings.filter((booking) => booking.status !== "CANCELLED").length,
        [bookings],
    );
    const massRecipients = useMemo<EventMessageRecipient[]>(() => {
        return bookings
            .filter((booking) => booking.status !== "CANCELLED")
            .map((booking) => {
                const source = booking.source === "FREE_REGISTRATION" ? "FREE_REGISTRATION" : "GROUP_EVENT_BOOKING";
                const rawId = source === "FREE_REGISTRATION" ? Math.abs(booking.id) : booking.id;
                const name = booking.user?.name || booking.user?.email || booking.user_id;
                return {
                    key: getMassRecipientKey(source, rawId),
                    id: rawId,
                    source,
                    label: name,
                    email: booking.user?.email ?? null,
                    phone: booking.user?.phoneNumber ?? null,
                    status: booking.status,
                };
            });
    }, [bookings]);
    const filteredMassRecipients = useMemo(() => {
        const query = massRecipientSearch.trim().toLowerCase();
        if (!query) return massRecipients;

        return massRecipients.filter((recipient) => {
            const haystack = [
                recipient.label,
                recipient.email ?? "",
                recipient.phone ?? "",
                recipient.status,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [massRecipientSearch, massRecipients]);
    const selectedMassRecipientCount = selectedMassRecipients.size;
    const filteredSelectedMassRecipientCount = filteredMassRecipients.reduce(
        (count, recipient) => count + (selectedMassRecipients.has(recipient.key) ? 1 : 0),
        0,
    );
    const failedWhatsappRecipients = useMemo(
        () => failedMassRecipients.filter((recipient) => recipient.failed_channels.includes("WHATSAPP")),
        [failedMassRecipients],
    );
    const failedEmailRecipients = useMemo(
        () => failedMassRecipients.filter((recipient) => recipient.failed_channels.includes("EMAIL")),
        [failedMassRecipients],
    );
    const interestCount = interests.length || event?._count?.interests || 0;

    useEffect(() => {
        const validRecipientKeys = new Set(massRecipients.map((recipient) => recipient.key));
        setSelectedMassRecipients((prev) => {
            const next = new Set<string>();
            prev.forEach((key) => {
                if (validRecipientKeys.has(key)) {
                    next.add(key);
                }
            });
            return next;
        });
    }, [massRecipients]);

    useEffect(() => {
        if (!massRecipientMenuOpen) return;
        const frame = window.requestAnimationFrame(() => {
            massRecipientSearchInputRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [massRecipientMenuOpen]);

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
        if (!form.is_free && priceCents === null) {
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
                capacity_visible: form.capacity_visible,
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

    const handleApproveQrPayment = async (bookingId: number) => {
        try {
            await approveGroupEventBookingQrPayment(bookingId);
            await notify.success(t("adminGroup.bookings.paymentConfirmed"));
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

    const exportInterestedCsv = () => {
        const headers = ["name", "email", "phone", "event", "created_at", "status"];
        const rows = freeInterested.map((person) => [
            `${person.firstName} ${person.lastName}`.trim(),
            person.email || "",
            person.phonePrefix && person.phoneNumber ? `+${person.phonePrefix}${person.phoneNumber}` : "",
            event?.title || "",
            person.createdAt,
            "INTERESTED",
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => {
                const text = String(cell).replace(/"/g, '""');
                return /[",\n]/.test(text) ? `"${text}"` : text;
            }).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interesados-evento-${eventId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const sendMassMessageToTargets = async (
        targets: Array<{ source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION"; id: number }>,
        deliveryMode: GroupEventMassMessageDeliveryMode,
    ) => {
        if (!canBulkMessaging) {
            await notify.warning(t("planEnforcement.availableOnPro"));
            return;
        }

        const message = massMessageBody.trim();
        if (!message) {
            await notify.warning(t("adminGroup.events.massMessageBodyRequired"));
            return;
        }

        if (targets.length === 0) {
            await notify.warning(t("adminGroup.events.massMessageRecipientsRequired"));
            return;
        }

        setSendingMassMessage(true);
        setMassMessageProgress({
            total_customers: targets.length,
            total_recipients: targets.length,
            processed: 0,
            sent_total: 0,
            sent_whatsapp: 0,
            sent_email: 0,
            skipped_no_contact: 0,
            skipped_duplicates: 0,
            failed: 0,
        });
        try {
            const result = await streamGroupEventMassMessage(
                eventId,
                {
                    message,
                    delivery_mode: deliveryMode,
                    selected_targets: targets,
                },
                {
                    onProgress: (progress) => {
                        setMassMessageProgress({
                            ...progress,
                            total_customers: progress.total_recipients,
                        });
                    },
                },
            );

            const nextFailedRecipients = result.failed_targets ?? [];
            setFailedMassRecipients(nextFailedRecipients);

            if (nextFailedRecipients.length > 0) {
                await notify.warning(
                    t("adminGroup.events.massMessageRetryAvailable", {
                        failed: nextFailedRecipients.length,
                    }),
                );
            } else {
                await notify.success(
                    t("adminGroup.events.massMessageSummary", {
                        sent: result.sent_total,
                        whatsapp: result.sent_whatsapp,
                        email: result.sent_email,
                        failed: result.failed,
                        noContact: result.skipped_no_contact,
                    }),
                );
                setMassMessageBody("");
                setMassDialogOpen(false);
            }
            setMassMessageProgress(null);
        } catch (error) {
            setMassMessageProgress(null);
            await notify.error(error instanceof Error ? error.message : t("adminGroup.events.massMessageFailed"));
        } finally {
            setSendingMassMessage(false);
        }
    };

    const handleSendMassMessage = async () => {
        await sendMassMessageToTargets(
            massRecipients
                .filter((recipient) => selectedMassRecipients.has(recipient.key))
                .map((recipient) => ({
                    source: recipient.source,
                    id: recipient.id,
                })),
            massMessageDeliveryMode,
        );
    };

    const handleRetryFailedMassMessage = async (channel: "WHATSAPP" | "EMAIL") => {
        await sendMassMessageToTargets(
            failedMassRecipients
                .filter((recipient) => recipient.failed_channels.includes(channel))
                .map((recipient) => ({
                    source: recipient.source,
                    id: recipient.id,
                })),
            channel,
        );
    };

    const toggleMassRecipient = (key: string, checked: boolean) => {
        setSelectedMassRecipients((prev) => {
            const next = new Set(prev);
            if (checked) next.add(key);
            else next.delete(key);
            return next;
        });
    };

    const selectFilteredMassRecipients = () => {
        setSelectedMassRecipients((prev) => {
            const next = new Set(prev);
            filteredMassRecipients.forEach((recipient) => next.add(recipient.key));
            return next;
        });
    };

    const clearFilteredMassRecipients = () => {
        setSelectedMassRecipients((prev) => {
            const next = new Set(prev);
            filteredMassRecipients.forEach((recipient) => next.delete(recipient.key));
            return next;
        });
    };

    const handleCreateWaGroup = async () => {
        setWaGroupCreating(true);
        try {
            const staffPhones = (form?.manual_staff ?? [])
                .filter((_, i) => waGroupSelectedStaff.has(i) && _?.display_phone?.trim())
                .map((s) => s.display_phone.replace(/\D/g, ""));
            const group = await createWhatsappEventGroup(eventId, {
                groupName: waGroupName.trim() || undefined,
                staffPhones,
                includeParticipants: waGroupIncludeParticipants,
            });
            setWaGroups((prev) => [group, ...prev]);
            setWaGroupDialogOpen(false);
            setWaGroupName("");
            setWaGroupSelectedStaff(new Set());
            await notify.success("Grupo de WhatsApp creado");
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : "Error al crear grupo");
        } finally {
            setWaGroupCreating(false);
        }
    };

    const handleSendWaGroupMessage = async () => {
        if (!waMsgDialogGroup) return;
        setWaMsgSending(true);
        try {
            await sendWhatsappGroupMessage(eventId, waMsgDialogGroup.id, waMsgText);
            setWaMsgDialogGroup(null);
            setWaMsgText("");
            await notify.success("Mensaje enviado al grupo");
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : "Error al enviar mensaje");
        } finally {
            setWaMsgSending(false);
        }
    };

    if (!canUseEvents) {
        const requiredPlan = getRequiredPlan("GROUP_EVENTS");
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                feature="GROUP_EVENTS"
                requiredPlan={requiredPlan}
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
                <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
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

            {!canBulkMessaging ? (
                (() => {
                    const requiredPlan = getRequiredPlan("BULK_WHATSAPP_MESSAGING");
                    return (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                    feature="BULK_WHATSAPP_MESSAGING"
                    requiredPlan={requiredPlan}
                />
                    );
                })()
            ) : null}

            <Card className="border-slate-200">
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            {event.title}
                            <GroupStatusBadge status={event.status} />
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMassDialogOpen(true)}
                            disabled={!canBulkMessaging || sendingMassMessage || massRecipients.length === 0}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {t("adminGroup.events.sendMassMessage")}
                        </Button>
                    </div>
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
                        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                            <Checkbox
                                checked={form.capacity_visible}
                                onCheckedChange={(checked) => setForm((prev) => prev ? { ...prev, capacity_visible: Boolean(checked) } : prev)}
                            />
                            Cupos visibles
                        </label>
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

                    <StickyFormActions
                        onSave={handleUpdateEvent}
                        loading={saving}
                        saveLabel={t("adminGroup.actions.save")}
                        loadingLabel={t("adminServices.saving")}
                        saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
                        onCancel={() => void loadData()}
                        cancelLabel={t("common.cancel")}
                    />
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
                                    const needsQrApproval =
                                        canManageBooking
                                        && booking.payment_method === "QR"
                                        && booking.payment_status === "PENDING_CONFIRMATION";
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
                                                        {needsQrApproval ? (
                                                            <Button size="sm" onClick={() => void handleApproveQrPayment(booking.id)}>
                                                                {t("adminGroup.actions.approveQrPayment")}
                                                            </Button>
                                                        ) : (
                                                            <Button size="sm" onClick={() => void handleBookingAction(booking.id, "confirm")}>
                                                                {t("common.confirm")}
                                                            </Button>
                                                        )}
                                                        {booking.qr_proof_image_url ? (
                                                            <Button size="sm" variant="outline" onClick={() => setQrProofDialog(booking.qr_proof_image_url!)}>
                                                                <Eye className="mr-1 h-3 w-3" />
                                                                {t("adminGroup.actions.viewQrProof")}
                                                            </Button>
                                                        ) : null}
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
                                    const needsQrApproval =
                                        canManageBooking
                                        && booking.status === "PENDING"
                                        && booking.payment_method === "QR"
                                        && booking.payment_status === "PENDING_CONFIRMATION";
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
                                                    needsQrApproval ? (
                                                        <Button size="sm" onClick={() => void handleApproveQrPayment(booking.id)}>
                                                            {t("adminGroup.actions.approveQrPayment")}
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={() => void handleBookingAction(booking.id, "confirm")}>
                                                            {t("common.confirm")}
                                                        </Button>
                                                    )
                                                ) : null}
                                                {canManageBooking && booking.status === "CONFIRMED" ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleBookingAction(booking.id, "unconfirm")}>
                                                        {t("adminGroup.actions.unconfirm")}
                                                    </Button>
                                                ) : null}
                                                {booking.qr_proof_image_url ? (
                                                    <Button size="sm" variant="outline" onClick={() => setQrProofDialog(booking.qr_proof_image_url!)}>
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        {t("adminGroup.actions.viewQrProof")}
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
                                                <TableCell>{reg.email || "—"}</TableCell>
                                                <TableCell>{reg.phonePrefix && reg.phoneNumber ? `+${reg.phonePrefix}${reg.phoneNumber}` : "—"}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs">{reg.reservationCode ?? "—"}</span>
                                                </TableCell>
                                                <TableCell>{reg.checkedInAt ? formatDateTime(reg.checkedInAt) : "—"}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {reg.phonePrefix && reg.phoneNumber && (
                                                            <a
                                                                href={`https://wa.me/${reg.phonePrefix.replace(/\D/g, "")}${reg.phoneNumber.replace(/\D/g, "")}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button size="sm" variant="outline" title="WhatsApp">
                                                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                        {reg.email && (
                                                            <a href={`mailto:${reg.email}`}>
                                                                <Button size="sm" variant="outline" title="Email">
                                                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleRemoveFreeRegistration(reg.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
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
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={exportInterestedCsv}>
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        Exportar CSV
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={selectedInterested.size === 0}
                                        onClick={() => setInviteDialogOpen(true)}
                                    >
                                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                        {t("adminGroup.freeReg.inviteSelected")} ({selectedInterested.size})
                                    </Button>
                                </div>
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
                                            <TableHead>{t("adminGroup.fields.actions")}</TableHead>
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
                                                <TableCell>{person.email || "—"}</TableCell>
                                                <TableCell>{person.phonePrefix && person.phoneNumber ? `+${person.phonePrefix}${person.phoneNumber}` : "—"}</TableCell>
                                                <TableCell>{formatDateTime(person.createdAt)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {person.phonePrefix && person.phoneNumber && (
                                                            <a
                                                                href={`https://wa.me/${person.phonePrefix.replace(/\D/g, "")}${person.phoneNumber.replace(/\D/g, "")}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button size="sm" variant="outline" title="WhatsApp">
                                                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                        {person.email && (
                                                            <a href={`mailto:${person.email}`}>
                                                                <Button size="sm" variant="outline" title="Email">
                                                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* WhatsApp Groups */}
                    <Card className="border-slate-200">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base">Grupos de WhatsApp</CardTitle>
                            <Button size="sm" onClick={() => setWaGroupDialogOpen(true)}>
                                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                Crear grupo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {waGroups.length === 0 ? (
                                <p className="text-sm text-slate-500">No hay grupos creados aún.</p>
                            ) : (
                                <div className="space-y-2">
                                    {waGroups.map((g) => (
                                        <div key={g.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                                            <div>
                                                <p className="text-sm font-medium">{g.group_name}</p>
                                                <p className="font-mono text-xs text-slate-400">{g.group_jid}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => { setWaMsgDialogGroup(g); setWaMsgText(""); }}>
                                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                                Enviar mensaje
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Create WA group dialog */}
                    <Dialog open={waGroupDialogOpen} onOpenChange={setWaGroupDialogOpen}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Crear grupo de WhatsApp</DialogTitle>
                                <DialogDescription>Se añadirán los participantes confirmados y el staff seleccionado.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <div>
                                    <Label className="mb-1 block text-xs">Nombre del grupo (opcional)</Label>
                                    <Input
                                        value={waGroupName}
                                        onChange={(e) => setWaGroupName(e.target.value)}
                                        placeholder={event?.title ?? ""}
                                    />
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={waGroupIncludeParticipants}
                                        onCheckedChange={(v) => setWaGroupIncludeParticipants(Boolean(v))}
                                    />
                                    Incluir participantes confirmados
                                </label>
                                {(form?.manual_staff ?? []).filter((s) => s.display_phone?.trim()).length > 0 && (
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-slate-500">Agregar staff</p>
                                        <div className="space-y-1">
                                            {(form?.manual_staff ?? []).map((s, i) => s.display_phone?.trim() ? (
                                                <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={waGroupSelectedStaff.has(i)}
                                                        onCheckedChange={(v) => {
                                                            setWaGroupSelectedStaff((prev) => {
                                                                const next = new Set(prev);
                                                                if (v) next.add(i); else next.delete(i);
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                    {s.display_name}{s.display_phone ? ` · ${s.display_phone}` : ""}
                                                </label>
                                            ) : null)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setWaGroupDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={() => void handleCreateWaGroup()} disabled={waGroupCreating}>
                                    {waGroupCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Crear grupo
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Send WA group message dialog */}
                    <Dialog open={!!waMsgDialogGroup} onOpenChange={(open) => { if (!open) setWaMsgDialogGroup(null); }}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Enviar mensaje al grupo</DialogTitle>
                                <DialogDescription>{waMsgDialogGroup?.group_name}</DialogDescription>
                            </DialogHeader>
                            <div className="py-2">
                                <textarea
                                    value={waMsgText}
                                    onChange={(e) => setWaMsgText(e.target.value)}
                                    rows={4}
                                    placeholder="Escribe tu mensaje..."
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-admin-brand focus:ring-1 focus:ring-admin-brand"
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setWaMsgDialogGroup(null)}>Cancelar</Button>
                                <Button onClick={() => void handleSendWaGroupMessage()} disabled={waMsgSending || !waMsgText.trim()}>
                                    {waMsgSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Enviar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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

                    <Dialog
                        open={massDialogOpen}
                        onOpenChange={(open) => {
                            setMassDialogOpen(open);
                            if (!open) {
                                setMassRecipientMenuOpen(false);
                                setMassRecipientSearch("");
                                setFailedMassRecipients([]);
                                setMassMessageProgress(null);
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{t("adminGroup.events.sendMassMessageTitle")}</DialogTitle>
                                <DialogDescription>
                                    {t("adminGroup.events.sendMassMessageDescription")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t("adminGroup.events.massMessageRecipientsLabel")}</Label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <DropdownMenu
                                            modal={false}
                                            open={massRecipientMenuOpen}
                                            onOpenChange={setMassRecipientMenuOpen}
                                        >
                                            <DropdownMenuTrigger asChild>
                                                <Button type="button" variant="outline">
                                                    {t("adminGroup.events.massMessageRecipientsButton", {
                                                        selected: selectedMassRecipientCount,
                                                        total: massRecipients.length,
                                                    })}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="start"
                                                className="w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]"
                                                onCloseAutoFocus={(event) => event.preventDefault()}
                                            >
                                                <DropdownMenuLabel>{t("adminGroup.events.massMessageRecipientsLabel")}</DropdownMenuLabel>
                                                <div className="px-2 pb-2">
                                                    <Input
                                                        ref={massRecipientSearchInputRef}
                                                        value={massRecipientSearch}
                                                        onChange={(e) => setMassRecipientSearch(e.target.value)}
                                                        onKeyDown={(event) => event.stopPropagation()}
                                                        placeholder={t("adminGroup.events.massMessageRecipientSearchPlaceholder")}
                                                    />
                                                </div>
                                                <DropdownMenuSeparator />
                                                {filteredMassRecipients.length === 0 ? (
                                                    <div className="px-2 py-3 text-sm text-slate-500">
                                                        {t("adminGroup.events.massMessageRecipientNoMatches")}
                                                    </div>
                                                ) : (
                                                    filteredMassRecipients.map((recipient) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={recipient.key}
                                                            checked={selectedMassRecipients.has(recipient.key)}
                                                            onCheckedChange={(checked) => toggleMassRecipient(recipient.key, checked === true)}
                                                            onSelect={(event) => event.preventDefault()}
                                                            className="items-start"
                                                        >
                                                            <div className="flex min-w-0 flex-col">
                                                                <span className="truncate font-medium">{recipient.label}</span>
                                                                <div className="mt-1 space-y-1 text-xs text-slate-500">
                                                                    <span className="flex items-center gap-1 truncate">
                                                                        <Mail className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">
                                                                            {recipient.email || t("common.notAvailable")}
                                                                        </span>
                                                                    </span>
                                                                    <span className="flex items-center gap-1 truncate">
                                                                        <MessageCircle className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">
                                                                            {recipient.phone || t("common.notAvailable")}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </DropdownMenuCheckboxItem>
                                                    ))
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={selectFilteredMassRecipients}
                                            disabled={filteredMassRecipients.length === 0}
                                        >
                                            {t("adminGroup.events.selectAllRecipients")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilteredMassRecipients}
                                            disabled={filteredMassRecipients.length === 0}
                                        >
                                            {t("adminGroup.events.clearRecipientSelection")}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {t("adminGroup.events.massMessageRecipientCounter", {
                                            selected: filteredSelectedMassRecipientCount,
                                            total: filteredMassRecipients.length,
                                        })}
                                    </p>
                                    {sendingMassMessage && massMessageProgress ? (
                                        <p className="text-xs font-medium text-admin-brand">
                                            {t("adminGroup.events.massMessageLiveCounter", {
                                                sent: massMessageProgress.sent_total,
                                                processed: massMessageProgress.processed,
                                                total: massMessageProgress.total_recipients,
                                            })}
                                        </p>
                                    ) : null}
                                    {!sendingMassMessage && failedWhatsappRecipients.length > 0 ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleRetryFailedMassMessage("WHATSAPP")}
                                        >
                                            {t("adminGroup.events.massMessageRetryWhatsapp", {
                                                count: failedWhatsappRecipients.length,
                                            })}
                                        </Button>
                                    ) : null}
                                    {!sendingMassMessage && failedEmailRecipients.length > 0 ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleRetryFailedMassMessage("EMAIL")}
                                        >
                                            {t("adminGroup.events.massMessageRetryEmail", {
                                                count: failedEmailRecipients.length,
                                            })}
                                        </Button>
                                    ) : null}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("adminGroup.events.massMessageDeliveryLabel")}</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            type="button"
                                            variant={massMessageDeliveryMode === "WHATSAPP" ? "default" : "outline"}
                                            onClick={() => setMassMessageDeliveryMode("WHATSAPP")}
                                            disabled={sendingMassMessage}
                                        >
                                            {t("adminGroup.events.massMessageDeliveryWhatsapp")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={massMessageDeliveryMode === "EMAIL" ? "default" : "outline"}
                                            onClick={() => setMassMessageDeliveryMode("EMAIL")}
                                            disabled={sendingMassMessage}
                                        >
                                            {t("adminGroup.events.massMessageDeliveryEmail")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={massMessageDeliveryMode === "BOTH" ? "default" : "outline"}
                                            onClick={() => setMassMessageDeliveryMode("BOTH")}
                                            disabled={sendingMassMessage}
                                        >
                                            {t("adminGroup.events.massMessageDeliveryBoth")}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event-mass-message">{t("adminGroup.events.massMessageBodyLabel")}</Label>
                                    <textarea
                                        id="event-mass-message"
                                        rows={6}
                                        value={massMessageBody}
                                        onChange={(e) => setMassMessageBody(e.target.value)}
                                        placeholder={t("adminGroup.events.massMessageBodyPlaceholder")}
                                        className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    {t("adminGroup.events.massMessageAudienceHint", { count: selectedMassRecipientCount })}
                                </p>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setMassDialogOpen(false)} disabled={sendingMassMessage}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="button" onClick={() => void handleSendMassMessage()} disabled={sendingMassMessage}>
                                    {sendingMassMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {sendingMassMessage && massMessageProgress
                                        ? t("adminGroup.events.massMessageLiveButton", {
                                            sent: massMessageProgress.sent_total,
                                            total: massMessageProgress.total_recipients,
                                        })
                                        : t("adminGroup.events.sendMassMessage")}
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
