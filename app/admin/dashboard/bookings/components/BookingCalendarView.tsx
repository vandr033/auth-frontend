"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { format, addDays, isSameDay, parseISO, differenceInMinutes } from "date-fns";
import { AdminBooking } from "@/types/admin-booking";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { type DaySchedule } from "@/app/admin/lib/adminApi";
import { getBookingDisplayStatus } from "../lib/bookingStatus";

interface BookingCalendarViewProps {
    bookings: AdminBooking[];
    currentDate: Date;
    dayCount: 1 | 3 | 7;
    onBookingClick: (booking: AdminBooking) => void;
    businessHours?: DaySchedule[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 60; // px per hour

// Staff color palette
const STAFF_COLORS = [
    { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
    { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
    { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500" },
    { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
    { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500" },
    { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
    { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
    { bg: "bg-admin-brand-soft", text: "text-admin-brand-soft-text", border: "border-admin-border-strong", dot: "bg-admin-brand" },
];

const SERVICE_COLORS = [
    "border-l-rose-500",
    "border-l-blue-500",
    "border-l-emerald-500",
    "border-l-amber-500",
    "border-l-purple-500",
    "border-l-cyan-500",
    "border-l-fuchsia-500",
    "border-l-lime-500",
];

const SERVICE_DOT_COLORS = [
    "bg-rose-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-fuchsia-500",
    "bg-lime-500",
];

const STATUS_BADGES: Record<string, string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-emerald-500",
    COMPLETED: "bg-blue-500",
    CANCELLED: "bg-rose-500",
    NO_SHOW: "bg-gray-500",
};

interface OverlapLayout {
    column: number;
    totalColumns: number;
}

/**
 * Compute overlapping layout using a greedy column assignment algorithm.
 * Groups bookings that overlap in time and assigns each a column.
 */
function computeOverlapLayout(bookings: AdminBooking[]): Map<number, OverlapLayout> {
    if (bookings.length === 0) return new Map();

    // Sort by start time, then by end time (longer first)
    const sorted = [...bookings].sort((a, b) => {
        const diff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        if (diff !== 0) return diff;
        return new Date(b.end_at).getTime() - new Date(a.end_at).getTime();
    });

    // For each booking, track which column it's assigned to
    const assignments = new Map<number, { column: number; group: number[] }>();
    // Process bookings to find overlapping groups
    for (let i = 0; i < sorted.length; i++) {
        const booking = sorted[i];
        const startTime = new Date(booking.start_at).getTime();
        const endTime = new Date(booking.end_at).getTime();

        // Find overlapping bookings already placed
        const overlapping: number[] = [];
        const usedColumns = new Set<number>();

        for (const [id, assignment] of assignments) {
            const otherBooking = sorted.find(b => b.id === id)!;
            const otherStart = new Date(otherBooking.start_at).getTime();
            const otherEnd = new Date(otherBooking.end_at).getTime();

            if (startTime < otherEnd && endTime > otherStart) {
                overlapping.push(id);
                usedColumns.add(assignment.column);
            }
        }

        // Assign to the first available column
        let column = 0;
        while (usedColumns.has(column)) column++;

        assignments.set(booking.id, { column, group: [] });
    }

    // Now calculate totalColumns for each booking (max columns in its overlap group)
    const result = new Map<number, OverlapLayout>();

    for (const booking of sorted) {
        const startTime = new Date(booking.start_at).getTime();
        const endTime = new Date(booking.end_at).getTime();
        const myColumn = assignments.get(booking.id)!.column;

        // Find all bookings that overlap with this one
        let maxColumn = myColumn;
        for (const other of sorted) {
            if (other.id === booking.id) continue;
            const otherStart = new Date(other.start_at).getTime();
            const otherEnd = new Date(other.end_at).getTime();

            if (startTime < otherEnd && endTime > otherStart) {
                const otherColumn = assignments.get(other.id)!.column;
                if (otherColumn > maxColumn) maxColumn = otherColumn;
            }
        }

        result.set(booking.id, {
            column: myColumn,
            totalColumns: maxColumn + 1,
        });
    }

    return result;
}

export function BookingCalendarView({ bookings, currentDate, dayCount, onBookingClick, businessHours = [] }: BookingCalendarViewProps) {
    const { t, locale } = useI18n();
    const dateFnsLocale = getDateLocale(locale);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Generate days array based on dayCount
    const days = useMemo(() => {
        return Array.from({ length: dayCount }, (_, i) => addDays(currentDate, i));
    }, [currentDate, dayCount]);

    // Build staff color map
    const staffColorMap = useMemo(() => {
        const uniqueStaffIds = [...new Set(bookings.map(b => b.staff.id))];
        const map = new Map<number, typeof STAFF_COLORS[0]>();
        uniqueStaffIds.forEach((id, index) => {
            map.set(id, STAFF_COLORS[index % STAFF_COLORS.length]);
        });
        return map;
    }, [bookings]);

    // Build staff legend
    const staffLegend = useMemo(() => {
        const seen = new Map<number, string>();
        bookings.forEach(b => {
            if (!seen.has(b.staff.id)) {
                seen.set(b.staff.id, b.staff.name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({
            id,
            name,
            color: staffColorMap.get(id)!,
        }));
    }, [bookings, staffColorMap]);

    // Build service legend
    const serviceLegend = useMemo(() => {
        const seen = new Map<number, string>();
        bookings.forEach(b => {
            const svc = b.services[0];
            if (svc && !seen.has(svc.id)) {
                seen.set(svc.id, svc.name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({
            id,
            name,
            colorClass: SERVICE_COLORS[id % SERVICE_COLORS.length],
            dotClass: SERVICE_DOT_COLORS[id % SERVICE_DOT_COLORS.length],
        }));
    }, [bookings]);

    // Calculate earliest opening hour across all days with business hours
    const earliestOpenHour = useMemo(() => {
        if (businessHours.length === 0) return 8; // Default to 8 AM

        let earliest = 24;
        businessHours.forEach(day => {
            if (day.is_open && day.slots.length > 0) {
                day.slots.forEach(slot => {
                    const hour = parseInt(slot.start_time.split(':')[0], 10);
                    if (hour < earliest) earliest = hour;
                });
            }
        });

        // Return 1 hour before earliest, minimum 0
        return earliest === 24 ? 8 : Math.max(0, earliest - 1);
    }, [businessHours]);

    // Auto-scroll to earliest opening hour on mount and when businessHours change
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollPosition = earliestOpenHour * ROW_HEIGHT;
            scrollContainerRef.current.scrollTop = scrollPosition;
        }
    }, [earliestOpenHour]);

    const getBookingStyle = (booking: AdminBooking, layout?: OverlapLayout) => {
        const start = parseISO(booking.start_at);
        const end = parseISO(booking.end_at);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const duration = differenceInMinutes(end, start) / 60;

        const top = `${startHour * ROW_HEIGHT}px`;
        const height = `${Math.max(duration * ROW_HEIGHT, 24)}px`;

        if (layout && layout.totalColumns > 1) {
            const colWidth = 100 / layout.totalColumns;
            const left = `${layout.column * colWidth}%`;
            const width = `${colWidth}%`;
            return { top, height, left, width, right: "auto" };
        }

        return { top, height, left: "4px", right: "4px" };
    };

    /** True when the booking block is tall enough for multiple lines */
    const isCompact = (booking: AdminBooking) => {
        const mins = differenceInMinutes(parseISO(booking.end_at), parseISO(booking.start_at));
        return mins <= 30;
    };

    const getStaffColor = (staffId: number) => {
        const color = staffColorMap.get(staffId);
        return color
            ? `${color.bg} ${color.text} ${color.border}`
            : "bg-slate-100 text-slate-800 border-slate-200";
    };

    const timeColumnWidth = 72;
    const dayColumnMinWidth = dayCount === 1 ? 220 : dayCount === 3 ? 130 : 96;
    const gridTemplateColumns = `${timeColumnWidth}px repeat(${dayCount}, minmax(${dayColumnMinWidth}px, 1fr))`;
    const gridMinWidth = timeColumnWidth + dayCount * dayColumnMinWidth;

    return (
        <div className="admin-card flex h-full flex-col overflow-hidden">
            {/* Staff & Service Legend */}
            <div className="flex flex-col border-b border-admin-border bg-admin-surface-subtle">
                {staffLegend.length > 1 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("adminBookings.staff")}
                        </span>
                        {staffLegend.map((staff) => (
                            <div key={staff.id} className="flex items-center gap-1.5">
                                <div className={cn("w-2.5 h-2.5 rounded-full", staff.color.dot)} />
                                <span className="text-xs font-medium text-slate-600">{staff.name}</span>
                            </div>
                        ))}
                    </div>
                )}
                {serviceLegend.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-admin-border/50 px-4 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Services
                        </span>
                        {serviceLegend.map((service) => (
                            <div key={service.id} className="flex items-center gap-1.5">
                                <div className={cn("w-2.5 h-2.5 rounded-sm", service.dotClass)} />
                                <span className="text-xs font-medium text-slate-600">{service.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Calendar Surface - horizontal swipe on mobile instead of squeezed columns */}
            <div className="admin-scrollbar flex-1 min-h-0 overflow-x-auto">
                <div className="flex min-h-0 flex-col" style={{ minWidth: `${gridMinWidth}px` }}>
                    {/* Header */}
                    <div
                        className="grid border-b border-admin-border bg-admin-surface"
                        style={{ gridTemplateColumns }}
                    >
                        <div className="sticky left-0 z-20 border-r border-admin-border bg-admin-surface/95 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 backdrop-blur-sm sm:text-xs">
                            {t("adminBookings.time")}
                        </div>
                        {days.map((date) => {
                            const dayOfWeek = date.getDay();
                            const dayHours = businessHours.find(h => h.day === dayOfWeek);
                            const isDayClosed = dayHours ? !dayHours.is_open : false;
                            const isToday = isSameDay(date, new Date());

                            return (
                                <div
                                    key={date.toISOString()}
                                    className={cn(
                                        "border-r border-admin-border px-1 py-2 text-center last:border-r-0 sm:px-2 sm:py-3",
                                        isToday && "bg-admin-brand-soft",
                                        isDayClosed && "bg-rose-50/50"
                                    )}
                                >
                                    <div className={cn(
                                        "mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-xs",
                                        isToday && "text-admin-brand-soft-text"
                                    )}>
                                        {format(date, "EEE", { locale: dateFnsLocale })}
                                    </div>
                                    <div className={cn(
                                        "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-base font-bold text-slate-950 sm:h-9 sm:w-9 sm:text-lg",
                                        isToday && "bg-admin-brand text-white shadow-sm"
                                    )}>
                                        {format(date, "d")}
                                    </div>
                                    {dayCount <= 3 && (
                                        <div className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                                            {format(date, "MMM", { locale: dateFnsLocale })}
                                        </div>
                                    )}
                                    {isDayClosed && (
                                        <div className="mt-1 text-[10px] font-medium text-rose-500 sm:text-xs">
                                            {t("adminBookings.closed")}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid - vertical scroll */}
                    <div
                        ref={scrollContainerRef}
                        className="admin-scrollbar relative flex-1 overflow-y-auto bg-admin-surface"
                        style={{ maxHeight: "calc(100dvh - 380px)" }}
                    >
                        <div
                            className="grid min-h-[1440px]"
                            style={{ gridTemplateColumns }}
                        >
                            {/* Time Column */}
                            <div className="sticky left-0 z-10 border-r border-admin-border bg-admin-surface/95 backdrop-blur-sm">
                                {HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className={cn(
                                            "h-[60px] border-b border-admin-border/70 px-2 py-2 text-right text-xs text-slate-500",
                                            hour % 6 === 0 && "font-semibold text-slate-700"
                                        )}
                                    >
                                        {format(new Date().setHours(hour, 0), "h a", { locale: dateFnsLocale })}
                                    </div>
                                ))}
                            </div>

                            {/* Days Columns */}
                            {days.map((day) => {
                                const dayBookings = bookings.filter(b => isSameDay(parseISO(b.start_at), day));
                                const overlapLayout = computeOverlapLayout(dayBookings);
                                const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
                                const dayHours = businessHours.find(h => h.day === dayOfWeek);
                                const isDayClosed = dayHours ? !dayHours.is_open : false;

                                // Calculate which hours are within business hours
                                const isHourOpen = (hour: number): boolean => {
                                    if (!dayHours || !dayHours.is_open || !dayHours.slots.length) return false;
                                    return dayHours.slots.some(slot => {
                                        const startHour = parseInt(slot.start_time.split(':')[0], 10);
                                        const endHour = parseInt(slot.end_time.split(':')[0], 10);
                                        const endMinute = parseInt(slot.end_time.split(':')[1], 10);
                                        // Hour is open if it starts at or after open time AND before close time
                                        return hour >= startHour && (hour < endHour || (hour === endHour && endMinute > 0));
                                    });
                                };

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            "group relative border-r border-admin-border last:border-r-0",
                                            isSameDay(day, new Date()) && "bg-admin-brand-soft/25"
                                        )}
                                    >
                                        {/* Closed Day Overlay */}
                                        {isDayClosed && (
                                            <div className="pointer-events-none absolute inset-0 z-[1] flex items-start justify-center bg-rose-50/60 pt-4">
                                                <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:px-3 sm:text-xs">
                                                    {t("adminBookings.closed")}
                                                </span>
                                            </div>
                                        )}

                                        {/* Hour Lines */}
                                        {HOURS.map((hour) => {
                                            const hourOpen = !isDayClosed && isHourOpen(hour);
                                            return (
                                            <div
                                                key={hour}
                                                className={cn(
                                                    "h-[60px] border-b border-admin-border/50",
                                                    hourOpen ? "bg-white/70" : "bg-slate-50/70"
                                                )}
                                            />
                                        );})}

                                        {dayBookings.length === 0 && !isDayClosed && (
                                            <div
                                                className="pointer-events-none absolute left-2 right-2 flex items-center justify-center rounded-md border border-dashed border-admin-border bg-white/70 px-2 py-3 text-center text-xs font-medium text-slate-400"
                                                style={{ top: `${Math.max(earliestOpenHour, 1) * ROW_HEIGHT}px` }}
                                            >
                                                {t("adminBookings.noBookingsForDay")}
                                            </div>
                                        )}

                                        {/* Bookings */}
                                        {dayBookings.map((booking) => {
                                            const layout = overlapLayout.get(booking.id);
                                            const displayStatus = getBookingDisplayStatus(booking);
                                            const compact = isCompact(booking);
                                            return (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => onBookingClick(booking)}
                                                    className={cn(
                                                        "absolute overflow-hidden rounded-md border-y border-r border-l-4 text-left text-xs shadow-sm ring-1 ring-white/70 transition-transform hover:z-10 hover:scale-[1.015] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand",
                                                        compact ? "px-1.5 py-0.5" : "p-1.5",
                                                        getStaffColor(booking.staff.id),
                                                        booking.services[0] ? SERVICE_COLORS[booking.services[0].id % SERVICE_COLORS.length] : "border-l-slate-400"
                                                    )}
                                                    style={getBookingStyle(booking, layout)}
                                                    title={`${booking.customer.full_name} — ${booking.services.map(s => s.name).join(", ")}`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <div className={cn("flex-1 truncate font-semibold", compact && "text-[10px] leading-tight")}>
                                                            {booking.customer.full_name}
                                                        </div>
                                                        <span className={cn(
                                                            "h-1.5 w-1.5 shrink-0 rounded-full",
                                                            STATUS_BADGES[displayStatus] || STATUS_BADGES.PENDING
                                                        )} title={displayStatus} />
                                                    </div>
                                                    {!compact && (
                                                        <div className="truncate opacity-90">
                                                            {booking.services.map(s => s.name).join(", ")}
                                                        </div>
                                                    )}
                                                    {!compact && (
                                                        <div className="mt-0.5 truncate text-[10px] opacity-75">
                                                            {format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
