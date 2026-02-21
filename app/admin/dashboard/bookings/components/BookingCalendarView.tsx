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

export function BookingCalendarView({ bookings, currentDate, dayCount, onBookingClick, businessHours = [] }: BookingCalendarViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Generate days array based on dayCount
    const days = useMemo(() => {
        return Array.from({ length: dayCount }, (_, i) => addDays(currentDate, i));
    }, [currentDate, dayCount]);

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

    const getBookingStyle = (booking: AdminBooking) => {
        const start = parseISO(booking.start_at);
        const end = parseISO(booking.end_at);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const duration = differenceInMinutes(end, start) / 60;

        return {
            top: `${startHour * ROW_HEIGHT}px`,
            height: `${Math.max(duration * ROW_HEIGHT, 30)}px`, // Minimum 30px height
        };
    };

    const getStatusColor = (status: AdminBooking['status']) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'NO_SHOW': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-amber-100 text-amber-800 border-amber-200'; // PENDING
        }
    };

    return (
        <div className="flex flex-col h-full border border-surface-border rounded-lg bg-surface overflow-hidden">
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
                                {dayBookings.map((booking) => (
                                    <button
                                        key={booking.id}
                                        onClick={() => onBookingClick(booking)}
                                        className={cn(
                                            "absolute inset-x-1 rounded-md border p-2 text-left text-xs transition-transform hover:scale-[1.02] hover:z-10 shadow-sm overflow-hidden",
                                            getStatusColor(booking.status)
                                        )}
                                        style={getBookingStyle(booking)}
                                    >
                                        <div className="font-semibold truncate">
                                            {booking.customer.full_name}
                                        </div>
                                        <div className="opacity-90 truncate">
                                            {booking.services.map(s => s.name).join(", ")}
                                        </div>
                                        <div className="mt-1 opacity-75 truncate text-[10px]">
                                            with {booking.staff.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

