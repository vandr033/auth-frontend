"use client";

import React from "react";
import {
    addDays,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { AdminBooking } from "@/types/admin-booking";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { getBookingDisplayStatus } from "../lib/bookingStatus";

interface BookingMonthViewProps {
    bookings: AdminBooking[];
    currentDate: Date;
    onBookingClick: (booking: AdminBooking) => void;
}

const WEEKDAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LABELS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_DOT: Record<AdminBooking["status"], string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-emerald-500",
    COMPLETED: "bg-blue-500",
    CANCELLED: "bg-rose-500",
    NO_SHOW: "bg-slate-500",
};

function dateKey(date: Date): string {
    return format(date, "yyyy-MM-dd");
}

export function BookingMonthView({ bookings, currentDate, onBookingClick }: BookingMonthViewProps) {
    const { t, locale } = useI18n();
    const dateFnsLocale = getDateLocale(locale);
    const weekdayLabels = locale === "es" ? WEEKDAY_LABELS_ES : WEEKDAY_LABELS_EN;
    const today = React.useMemo(() => new Date(), []);
    const monthStart = startOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    const [selectedDay, setSelectedDay] = React.useState<Date>(() =>
        isSameMonth(today, currentDate) ? today : monthStart,
    );

    React.useEffect(() => {
        const now = new Date();
        setSelectedDay(isSameMonth(now, currentDate) ? now : startOfMonth(currentDate));
    }, [currentDate]);

    const days = React.useMemo(() => {
        const next: Date[] = [];
        let cursor = calendarStart;
        while (cursor <= calendarEnd) {
            next.push(cursor);
            cursor = addDays(cursor, 1);
        }
        return next;
    }, [calendarStart, calendarEnd]);

    const bookingsByDay = React.useMemo(() => {
        const map = new Map<string, AdminBooking[]>();

        for (const booking of bookings) {
            const day = parseISO(booking.start_at);
            const key = dateKey(day);
            const prev = map.get(key) ?? [];
            prev.push(booking);
            map.set(key, prev);
        }

        for (const [key, dayBookings] of map.entries()) {
            dayBookings.sort((a, b) => a.start_at.localeCompare(b.start_at));
            map.set(key, dayBookings);
        }

        return map;
    }, [bookings]);

    const selectedDayBookings = React.useMemo(() => {
        return bookingsByDay.get(dateKey(selectedDay)) ?? [];
    }, [bookingsByDay, selectedDay]);

    return (
        <div className="rounded-xl border border-surface-border bg-surface p-3 sm:p-4">
            <div className="mb-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {weekdayLabels.map((label) => (
                    <div key={label} className="py-2">
                        {label}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {days.map((day) => {
                    const key = dateKey(day);
                    const dayBookings = bookingsByDay.get(key) ?? [];
                    const dotStatuses = dayBookings
                        .slice(0, 3)
                        .map((booking) => getBookingDisplayStatus(booking));
                    const isOutsideMonth = !isSameMonth(day, monthStart);
                    const isSelected = isSameDay(day, selectedDay);
                    const isToday = isSameDay(day, today);

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className={cn(
                                "relative min-h-[66px] rounded-lg border px-1.5 py-1.5 text-left transition-colors",
                                isOutsideMonth
                                    ? "border-transparent bg-transparent text-text-muted/50"
                                    : "border-surface-border bg-page hover:border-brand/50",
                                isSelected && "border-brand bg-brand/10",
                                isToday && !isSelected && "ring-1 ring-brand/50",
                            )}
                        >
                            <div className="text-sm font-semibold">{format(day, "d")}</div>
                            {dayBookings.length > 0 && (
                                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                                    {dotStatuses.map((status, index) => (
                                        <span
                                            key={`${key}-${status}-${index}`}
                                            className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])}
                                        />
                                    ))}
                                    {dayBookings.length > 3 && (
                                        <span className="text-[10px] font-semibold text-text-muted">
                                            +{dayBookings.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 rounded-lg border border-surface-border bg-page p-3">
                <div className="mb-2 text-sm font-semibold text-text-main">
                    {format(selectedDay, "EEEE, MMM d", { locale: dateFnsLocale })}
                </div>
                {selectedDayBookings.length === 0 ? (
                    <p className="text-sm text-text-muted">{t("adminBookings.noBookingsForDay")}</p>
                ) : (
                    <div className="space-y-2">
                        {selectedDayBookings.map((booking) => {
                            const displayStatus = getBookingDisplayStatus(booking);
                            return (
                                <button
                                    key={booking.id}
                                    type="button"
                                    onClick={() => onBookingClick(booking)}
                                    className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-left hover:border-brand/50"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-text-main">
                                            {booking.customer.full_name}
                                        </p>
                                        <span
                                            className={cn(
                                                "h-2 w-2 rounded-full",
                                                STATUS_DOT[displayStatus],
                                            )}
                                            title={displayStatus}
                                        />
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        {format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} · {booking.staff.name}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
