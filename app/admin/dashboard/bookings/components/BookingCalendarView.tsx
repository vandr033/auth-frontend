"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { format, addDays, isSameDay, parseISO, differenceInMinutes } from "date-fns";
import { AdminBooking } from "@/types/admin-booking";
import { cn } from "@/lib/utils";
import { type DaySchedule } from "@/app/admin/lib/adminApi";

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
    { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" },
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
    // Track active columns: each entry is the end time of the booking in that column
    const groups: number[][] = [];

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

    // Dynamic grid columns: 1 for time + dayCount for days
    const gridCols = dayCount + 1;

    const getBookingStyle = (booking: AdminBooking, layout?: OverlapLayout) => {
        const start = parseISO(booking.start_at);
        const end = parseISO(booking.end_at);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const duration = differenceInMinutes(end, start) / 60;

        const top = `${startHour * ROW_HEIGHT}px`;
        const height = `${Math.max(duration * ROW_HEIGHT, 30)}px`;

        if (layout && layout.totalColumns > 1) {
            const colWidth = 100 / layout.totalColumns;
            const left = `${layout.column * colWidth}%`;
            const width = `${colWidth}%`;
            return { top, height, left, width, right: "auto" };
        }

        return { top, height, left: "4px", right: "4px" };
    };

    const getStaffColor = (staffId: number) => {
        const color = staffColorMap.get(staffId);
        return color
            ? `${color.bg} ${color.text} ${color.border}`
            : "bg-slate-100 text-slate-800 border-slate-200";
    };

    return (
        <div className="flex flex-col h-full border border-surface-border rounded-lg bg-surface overflow-hidden">
            {/* Staff Legend */}
            {staffLegend.length > 1 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-page/50 border-b border-surface-border flex-wrap">
                    {staffLegend.map((staff) => (
                        <div key={staff.id} className="flex items-center gap-1.5">
                            <div className={cn("w-2.5 h-2.5 rounded-full", staff.color.dot)} />
                            <span className="text-xs text-text-muted font-medium">{staff.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <div
                className="grid border-b border-surface-border bg-page/50"
                style={{ gridTemplateColumns: `80px repeat(${dayCount}, 1fr)` }}
            >
                <div className="p-4 border-r border-surface-border text-xs font-semibold text-text-muted text-center">
                    TIME
                </div>
                {days.map((date) => {
                    const dayOfWeek = date.getDay();
                    const dayHours = businessHours.find(h => h.day === dayOfWeek);
                    const isDayClosed = dayHours ? !dayHours.is_open : false;

                    return (
                        <div
                            key={date.toISOString()}
                            className={cn(
                                "p-3 text-center border-r border-surface-border last:border-r-0",
                                isSameDay(date, new Date()) && "bg-brand/5",
                                isDayClosed && "bg-rose-50/50"
                            )}
                        >
                            <div className="text-xs font-medium text-text-muted uppercase mb-1">
                                {format(date, "EEE")}
                            </div>
                            <div className={cn(
                                "text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                                isSameDay(date, new Date()) && "bg-brand text-white"
                            )}>
                                {format(date, "d")}
                            </div>
                            {dayCount <= 3 && (
                                <div className="text-xs text-text-muted mt-1">
                                    {format(date, "MMM")}
                                </div>
                            )}
                            {isDayClosed && (
                                <div className="text-xs text-rose-500 font-medium mt-1">
                                    Closed
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Grid - scrollable container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto relative bg-surface"
                style={{ maxHeight: 'calc(100vh - 320px)' }}
            >
                <div
                    className="grid min-h-[1440px]"
                    style={{ gridTemplateColumns: `80px repeat(${dayCount}, 1fr)` }}
                >
                    {/* Time Column */}
                    <div className="border-r border-surface-border bg-page/30">
                        {HOURS.map((hour) => (
                            <div
                                key={hour}
                                className="h-[60px] border-b border-surface-border text-xs text-text-muted p-2 text-right"
                            >
                                {format(new Date().setHours(hour, 0), "h a")}
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
                                className="relative border-r border-surface-border last:border-r-0 group"
                            >
                                {/* Closed Day Overlay */}
                                {isDayClosed && (
                                    <div className="absolute inset-0 bg-rose-50/60 z-[1] pointer-events-none flex items-start justify-center pt-4">
                                        <span className="bg-rose-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                            Closed
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
                                            "h-[60px] border-b border-surface-border/50",
                                            !hourOpen && !isDayClosed && "bg-slate-100/50"
                                        )}
                                    />
                                );})}

                                {/* Bookings */}
                                {dayBookings.map((booking) => {
                                    const layout = overlapLayout.get(booking.id);
                                    return (
                                        <button
                                            key={booking.id}
                                            onClick={() => onBookingClick(booking)}
                                            className={cn(
                                                "absolute rounded-md border p-1.5 text-left text-xs transition-transform hover:scale-[1.02] hover:z-10 shadow-sm overflow-hidden",
                                                getStaffColor(booking.staff.id)
                                            )}
                                            style={getBookingStyle(booking, layout)}
                                        >
                                            <div className="flex items-center gap-1">
                                                <div className="font-semibold truncate flex-1">
                                                    {booking.customer.full_name}
                                                </div>
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    STATUS_BADGES[booking.status] || STATUS_BADGES.PENDING
                                                )} title={booking.status} />
                                            </div>
                                            <div className="opacity-90 truncate">
                                                {booking.services.map(s => s.name).join(", ")}
                                            </div>
                                            <div className="mt-0.5 opacity-75 truncate text-[10px]">
                                                {format(parseISO(booking.start_at), "h:mm a")}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
