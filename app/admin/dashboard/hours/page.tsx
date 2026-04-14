"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    Plus,
    Trash2,
    Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { notify } from "@/lib/notify";

// Types
interface TimeSlot {
    id?: number;
    start_time: string; // HH:mm format
    end_time: string;
}

interface DaySchedule {
    day: number; // 0 = Sunday, 1 = Monday, etc.
    is_open: boolean;
    slots: TimeSlot[];
}

interface ApiHourRecord {
    id?: number;
    day_of_week: number;
    is_closed?: boolean;
    open_time?: string | null;
    close_time?: string | null;
}

const DAYS = [
    { day: 0, name: "adminHours.sunday", short: "Sun" },
    { day: 1, name: "adminHours.monday", short: "Mon" },
    { day: 2, name: "adminHours.tuesday", short: "Tue" },
    { day: 3, name: "adminHours.wednesday", short: "Wed" },
    { day: 4, name: "adminHours.thursday", short: "Thu" },
    { day: 5, name: "adminHours.friday", short: "Fri" },
    { day: 6, name: "adminHours.saturday", short: "Sat" },
];

const DEFAULT_SLOT: TimeSlot = { start_time: "09:00", end_time: "17:00" };

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

// Validate time format and logic
function validateTimeSlot(
    slot: TimeSlot,
    t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.start_time)) {
        return t('adminHours.invalidStartTime');
    }
    if (!timeRegex.test(slot.end_time)) {
        return t('adminHours.invalidEndTime');
    }
    if (slot.start_time >= slot.end_time) {
        return t('adminHours.endAfterStart');
    }
    return null;
}

// Check for overlapping slots
function validateSlots(
    slots: TimeSlot[],
    t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
    for (let i = 0; i < slots.length; i++) {
        const error = validateTimeSlot(slots[i], t);
        if (error) return t('adminHours.slotError', { index: i + 1, error });

        for (let j = i + 1; j < slots.length; j++) {
            const a = slots[i];
            const b = slots[j];
            if (
                (a.start_time < b.end_time && a.end_time > b.start_time) ||
                (b.start_time < a.end_time && b.end_time > a.start_time)
            ) {
                return t('adminHours.slotsOverlap', { first: i + 1, second: j + 1 });
            }
        }
    }
    return null;
}

