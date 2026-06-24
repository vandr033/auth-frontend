"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AdminBooking } from "@/types/admin-booking";
import {
    getBookingRescheduleOptions,
    rescheduleBooking,
    type BookingRescheduleSuggestion,
} from "@/app/admin/lib/adminApi";
import { notify } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";
import type { AppApiError } from "@/lib/api-error";
import { CalendarClock, Clock, Loader2 } from "lucide-react";

interface BookingRescheduleDialogProps {
    booking: AdminBooking;
    isOpen: boolean;
    onClose: () => void;
    onSaved: (booking: AdminBooking) => void;
}

function getZonedInputParts(value: string, timeZone: string): { date: string; time: string } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(value));

    const part = (type: string) => parts.find((entry) => entry.type === type)?.value || "00";
    return {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        time: `${part("hour")}:${part("minute")}`,
    };
}

function formatRange(startAt: string, endAt: string, timeZone: string, locale: string): string {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    return `${dateFormatter.format(new Date(startAt))}, ${timeFormatter.format(new Date(startAt))} - ${timeFormatter.format(new Date(endAt))}`;
}

function getErrorSuggestions(error: unknown): BookingRescheduleSuggestion[] {
    const apiError = error as AppApiError;
    const data = apiError?.data;
    if (!data || typeof data !== "object" || !("suggestions" in data)) return [];
    const suggestions = (data as { suggestions?: unknown }).suggestions;
    return Array.isArray(suggestions) ? suggestions as BookingRescheduleSuggestion[] : [];
}

export function BookingRescheduleDialog({
    booking,
    isOpen,
    onClose,
    onSaved,
}: BookingRescheduleDialogProps) {
    const { t, locale } = useI18n();
    const [timezone, setTimezone] = useState("UTC");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<BookingRescheduleSuggestion[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentRangeLabel = useMemo(
        () => formatRange(booking.start_at, booking.end_at, timezone, locale),
        [booking.end_at, booking.start_at, locale, timezone],
    );

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        setError(null);
        setLoadingOptions(true);
        setSuggestions([]);

        getBookingRescheduleOptions(booking.id)
            .then((options) => {
                if (cancelled) return;
                setTimezone(options.timezone);
                setDurationMinutes(options.duration_minutes);
                setSuggestions(options.suggestions);
                const parts = getZonedInputParts(options.current_start_at, options.timezone);
                setDate(parts.date);
                setTime(parts.time);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : t("adminBookings.rescheduleOptionsFailed"));
            })
            .finally(() => {
                if (!cancelled) setLoadingOptions(false);
            });

        return () => {
            cancelled = true;
        };
    }, [booking.id, isOpen, t]);

    useEffect(() => {
        if (!isOpen || !date) return;
        let cancelled = false;

        getBookingRescheduleOptions(booking.id, { date })
            .then((options) => {
                if (cancelled) return;
                setTimezone(options.timezone);
                setDurationMinutes(options.duration_minutes);
                setSuggestions(options.suggestions);
            })
            .catch(() => {
                if (!cancelled) setSuggestions([]);
            });

        return () => {
            cancelled = true;
        };
    }, [booking.id, date, isOpen]);

    const applySuggestion = (suggestion: BookingRescheduleSuggestion) => {
        setDate(suggestion.date);
        setTime(suggestion.time);
        setError(null);
    };

    const submit = async (confirmShortNotice = false) => {
        if (!date || !time) {
            setError(t("adminBookings.rescheduleDateTimeRequired"));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await rescheduleBooking(booking.id, {
                start_at: `${date}T${time}:00`,
                confirm_short_notice: confirmShortNotice,
            });
            onSaved(result.booking);
            await notify.success(
                t("adminBookings.rescheduled"),
                t("adminBookings.rescheduleNotificationsQueued", {
                    count: result.notification_attempts.queued,
                }),
            );
            onClose();
        } catch (err: unknown) {
            const apiError = err as AppApiError;
            const nextSuggestions = getErrorSuggestions(err);
            if (nextSuggestions.length > 0) {
                setSuggestions(nextSuggestions);
            }

            if (apiError?.reason === "SHORT_NOTICE_CONFIRMATION_REQUIRED") {
                const confirmation = await notify.confirm(
                    t("adminBookings.shortNoticeTitle"),
                    t("adminBookings.shortNoticeDescription"),
                    {
                        confirmButtonText: t("adminBookings.shortNoticeConfirm"),
                        cancelButtonText: t("common.cancel"),
                    },
                );
                if (confirmation.isConfirmed) {
                    await submit(true);
                }
                return;
            }

            setError(err instanceof Error ? err.message : t("adminBookings.rescheduleFailed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("adminBookings.changeDateTime")}</DialogTitle>
                    <DialogDescription>{t("adminBookings.changeDateTimeDescription")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <CalendarClock className="mt-0.5 h-4 w-4 text-slate-500" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase text-slate-500">
                                    {t("adminBookings.currentDateTime")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-950">{currentRangeLabel}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {t("adminBookings.companyTimezone", { timezone })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="reschedule-date">{t("adminBookings.date")}</Label>
                            <Input
                                id="reschedule-date"
                                type="date"
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                                disabled={loadingOptions || saving}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="reschedule-time">{t("adminBookings.time")}</Label>
                            <Input
                                id="reschedule-time"
                                type="time"
                                value={time}
                                onChange={(event) => setTime(event.target.value)}
                                disabled={loadingOptions || saving}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-950">
                                    {t("adminBookings.suggestedTimes")}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {durationMinutes
                                        ? t("adminBookings.durationHint", { minutes: durationMinutes })
                                        : t("adminBookings.suggestedTimesHint")}
                                </p>
                            </div>
                            {loadingOptions && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                        </div>

                        {suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={`${suggestion.date}-${suggestion.time}`}
                                        type="button"
                                        onClick={() => applySuggestion(suggestion)}
                                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-admin-brand hover:bg-admin-brand/5"
                                        disabled={saving}
                                    >
                                        <span className="block font-medium text-slate-950">
                                            {formatRange(suggestion.start_at, suggestion.end_at, timezone, locale)}
                                        </span>
                                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                                            <Clock className="h-3 w-3" />
                                            {suggestion.time}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                                {t("adminBookings.noSuggestedTimes")}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{t("adminBookings.teacherAvailabilityChecked")}</Badge>
                        <Badge variant="outline">{t("adminBookings.roomAvailabilityChecked")}</Badge>
                        <Badge variant="outline">{t("adminBookings.notificationsAfterReschedule")}</Badge>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={() => void submit()} disabled={saving || loadingOptions}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("adminBookings.saveNewDateTime")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
