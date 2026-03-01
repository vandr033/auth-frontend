"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { format, addDays, addMonths, endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import {
    Calendar as CalendarIcon,
    List as ListIcon,
    Plus,
    BellRing,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Filter,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    updateBooking,
    getStaff,
    getServices,
    getHours,
    getTodayReminderPreview,
    sendTodayReminder,
    sendNoShowNotification,
    StaffMember,
    ServiceItem,
    CreateBookingData,
    DaySchedule,
} from "@/app/admin/lib/adminApi";
import type { NoShowNotificationChannel } from "@/app/admin/lib/adminApi";
import { appendNoShowMarker, isNoShowBooking } from "./lib/bookingStatus";

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
    const { isAuthenticated, role } = useAdminAuth();
    const t = useT();
    const isStaffRole = role === "STAFF";

    // View State
    const [viewMode, setViewMode] = useState<"calendar" | "month" | "list">(isStaffRole ? "list" : "calendar");
    const [dayCount, setDayCount] = useState<DayCount>(7);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filters
    const [staffFilter, setStaffFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");

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
        return count;
    }, [staffFilter, statusFilter]);

    // Clear all filters
    const clearFilters = () => {
        setStaffFilter("ALL");
        setStatusFilter("ALL");
    };

    // Fetch staff, services, and hours on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        if (isStaffRole) return;

        const fetchDropdownData = async () => {
            try {
                const [staffData, servicesData, hoursData] = await Promise.all([
                    getStaff(),
                    getServices(),
                    getHours(),
                ]);
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
            const startDate = viewMode === "month" ? startOfMonth(currentDate) : currentDate;
            const endDate = viewMode === "month"
                ? endOfMonth(currentDate)
                : addDays(currentDate, dayCount - 1);

            const params: Parameters<typeof getBookings>[0] = {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            };

            // Add staff filter to API call if selected
            if (staffFilter !== "ALL") {
                params.staff_id = parseInt(staffFilter);
            }

            // Backend currently persists no-shows as cancelled + marker in notes.
            // Fetch cancelled records for both CANCELLED and NO_SHOW filters, then split locally.
            if (statusFilter === "CANCELLED" || statusFilter === "NO_SHOW") {
                params.status = "CANCELLED";
            } else if (statusFilter !== "ALL") {
                params.status = statusFilter;
            }

            const data = await getBookings(params);
            const filteredData = data.filter((booking) => {
                if (statusFilter === "NO_SHOW") {
                    return isNoShowBooking(booking);
                }
                if (statusFilter === "CANCELLED") {
                    return booking.status === "CANCELLED" && !isNoShowBooking(booking);
                }
                return true;
            });

            setBookings(filteredData);
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
        setCurrentDate((prev) => (viewMode === "month" ? addMonths(prev, 1) : addDays(prev, dayCount)));
    const handlePrev = () =>
        setCurrentDate((prev) => (viewMode === "month" ? subMonths(prev, 1) : subDays(prev, dayCount)));
    const handleToday = () => setCurrentDate(new Date());

    const handleBookingClick = (booking: AdminBooking) => {
        setSelectedBooking(booking);
        setIsDetailOpen(true);
    };

    const handleCreateBooking = async (data: CreateBookingData) => {
        try {
            const newBooking = await createBooking(data);
            setBookings(prev => [...prev, newBooking]);
            setIsNewBookingOpen(false);
        } catch (err) {
            console.error("Failed to create booking:", err);
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
            status: "CANCELLED",
            notes: appendNoShowMarker(sourceBooking?.notes),
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
        const result = await sendNoShowNotification(id, payload);
        if (result.status !== "SENT") {
            throw new Error(result.reason || t("adminBookings.noShowNotificationError"));
        }
    };

    const handleSendTodayReminders = useCallback(async () => {
        if (isSendingReminders) return;

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
    }, [isSendingReminders, t]);

    // Date range label
    const dateRangeLabel = useMemo(() => {
        if (viewMode === "month") {
            return format(currentDate, "MMMM yyyy");
        }
        if (dayCount === 1) {
            return format(currentDate, "EEEE, MMM d, yyyy");
        }
        const endDate = addDays(currentDate, dayCount - 1);
        return `${format(currentDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }, [currentDate, dayCount, viewMode]);

    if (!isAuthenticated) return null;

    return (
        <div className="flex flex-col h-full min-h-[calc(100dvh-4rem)] space-y-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">

            {/* Header Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">{t('adminBookings.title')}</h1>
                    <p className="text-text-muted">{t('adminBookings.subtitle')}</p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {!isStaffRole && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => void handleSendTodayReminders()}
                                disabled={isSendingReminders}
                                className="w-full border-brand/30 text-brand hover:bg-brand/5 sm:w-auto"
                            >
                                {isSendingReminders ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <BellRing className="mr-2 h-4 w-4" />
                                )}
                                {t('adminBookings.sendTodayReminders')}
                            </Button>

                            <Button onClick={() => setIsNewBookingOpen(true)} className="w-full bg-brand text-white hover:bg-brand-hover shadow-sm sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" /> {t('adminBookings.newBooking')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {!isStaffRole && (isSendingReminders || reminderSummary || reminderStatusText) && (
                <div className="rounded-lg border border-surface-border bg-surface p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-text-main">{t("adminBookings.remindersProgress")}</span>
                        <span className="text-text-muted">
                            {isSendingReminders
                                ? `${reminderCurrent}/${reminderTotal || 0}`
                                : `${reminderProgress}%`}
                        </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${Math.max(0, Math.min(100, reminderProgress))}%` }}
                        />
                    </div>

                    {reminderStatusText && (
                        <p className="mt-2 text-xs text-text-muted">{reminderStatusText}</p>
                    )}

                    {reminderSummary && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                            <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                                {t("adminBookings.remindersSent")}: {reminderSummary.sent}
                            </div>
                            <div className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                                {t("adminBookings.remindersSkipped")}: {reminderSummary.skipped}
                            </div>
                            <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                                {t("adminBookings.remindersFailedShort")}: {reminderSummary.failed}
                            </div>
                            <div className="rounded-md bg-cyan-50 px-2 py-1 text-cyan-700">
                                WhatsApp: {reminderSummary.whatsapp}
                            </div>
                            <div className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">
                                Email: {reminderSummary.email}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col gap-3 bg-surface p-3 rounded-lg border border-surface-border shadow-sm">
                {/* Top Row: View & Day Toggles */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* View Mode & Day Count */}
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "month" | "list")} className="w-full sm:w-auto">
                            <TabsList className="grid w-full grid-cols-3 sm:flex">
                                <TabsTrigger value="calendar" className="px-3">
                                    <CalendarIcon className="mr-2 h-4 w-4" /> {t('adminBookings.calendar')}
                                </TabsTrigger>
                                <TabsTrigger value="month" className="px-3">
                                    Mes
                                </TabsTrigger>
                                <TabsTrigger value="list" className="px-3">
                                    <ListIcon className="mr-2 h-4 w-4" /> {t('adminBookings.list')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {viewMode === "calendar" && (
                            <div className="ml-0 flex items-center gap-1 sm:ml-2">
                                {([1, 3, 7] as DayCount[]).map((count) => (
                                    <Button
                                        key={count}
                                        variant={dayCount === count ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setDayCount(count)}
                                        className={dayCount === count ? "bg-brand hover:bg-brand-hover" : ""}
                                    >
                                        {count === 1 ? t('adminBookings.day') : t('adminBookings.days', { count })}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Date Navigation */}
                    <div className="w-full sm:w-auto">
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                            <Button variant="outline" size="icon" onClick={handlePrev} className="shrink-0">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-0 flex-1 text-center text-sm font-medium sm:hidden">
                                {dateRangeLabel}
                            </div>
                            <Button variant="outline" size="icon" onClick={handleNext} className="shrink-0">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleToday} className="shrink-0 text-xs text-text-muted">
                                {t('shopBooking.today')}
                            </Button>
                        </div>
                        <div className="mt-1 hidden min-w-[180px] text-center text-sm font-medium sm:block">
                            {dateRangeLabel}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center border-t border-surface-border pt-3">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Filter className="h-4 w-4" />
                        <span>{t('adminBookings.filters')}</span>
                    </div>

                    <div className="flex w-full items-center gap-2 flex-wrap">
                        {/* Staff Filter */}
                        {!isStaffRole && (
                            <Select value={staffFilter} onValueChange={setStaffFilter}>
                                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                                    <SelectValue placeholder={t('adminBookings.allStaff')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t('adminBookings.allStaff')}</SelectItem>
                                    {staffList
                                        .filter(s => s.is_bookable)
                                        .map(staff => (
                                            <SelectItem key={staff.id} value={staff.id.toString()}>
                                                {staff.display_name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "ALL")}>
                            <SelectTrigger className="h-9 w-full sm:w-[150px]">
                                <SelectValue placeholder={t('adminBookings.allStatuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {t(opt.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-xs text-text-muted hover:text-text-main"
                            >
                                <X className="h-3 w-3 mr-1" />
                                {t('adminBookings.clear', { count: activeFilterCount })}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-[500px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    </div>
                ) : null}

                {viewMode === "calendar" ? (
                    <BookingCalendarView
                        bookings={bookings}
                        currentDate={currentDate}
                        dayCount={dayCount}
                        onBookingClick={handleBookingClick}
                        businessHours={businessHours}
                    />
                ) : viewMode === "month" ? (
                    <BookingMonthView
                        bookings={bookings}
                        currentDate={currentDate}
                        onBookingClick={handleBookingClick}
                    />
                ) : (
                    <BookingListView
                        bookings={bookings}
                        onBookingClick={handleBookingClick}
                    />
                )}
            </div>

            {/* Modals */}
            {!isStaffRole && (
                <NewBookingModal
                    isOpen={isNewBookingOpen}
                    onClose={() => setIsNewBookingOpen(false)}
                    staffList={staffList}
                    serviceList={serviceList}
                    onCreate={handleCreateBooking}
                />
            )}

            <BookingDetailSheet
                booking={selectedBooking}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onStatusUpdate={handleStatusUpdate}
                onMarkNoShow={handleMarkNoShow}
                onSendNoShowNotification={handleSendNoShowNotification}
                onRefresh={fetchBookings}
            />
        </div>
    );
}