export default function HoursPage() {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();

    // State
    const [schedule, setSchedule] = useState<DaySchedule[]>(
        DAYS.map((d) => ({
            day: d.day,
            is_open: d.day >= 1 && d.day <= 5, // Mon-Fri open by default
            slots: [{ ...DEFAULT_SLOT }],
        }))
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

    // Fetch hours
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);

        try {
            const response = await fetch(getApiUrl(`/api/admin/hours?company_id=${companyId}`), {
                credentials: "include",
            });

            if (!response.ok) throw new Error(t('adminHours.fetchHoursError'));

            const data = await response.json();
            // Handle both flat array and nested { data: { hours: [] } } structure
            const hoursData = data.data?.hours || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));

            // Transform API data to our format
            if (hoursData && hoursData.length > 0) {
                const newSchedule = DAYS.map((d) => {
                    const dayData = hoursData.filter((h: ApiHourRecord) => h.day_of_week === d.day);

                    // Consider it closed if there are no records for this day OR if any record is explicitly marked as closed
                    // Backend says is_closed: true, so we should trust it
                    const isOpen = dayData.length > 0 && !dayData.some((h: ApiHourRecord) => h.is_closed);

                    if (!isOpen) {
                        return {
                            day: d.day,
                            is_open: false,
                            slots: [{ ...DEFAULT_SLOT }],
                        };
                    }
                    return {
                        day: d.day,
                        is_open: true,
                        slots: dayData.map((h: ApiHourRecord) => ({
                            id: h.id,
                            start_time: h.open_time?.slice(0, 5) || "09:00",
                            end_time: h.close_time?.slice(0, 5) || "17:00",
                        })),
                    };
                });
                setSchedule(newSchedule);
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t('adminHours.loadHoursError'));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Update day open/closed
    const toggleDay = (dayIndex: number) => {
        setSchedule((prev) =>
            prev.map((d, i) =>
                i === dayIndex
                    ? {
                        ...d,
                        is_open: !d.is_open,
                        slots: d.slots.length === 0 ? [{ ...DEFAULT_SLOT }] : d.slots,
                    }
                    : d
            )
        );
        setValidationErrors((prev) => {
            const next = { ...prev };
            delete next[dayIndex];
            return next;
        });
    };

    // Update time slot
    const updateSlot = (dayIndex: number, slotIndex: number, field: "start_time" | "end_time", value: string) => {
        setSchedule((prev) =>
            prev.map((d, i) =>
                i === dayIndex
                    ? {
                        ...d,
                        slots: d.slots.map((s, si) =>
                            si === slotIndex ? { ...s, [field]: value } : s
                        ),
                    }
                    : d
            )
        );
    };

    // Add time slot
    const addSlot = (dayIndex: number) => {
        setSchedule((prev) =>
            prev.map((d, i) =>
                i === dayIndex
                    ? {
                        ...d,
                        slots: [...d.slots, { start_time: "12:00", end_time: "17:00" }],
                    }
                    : d
            )
        );
    };

    // Remove time slot
    const removeSlot = (dayIndex: number, slotIndex: number) => {
        setSchedule((prev) =>
            prev.map((d, i) =>
                i === dayIndex
                    ? {
                        ...d,
                        slots: d.slots.filter((_, si) => si !== slotIndex),
                    }
                    : d
            )
        );
    };

    // Validate all days
    const validateAll = (): boolean => {
        const errors: Record<number, string> = {};
        let isValid = true;

        schedule.forEach((day, index) => {
            if (day.is_open) {
                if (day.slots.length === 0) {
                    errors[index] = t('adminHours.atLeastOneSlot');
                    isValid = false;
                } else {
                    const slotError = validateSlots(day.slots, t);
                    if (slotError) {
                        errors[index] = slotError;
                        isValid = false;
                    }
                }
            }
        });

        setValidationErrors(errors);
        return isValid;
    };

    // Save all hours
    const handleSave = async () => {
        if (!companyId) return;

        if (!validateAll()) {
            void notify.warning(t('adminHours.fixValidationErrors'));
            return;
        }

        setSaving(true);

        try {
            // Transform data for API - Send all days, even closed ones
            const hoursData = schedule.flatMap((day) => {
                if (!day.is_open) {
                    return [{
                        day_of_week: day.day,
                        open_time: null as string | null,
                        close_time: null as string | null,
                        company_id: companyId,
                        is_closed: true,
                    }];
                }

                return day.slots.map((slot) => ({
                    day_of_week: day.day,
                    open_time: slot.start_time as string | null,
                    close_time: slot.end_time as string | null,
                    company_id: companyId,
                    is_closed: false,
                }));
            });

            const response = await fetch(getApiUrl("/api/admin/hours"), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ hours: hoursData, company_id: companyId }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || t('adminHours.saveHoursError'));
            }

            await notify.success(t('adminHours.saved'));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t('adminHours.saveHoursError'));
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">{t('common.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('adminHours.title')}</h1>
                    <p className="text-slate-500">{t('adminHours.subtitle')}</p>
                </div>
            </div>

            {/* Schedule Form */}
            <Card className="overflow-x-hidden">
                <CardHeader>
                    <CardTitle className="text-base text-slate-900">{t('adminHours.subtitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    {schedule.map((day, dayIndex) => {
                        const dayInfo = DAYS[dayIndex];
                        const hasError = validationErrors[dayIndex];

                        return (
                            <div
                                key={day.day}
                                className={cn(
                                    "py-4 border-b border-slate-100 last:border-0 overflow-x-hidden",
                                    hasError && "bg-rose-50/50 -mx-4 px-4 rounded-lg"
                                )}
                            >
                                {/* Day Header */}
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Label className="font-medium text-slate-900">
                                        {t(dayInfo.name)}
                                    </Label>
                                    <div className="flex items-center justify-end gap-2 self-end sm:self-auto">
                                        <span
                                            className={cn(
                                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                                day.is_open
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            {day.is_open ? t('adminHours.open') : t('shopHome.closed')}
                                        </span>
                                        <Switch
                                            checked={day.is_open}
                                            onCheckedChange={() => toggleDay(dayIndex)}
                                        />
                                    </div>
                                </div>

                                {/* Time Slots */}
                                {day.is_open && (
                                    <div className="space-y-3">
                                        {day.slots.map((slot, slotIndex) => (
                                            <div
                                                key={slotIndex}
                                                className="rounded-md border border-slate-200 p-3"
                                            >
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) =>
                                                            updateSlot(dayIndex, slotIndex, "start_time", e.target.value)
                                                        }
                                                        className="h-11 min-h-[44px] w-full"
                                                    />
                                                    <Input
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) =>
                                                            updateSlot(dayIndex, slotIndex, "end_time", e.target.value)
                                                        }
                                                        className="h-11 min-h-[44px] w-full"
                                                    />
                                                </div>

                                                {day.slots.length > 1 && (
                                                    <div className="mt-2 flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeSlot(dayIndex, slotIndex)}
                                                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            {t('common.delete')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addSlot(dayIndex)}
                                            className="w-full text-orange-500 hover:text-orange-600 hover:bg-orange-50 sm:w-auto"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            {t('adminHours.addSlot')}
                                        </Button>
                                    </div>
                                )}

                                {/* Validation Error */}
                                {hasError && (
                                    <p className="text-sm text-rose-600 mt-2">
                                        {validationErrors[dayIndex]}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <StickyFormActions
                onSave={handleSave}
                loading={saving}
                saveLabel={t('common.save')}
                loadingLabel={t('adminHours.saving')}
                saveIcon={<Check className="h-4 w-4" />}
                saveClassName="bg-orange-500 hover:bg-orange-600 text-white"
            />
        </div>
    );
}
