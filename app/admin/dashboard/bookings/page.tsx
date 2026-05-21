"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { format, addDays, addMonths, endOfDay, endOfMonth, isSameDay, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import {
    Calendar as CalendarIcon,
    CalendarDays,
    List as ListIcon,
    Plus,
    BellRing,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Filter,
    X,
    Clock3,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminBooking, BookingStatus } from "@/types/admin-booking";
import { BookingCalendarView } from "./components/BookingCalendarView";
import { BookingMonthView } from "./components/BookingMonthView";
import { BookingListView } from "./components/BookingListView";
import { BookingDetailSheet } from "./components/BookingDetailSheet";
import { NewBookingModal } from "./components/NewBookingModal";
import {
    getBookings,
    createBooking,
    createRecurringBookings,
    updateBooking,
    getStaff,
    getMyStaffProfile,
    getServices,
    getHours,
    getTodayReminderPreview,
    sendTodayReminder,
    sendNoShowNotification,
    StaffMember,
    ServiceItem,
    CreateBookingData,
    CreateRecurringBookingData,
    DaySchedule,
} from "@/app/admin/lib/adminApi";
import type { NoShowNotificationChannel } from "@/app/admin/lib/adminApi";
import { canUseEntitledFeature } from "@/lib/plans/capabilities";
import { LockedFeatureButton } from "@/components/admin/product/LockedFeatureButton";
import { notify } from "@/lib/notify";
import { getProductAccessRecommendationForCapability } from "@/lib/product-access";
import {
    AdminMetricGrid,
    AdminPageHeader,
    AdminPageShell,
    DataToolbar,
    ProgressPanel,
    StatCard,
    StatusBadge,
} from "@/components/admin/shared";

type DayCount = 1 | 3 | 7;

const STATUS_OPTIONS: { value: BookingStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "adminBookings.allStatuses" },
    { value: "PENDING", label: "adminBookings.pending" },
    { value: "CONFIRMED", label: "adminBookings.confirmed" },
    { value: "COMPLETED", label: "adminBookings.completed" },
    { value: "CANCELLED", label: "adminBookings.cancelled" },
    { value: "NO_SHOW", label: "adminBookings.noShow" },
];

