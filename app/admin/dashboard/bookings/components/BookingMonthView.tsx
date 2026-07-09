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
import { StatusBadge } from "@/components/admin/shared";

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
        <div className="admin-card grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-4">
            <div className="min-w-0">
                <div className="mb-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                                    "relative min-h-[72px] rounded-lg border px-1.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand sm:min-h-[88px] sm:px-2 sm:py-2",
                                    isOutsideMonth
                                        ? "border-transparent bg-transparent text-slate-400"
                                        : "border-admin-border bg-white hover:border-admin-border-strong",
                                    isSelected && "border-admin-brand bg-admin-brand-soft",
                                    isToday && !isSelected && "ring-1 ring-admin-brand/60",
                                )}
                            >
                                <div className={cn("text-sm font-semibold", isToday && "text-admin-brand-soft-text")}>
                                    {format(day, "d")}
                                </div>
                                {dayBookings.length > 0 ? (
                                    <>
                                        <div className="mt-1 hidden text-[11px] font-medium text-slate-500 sm:block">
                                            {dayBookings.length} {t("adminBookings.bookingsShort")}
                                        </div>
                                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                                            {dotStatuses.map((status, index) => (
                                                <span
                                                    key={`${key}-${status}-${index}`}
                                                    className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])}
                                                />
                                            ))}
                                            {dayBookings.length > 3 && (
                                                <span className="text-[10px] font-semibold text-slate-500">
                                                    +{dayBookings.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    !isOutsideMonth && <div className="mt-3 hidden h-px w-8 bg-admin-border sm:block" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-lg border border-admin-border bg-admin-surface-subtle p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                            {format(selectedDay, "EEEE, MMM d", { locale: dateFnsLocale })}
                        </p>
                        <p className="text-xs text-slate-500">
                            {selectedDayBookings.length} {t("adminBookings.bookingsShort")}
                        </p>
                    </div>
                    {isSameDay(selectedDay, today) ? <StatusBadge tone="brand">{t("adminBookings.today")}</StatusBadge> : null}
                </div>
                {selectedDayBookings.length === 0 ? (
                    <p className="rounded-md border border-dashed border-admin-border bg-white/70 px-3 py-6 text-center text-sm text-slate-500">
                        {t("adminBookings.noBookingsForDay")}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {selectedDayBookings.map((booking) => {
                            const displayStatus = getBookingDisplayStatus(booking);
                            const service = booking.services[0];
                            const serviceColorClass = service ? SERVICE_COLORS[service.id % SERVICE_COLORS.length] : "border-l-slate-400";
                            
                            return (
                                <button
                                    key={booking.id}
                                    type="button"
                                    onClick={() => onBookingClick(booking)}
                                    className={cn(
                                        "w-full rounded-lg border-y border-r border-l-4 border-admin-border bg-white px-3 py-2 text-left transition hover:border-admin-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand",
                                        serviceColorClass
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-950">
                                            {booking.customer.full_name}
                                        </p>
                                        <span
                                            className={cn(
                                                "h-2 w-2 shrink-0 rounded-full",
                                                STATUS_DOT[displayStatus],
                                            )}
                                            title={displayStatus}
                                        />
                                    </div>
                                    <p className="truncate text-xs text-slate-500">
                                        {format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} · {booking.staff.name} {service ? `· ${service.name}` : ''}
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
