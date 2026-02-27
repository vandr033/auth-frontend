"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { format, addDays, subDays } from "date-fns";
import {
    Calendar as CalendarIcon,
    List as ListIcon,
    Plus,
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
    StaffMember,
    ServiceItem,
    CreateBookingData,
    DaySchedule,
} from "@/app/admin/lib/adminApi";

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
    const [viewMode, setViewMode] = useState<"calendar" | "list">(isStaffRole ? "list" : "calendar");
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
            const endDate = addDays(currentDate, dayCount - 1);

            const params: Parameters<typeof getBookings>[0] = {
                start: currentDate.toISOString(),
                end: endDate.toISOString(),
            };

            // Add staff filter to API call if selected
            if (staffFilter !== "ALL") {
                params.staff_id = parseInt(staffFilter);
            }

            // Add status filter to API call if selected
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
    }, [isAuthenticated, currentDate, dayCount, staffFilter, statusFilter]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (isStaffRole) {
            setViewMode("list");
        }
    }, [isStaffRole]);

    // Navigation handlers
    const handleNext = () => setCurrentDate(prev => addDays(prev, dayCount));
    const handlePrev = () => setCurrentDate(prev => subDays(prev, dayCount));
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

    // Date range label
    const dateRangeLabel = useMemo(() => {
        if (dayCount === 1) {
            return format(currentDate, "EEEE, MMM d, yyyy");
        }
        const endDate = addDays(currentDate, dayCount - 1);
        return `${format(currentDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }, [currentDate, dayCount]);

    if (!isAuthenticated) return null;

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] space-y-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">

            {/* Header Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">{t('adminBookings.title')}</h1>
                    <p className="text-text-muted">{t('adminBookings.subtitle')}</p>
                </div>

                <div className="flex items-center gap-2">
                    {!isStaffRole && (
                        <Button onClick={() => setIsNewBookingOpen(true)} className="bg-brand text-white hover:bg-brand-hover shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> {t('adminBookings.newBooking')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 bg-surface p-3 rounded-lg border border-surface-border shadow-sm">
                {/* Top Row: View & Day Toggles */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* View Mode & Day Count */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")} className="w-auto">
                            <TabsList>
                                <TabsTrigger value="calendar" className="px-3">
                                    <CalendarIcon className="mr-2 h-4 w-4" /> {t('adminBookings.calendar')}
                                </TabsTrigger>
                                <TabsTrigger value="list" className="px-3">
                                    <ListIcon className="mr-2 h-4 w-4" /> {t('adminBookings.list')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {viewMode === "calendar" && (
                            <div className="flex items-center gap-1 ml-2">
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
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-[180px] text-center font-medium text-sm">
                            {dateRangeLabel}
                        </div>
                        <Button variant="outline" size="icon" onClick={handleNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs text-text-muted">
                            {t('shopBooking.today')}
                        </Button>
                    </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center border-t border-surface-border pt-3">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Filter className="h-4 w-4" />
                        <span>{t('adminBookings.filters')}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Staff Filter */}
                        {!isStaffRole && (
                            <Select value={staffFilter} onValueChange={setStaffFilter}>
                                <SelectTrigger className="w-[160px] h-9">
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
                            <SelectTrigger className="w-[150px] h-9">
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
                onRefresh={fetchBookings}
            />
        </div>
    );
}