export default function BookingsPage() {
    const { isAuthenticated, role, companyUser, user } = useAdminAuth();
    const { t, locale } = useI18n();
    const dateFnsLocale = getDateLocale(locale);
    const isStaffRole = role === "STAFF";
    const currency = companyUser?.company?.currency;
    const canSendReminders = Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, "BOOKING_REMINDERS");
    const canSendTransactionalNotifications =
        Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, "TRANSACTIONAL_BOOKING_NOTIFICATIONS");
    const remindersRecommendation = getProductAccessRecommendationForCapability("MENSAJERIA_REMINDERS");
    const transactionalMessagingRecommendation = getProductAccessRecommendationForCapability("MENSAJERIA_BASE");

    // View State
    const [viewMode, setViewMode] = useState<"calendar" | "month" | "list">(isStaffRole ? "list" : "calendar");
    const [dayCount, setDayCount] = useState<DayCount>(7);
    const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));

    // Filters
    const [staffFilter, setStaffFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
    const [showCancelled, setShowCancelled] = useState(false);

    // Data
    const [bookings, setBookings] = useState<AdminBooking[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
    const [businessHours, setBusinessHours] = useState<DaySchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const [isSendingReminders, setIsSendingReminders] = useState(false);
    const [reminderProgress, setReminderProgress] = useState(0);
    const [reminderCurrent, setReminderCurrent] = useState(0);
    const [reminderTotal, setReminderTotal] = useState(0);
    const [reminderStatusText, setReminderStatusText] = useState<string | null>(null);
    const [reminderSummary, setReminderSummary] = useState<{
        sent: number;
        skipped: number;
        failed: number;
        whatsapp: number;
        email: number;
    } | null>(null);

    // Active filters count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (staffFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        if (showCancelled) count++;
        return count;
    }, [showCancelled, staffFilter, statusFilter]);

    const visibleBookings = useMemo(() => {
        if (showCancelled || statusFilter === "CANCELLED") {
            return bookings;
        }

        return bookings.filter((booking) => booking.status !== "CANCELLED");
    }, [bookings, showCancelled, statusFilter]);

    const selectedStaffLabel = useMemo(() => {
        if (isStaffRole) {
            return staffList[0]?.display_name ?? t("adminBookings.allStaff");
        }
        if (staffFilter === "ALL") return t("adminBookings.allStaff");
        return staffList.find((staff) => staff.id.toString() === staffFilter)?.display_name ?? t("adminBookings.allStaff");
    }, [isStaffRole, staffFilter, staffList, t]);

    const selectedStatusLabel = useMemo(() => {
        const option = STATUS_OPTIONS.find((item) => item.value === statusFilter);
        return option ? t(option.label) : t("adminBookings.allStatuses");
    }, [statusFilter, t]);

    // Clear all filters
    const clearFilters = () => {
        setStaffFilter("ALL");
        setStatusFilter("ALL");
        setShowCancelled(false);
    };

    // Fetch staff, services, and hours on mount
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchDropdownData = async () => {
            try {
                if (isStaffRole) {
                    const [servicesData, myStaffProfile] = await Promise.all([
                        getServices(),
                        getMyStaffProfile(),
                    ]);
                    setServiceList(servicesData);
                    setStaffList([
                        {
                            id: myStaffProfile.id,
                            display_name: myStaffProfile.display_name,
                            bio: myStaffProfile.bio,
                            image_url: myStaffProfile.image_url ?? undefined,
                            is_bookable: myStaffProfile.is_bookable,
                            status: myStaffProfile.status,
                            services: myStaffProfile.services || [],
                            created_at: "",
                            updated_at: "",
                            user: {
                                id: myStaffProfile.user.id,
                                email: myStaffProfile.user.email,
                                name: myStaffProfile.user.name,
                                first_name: myStaffProfile.user.first_name,
                                last_name: myStaffProfile.user.last_name,
                                phoneNumber: myStaffProfile.user.phoneNumber,
                                phone_prefix: myStaffProfile.user.phone_prefix,
                            },
                        },
                    ]);
                    setBusinessHours([]);
                    return;
                }

                const [staffData, servicesData, hoursData] = await Promise.all([getStaff(), getServices(), getHours()]);
                setStaffList(staffData);
                setServiceList(servicesData);
                setBusinessHours(hoursData);
            } catch (err) {
                console.error("Failed to fetch dropdown data:", err);
            }
        };

        fetchDropdownData();
    }, [isAuthenticated, isStaffRole]);

    // Fetch bookings when date or filters change
    const fetchBookings = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const rangeStart = startOfDay(currentDate);
            const startDate = viewMode === "month" ? startOfMonth(rangeStart) : rangeStart;
            const endDate = viewMode === "month"
                ? endOfMonth(rangeStart)
                : endOfDay(addDays(rangeStart, dayCount - 1));

            const params: Parameters<typeof getBookings>[0] = {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            };

            // Add staff filter to API call if selected
            if (staffFilter !== "ALL") {
                params.staff_id = parseInt(staffFilter);
            }

            if (statusFilter !== "ALL") {
                params.status = statusFilter;
            }

            const data = await getBookings(params);
            setBookings(data);
        } catch (err) {
            console.error("Failed to fetch bookings:", err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, currentDate, dayCount, staffFilter, statusFilter, viewMode]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (isStaffRole) {
            setViewMode("list");
        }
    }, [isStaffRole]);

    // Navigation handlers
    const handleNext = () =>
        setCurrentDate((prev) => startOfDay(viewMode === "month" ? addMonths(prev, 1) : addDays(prev, dayCount)));
    const handlePrev = () =>
        setCurrentDate((prev) => startOfDay(viewMode === "month" ? subMonths(prev, 1) : subDays(prev, dayCount)));
    const handleToday = () => setCurrentDate(startOfDay(new Date()));

    const handleBookingClick = (booking: AdminBooking) => {
        setSelectedBooking(booking);
        setIsDetailOpen(true);
    };

    const handleCreateBooking = async (data: CreateBookingData) => {
        try {
            await createBooking(data);
            await fetchBookings();
            setIsNewBookingOpen(false);
            await notify.success(t("adminBookings.createdSuccess"), t("adminBookings.createdSuccessNext"));
        } catch (err) {
            console.error("Failed to create booking:", err);
            throw err;
        }
    };

    const handleCreateRecurringBookings = async (data: CreateRecurringBookingData) => {
        try {
            await createRecurringBookings(data);
            await fetchBookings();
            setIsNewBookingOpen(false);
            await notify.success(t("adminBookings.recurringCreatedSuccess"), t("adminBookings.createdSuccessNext"));
        } catch (err) {
            console.error("Failed to create recurring bookings:", err);
            throw err;
        }
    };

    const handleStatusUpdate = async (id: number, status: AdminBooking['status']) => {
        try {
            const updatedBooking = await updateBooking(id, { status });

            setBookings(prev => prev.map(b => b.id === id ? updatedBooking : b));

            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking(updatedBooking);
            }

            if (status === 'CANCELLED' || status === 'COMPLETED') {
                setIsDetailOpen(false);
            }
        } catch (err) {
            console.error("Failed to update booking status:", err);
            throw err;
        }
    };

    const handleMarkNoShow = async (id: number) => {
        const sourceBooking =
            bookings.find((booking) => booking.id === id) ||
            (selectedBooking?.id === id ? selectedBooking : null);

        const updatedBooking = await updateBooking(id, {
            status: "NO_SHOW",
            notes: sourceBooking?.notes,
        });

        setBookings((prev) => prev.map((booking) => (booking.id === id ? updatedBooking : booking)));

        if (selectedBooking && selectedBooking.id === id) {
            setSelectedBooking(updatedBooking);
        }
    };

    const handleSendNoShowNotification = async (
        id: number,
        payload: { channel: NoShowNotificationChannel; message?: string }
    ) => {
        if (!canSendTransactionalNotifications) {
            throw new Error(
                t("entitlements.requiresProduct", {
                    productName: transactionalMessagingRecommendation.requestLabel,
                }),
            );
        }
        const result = await sendNoShowNotification(id, payload);
        if (result.status !== "SENT") {
            throw new Error(result.reason || t("adminBookings.noShowNotificationError"));
        }
    };

    const handleSendTodayReminders = useCallback(async () => {
        if (isSendingReminders) return;
        if (!canSendReminders) {
            return;
        }

        setReminderSummary(null);
        setReminderStatusText(null);
        setReminderProgress(0);
        setReminderCurrent(0);
        setReminderTotal(0);

        try {
            const preview = await getTodayReminderPreview();
            const queue = preview.items.filter(
                (item) => item.channel !== "NONE" && !item.already_sent_recently
            );

            if (queue.length === 0) {
                setReminderProgress(100);
                setReminderTotal(preview.total);
                setReminderStatusText(t("adminBookings.remindersNothingToSend"));
                setReminderSummary({
                    sent: 0,
                    skipped: preview.total,
                    failed: 0,
                    whatsapp: 0,
                    email: 0,
                });
                return;
            }

            setIsSendingReminders(true);
            setReminderTotal(queue.length);

            const counters = {
                sent: 0,
                skipped: 0,
                failed: 0,
                whatsapp: 0,
                email: 0,
            };

            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                const result = await sendTodayReminder(item.booking_id);

                if (result.status === "SENT") {
                    counters.sent += 1;
                    if (result.channel === "WHATSAPP") counters.whatsapp += 1;
                    if (result.channel === "EMAIL") counters.email += 1;
                } else if (result.status === "SKIPPED") {
                    counters.skipped += 1;
                } else {
                    counters.failed += 1;
                }

                const current = i + 1;
                setReminderCurrent(current);
                setReminderProgress(Math.round((current / queue.length) * 100));
                setReminderStatusText(
                    t("adminBookings.remindersSendingProgress", {
                        current,
                        total: queue.length,
                    })
                );

                // Extra client pacing to avoid hammering reminder endpoints.
                if (i < queue.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 220));
                }
            }

            setReminderSummary(counters);
            setReminderStatusText(t("adminBookings.remindersDone"));
        } catch (err) {
            setReminderStatusText(
                err instanceof Error ? err.message : t("adminBookings.remindersFailed")
            );
        } finally {
            setIsSendingReminders(false);
        }
    }, [canSendReminders, isSendingReminders, t]);

    // Date range label
    const dateRangeLabel = useMemo(() => {
        if (viewMode === "month") {
            return format(currentDate, "MMMM yyyy", { locale: dateFnsLocale });
        }
        if (dayCount === 1) {
            return format(currentDate, "EEEE, PPP", { locale: dateFnsLocale });
        }
        const endDate = addDays(currentDate, dayCount - 1);
        return `${format(currentDate, "MMM d", { locale: dateFnsLocale })} - ${format(endDate, "PPP", { locale: dateFnsLocale })}`;
    }, [currentDate, dayCount, viewMode, dateFnsLocale]);

    const operationsSummary = useMemo(() => {
        const today = new Date();
        return {
            total: visibleBookings.length,
            today: visibleBookings.filter((booking) => isSameDay(new Date(booking.start_at), today)).length,
            pending: visibleBookings.filter((booking) => booking.status === "PENDING").length,
            confirmed: visibleBookings.filter((booking) => booking.status === "CONFIRMED").length,
        };
    }, [visibleBookings]);

    if (!isAuthenticated) return null;

    return (
        <AdminPageShell className="h-full max-w-[1600px]" contentClassName="gap-4 sm:gap-5">
            <AdminPageHeader
                eyebrow={t("adminBookings.operationsEyebrow")}
                title={t("adminBookings.title")}
                subtitle={t("adminBookings.subtitle")}
                meta={
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="brand" dot>
                            {dateRangeLabel}
                        </StatusBadge>
                        <StatusBadge tone={operationsSummary.pending > 0 ? "warning" : "neutral"} dot>
                            {t("adminBookings.pendingCount", { count: operationsSummary.pending })}
                        </StatusBadge>
                        <StatusBadge tone="success" dot>
                            {t("adminBookings.confirmedCount", { count: operationsSummary.confirmed })}
                        </StatusBadge>
                    </div>
                }
                actions={
                    <>
                        {!isStaffRole ? (
                            <>
                                {canSendReminders ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => void handleSendTodayReminders()}
                                        disabled={isSendingReminders}
                                        className="w-full border-admin-border-strong bg-admin-surface text-admin-brand hover:bg-admin-brand-soft sm:w-auto"
                                    >
                                        {isSendingReminders ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <BellRing className="h-4 w-4" />
                                        )}
                                        {t("adminBookings.sendTodayReminders")}
                                    </Button>
                                ) : (
                                    <LockedFeatureButton
                                        capability="MENSAJERIA_REMINDERS"
                                        title={t("entitlements.requiresProduct", {
                                            productName: remindersRecommendation.requestLabel,
                                        })}
                                        description={t("adminSettings.communicationAutomationDesc")}
                                        buttonLabel={t("adminBookings.sendTodayReminders")}
                                        source="ADMIN_LOCKED_PAGE"
                                        className="border-admin-border-strong"
                                    />
                                )}
                            </>
                        ) : null}

                        <Button onClick={() => setIsNewBookingOpen(true)} className="w-full bg-admin-brand text-white shadow-sm hover:bg-admin-brand-hover sm:w-auto">
                            <Plus className="h-4 w-4" /> {t("adminBookings.newBooking")}
                        </Button>
                    </>
                }
            />

            {!isStaffRole && (isSendingReminders || reminderSummary || reminderStatusText) && (
                <ProgressPanel
                    title={t("adminBookings.remindersProgress")}
                    description={reminderStatusText ?? undefined}
                    progress={reminderProgress}
                    progressLabel={
                        isSendingReminders
                            ? `${reminderCurrent}/${reminderTotal || 0}`
                            : `${reminderProgress}%`
                    }
                    metrics={reminderSummary ? [
                        {
                            label: t("adminBookings.remindersSent"),
                            value: reminderSummary.sent,
                            tone: "success",
                        },
                        {
                            label: t("adminBookings.remindersSkipped"),
                            value: reminderSummary.skipped,
                            tone: "warning",
                        },
                        {
                            label: t("adminBookings.remindersFailedShort"),
                            value: reminderSummary.failed,
                            tone: "danger",
                        },
                        {
                            label: t("adminBookings.remindersWhatsapp"),
                            value: reminderSummary.whatsapp,
                            tone: "info",
                        },
                        {
                            label: t("adminBookings.remindersEmail"),
                            value: reminderSummary.email,
                            tone: "brand",
                        },
                    ] : undefined}
                />
            )}

            <AdminMetricGrid className="xl:grid-cols-3">
                <StatCard
                    label={t("adminBookings.inView")}
                    value={operationsSummary.total}
                    icon={<CalendarDays className="h-5 w-5" />}
                    iconClassName="bg-admin-brand-soft text-admin-brand-soft-text"
                />
                <StatCard
                    label={t("adminBookings.today")}
                    value={operationsSummary.today}
                    icon={<Clock3 className="h-5 w-5" />}
                    iconClassName="bg-sky-50 text-sky-700"
                />
                <StatCard
                    label={t("adminBookings.scope")}
                    value={<span className="block truncate text-base sm:text-2xl">{selectedStaffLabel}</span>}
                    hint={selectedStatusLabel}
                    icon={<Users className="h-5 w-5" />}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
            </AdminMetricGrid>

            <DataToolbar
                className="items-stretch p-3 lg:items-center"
                filters={
                    <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t("adminBookings.viewMode")}
                            </span>
                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "month" | "list")} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-3 rounded-lg bg-admin-surface-subtle sm:w-auto">
                                    <TabsTrigger value="calendar" className="min-h-9 rounded-md px-3">
                                        <CalendarIcon className="h-4 w-4" /> {t("adminBookings.calendar")}
                                    </TabsTrigger>
                                    <TabsTrigger value="month" className="min-h-9 rounded-md px-3">
                                        <CalendarDays className="h-4 w-4" /> {t("adminBookings.month")}
                                    </TabsTrigger>
                                    <TabsTrigger value="list" className="min-h-9 rounded-md px-3">
                                        <ListIcon className="h-4 w-4" /> {t("adminBookings.list")}
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {viewMode === "calendar" && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {t("adminBookings.rangeControl")}
                                </span>
                                <div className="grid grid-cols-3 gap-1 rounded-lg border border-admin-border bg-admin-surface-subtle p-1 sm:flex">
                                    {([1, 3, 7] as DayCount[]).map((count) => (
                                        <Button
                                            key={count}
                                            variant={dayCount === count ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => setDayCount(count)}
                                            className={dayCount === count ? "bg-admin-brand text-white hover:bg-admin-brand-hover" : "text-slate-600 hover:bg-white hover:text-slate-950"}
                                        >
                                            {count === 1 ? t("adminBookings.day") : t("adminBookings.days", { count })}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                }
                actions={
                    <div className="flex w-full flex-col gap-1.5 sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("adminBookings.dateNavigation")}
                        </span>
                        <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 sm:flex">
                            <Button variant="outline" size="icon" onClick={handlePrev} className="border-admin-border-strong bg-admin-surface">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-0 rounded-md border border-admin-border bg-white px-3 py-2 text-center">
                                <p className="truncate text-sm font-semibold text-slate-950">{dateRangeLabel}</p>
                            </div>
                            <Button variant="outline" size="icon" onClick={handleNext} className="border-admin-border-strong bg-admin-surface">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleToday} className="col-span-3 text-slate-600 hover:text-slate-950 sm:col-span-1">
                                {t("shopBooking.today")}
                            </Button>
                        </div>
                    </div>
                }
            />

            <DataToolbar
                className="p-3"
                summary={
                    <span className="inline-flex items-center gap-2">
                        <Filter className="h-4 w-4 text-admin-brand" />
                        {activeFilterCount > 0
                            ? t("adminBookings.activeFilters", { count: activeFilterCount })
                            : t("adminBookings.allOperationalFilters")}
                    </span>
                }
                filters={
                    <>
                        {!isStaffRole && (
                            <div className="flex w-full flex-col gap-1 sm:w-auto">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {t("adminBookings.teamFilter")}
                                </span>
                                <Select value={staffFilter} onValueChange={setStaffFilter}>
                                    <SelectTrigger className="h-9 w-full bg-white sm:w-[190px]">
                                        <SelectValue placeholder={t("adminBookings.allStaff")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">{t("adminBookings.allStaff")}</SelectItem>
                                        {staffList
                                            .filter(s => s.is_bookable)
                                            .map(staff => (
                                                <SelectItem key={staff.id} value={staff.id.toString()}>
                                                    {staff.display_name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex w-full flex-col gap-1 sm:w-auto">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t("adminBookings.statusFilter")}
                            </span>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "ALL")}>
                                <SelectTrigger className="h-9 w-full bg-white sm:w-[180px]">
                                    <SelectValue placeholder={t("adminBookings.allStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {t(opt.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <label className="mt-auto flex min-h-9 items-center gap-2 rounded-md border border-admin-border bg-white px-3 text-sm text-slate-700">
                            <Checkbox
                                checked={showCancelled}
                                onCheckedChange={(checked) => setShowCancelled(checked === true)}
                            />
                            <span>ver canceladas</span>
                        </label>

                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-auto text-slate-500 hover:text-slate-950"
                            >
                                <X className="h-3 w-3" />
                                {t("adminBookings.clear", { count: activeFilterCount })}
                            </Button>
                        )}
                    </>
                }
            />

            {/* Main Content Area */}
            <div className="relative min-h-[500px] flex-1">
                {loading ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
                        <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
                    </div>
                ) : null}

                {viewMode === "calendar" ? (
                    <BookingCalendarView
                        bookings={visibleBookings}
                        currentDate={currentDate}
                        dayCount={dayCount}
                        onBookingClick={handleBookingClick}
                        businessHours={businessHours}
                    />
                ) : viewMode === "month" ? (
                    <BookingMonthView
                        bookings={visibleBookings}
                        currentDate={currentDate}
                        onBookingClick={handleBookingClick}
                    />
                ) : (
                    <BookingListView
                        bookings={visibleBookings}
                        currency={currency}
                        onBookingClick={handleBookingClick}
                        onStatusUpdate={handleStatusUpdate}
                    />
                )}
            </div>

            {/* Modals */}
            <NewBookingModal
                isOpen={isNewBookingOpen}
                onClose={() => setIsNewBookingOpen(false)}
                staffList={staffList}
                serviceList={serviceList}
                currency={currency}
                fixedStaffId={isStaffRole ? staffList[0]?.id ?? null : null}
                allowExistingCustomerSelection={!isStaffRole}
                onCreate={handleCreateBooking}
                onCreateRecurring={handleCreateRecurringBookings}
            />

            <BookingDetailSheet
                booking={selectedBooking}
                isOpen={isDetailOpen}
                currency={currency}
                onClose={() => setIsDetailOpen(false)}
                onStatusUpdate={handleStatusUpdate}
                onMarkNoShow={handleMarkNoShow}
                onSendNoShowNotification={handleSendNoShowNotification}
                canSendNoShowNotification={canSendTransactionalNotifications}
                noShowNotificationUpgradeMessage={t("entitlements.requiresProduct", {
                    productName: transactionalMessagingRecommendation.requestLabel,
                })}
                onRefresh={fetchBookings}
            />
        </AdminPageShell>
    );
}
