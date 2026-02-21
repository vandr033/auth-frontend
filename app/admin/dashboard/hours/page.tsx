"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    Plus,
    Trash2,
    Clock,
    Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";

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

const DAYS = [
    { day: 0, name: "Sunday", short: "Sun" },
    { day: 1, name: "Monday", short: "Mon" },
    { day: 2, name: "Tuesday", short: "Tue" },
    { day: 3, name: "Wednesday", short: "Wed" },
    { day: 4, name: "Thursday", short: "Thu" },
    { day: 5, name: "Friday", short: "Fri" },
    { day: 6, name: "Saturday", short: "Sat" },
];

const DEFAULT_SLOT: TimeSlot = { start_time: "09:00", end_time: "17:00" };

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

// Validate time format and logic
function validateTimeSlot(slot: TimeSlot): string | null {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.start_time)) {
        return "Invalid start time format (use HH:mm)";
    }
    if (!timeRegex.test(slot.end_time)) {
        return "Invalid end time format (use HH:mm)";
    }
    if (slot.start_time >= slot.end_time) {
        return "End time must be after start time";
    }
    return null;
}

// Check for overlapping slots
function validateSlots(slots: TimeSlot[]): string | null {
    for (let i = 0; i < slots.length; i++) {
        const error = validateTimeSlot(slots[i]);
        if (error) return `Slot ${i + 1}: ${error}`;

        for (let j = i + 1; j < slots.length; j++) {
            const a = slots[i];
            const b = slots[j];
            if (
                (a.start_time < b.end_time && a.end_time > b.start_time) ||
                (b.start_time < a.end_time && b.end_time > a.start_time)
            ) {
                return `Slots ${i + 1} and ${j + 1} overlap`;
            }
        }
    }
    return null;
}

export default function HoursPage() {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();

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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

    // Fetch hours
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl(`/api/admin/hours?company_id=${companyId}`), {
                credentials: "include",
            });

            if (!response.ok) throw new Error("Failed to fetch business hours");

            const data = await response.json();
            // Handle both flat array and nested { data: { hours: [] } } structure
            const hoursData = data.data?.hours || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));

            // Transform API data to our format
            if (hoursData && hoursData.length > 0) {
                const newSchedule = DAYS.map((d) => {
                    const dayData = hoursData.filter((h: any) => h.day_of_week === d.day);

                    // Consider it closed if there are no records for this day OR if any record is explicitly marked as closed
                    // Backend says is_closed: true, so we should trust it
                    const isOpen = dayData.length > 0 && !dayData.some((h: any) => h.is_closed);

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
                        slots: dayData.map((h: any) => ({
                            id: h.id,
                            start_time: h.open_time?.slice(0, 5) || "09:00",
                            end_time: h.close_time?.slice(0, 5) || "17:00",
                        })),
                    };
                });
                setSchedule(newSchedule);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load hours");
        } finally {
            setLoading(false);
        }
    }, [companyId]);

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
                    errors[index] = "At least one time slot is required";
                    isValid = false;
                } else {
                    const slotError = validateSlots(day.slots);
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

        setError(null);
        setSuccess(null);

        if (!validateAll()) {
            setError("Please fix the validation errors before saving");
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
                throw new Error(data.message || "Failed to save hours");
            }

            setSuccess("Business hours saved successfully!");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save hours");
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">Loading business hours...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Business Hours</h1>
                    <p className="text-slate-500">Set your opening and closing times</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            {/* Success message */}
            {success && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    {success}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-2"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Schedule Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-500" />
                        Weekly Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    {schedule.map((day, dayIndex) => {
                        const dayInfo = DAYS[dayIndex];
                        const hasError = validationErrors[dayIndex];

                        return (
                            <div
                                key={day.day}
                                className={cn(
                                    "py-4 border-b border-slate-100 last:border-0",
                                    hasError && "bg-rose-50/50 -mx-4 px-4 rounded-lg"
                                )}
                            >
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={day.is_open}
                                            onCheckedChange={() => toggleDay(dayIndex)}
                                        />
                                        <Label className="font-medium text-slate-900 min-w-[100px]">
                                            {dayInfo.name}
                                        </Label>
                                        <span
                                            className={cn(
                                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                                day.is_open
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            {day.is_open ? "Open" : "Closed"}
                                        </span>
                                    </div>

                                    {day.is_open && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addSlot(dayIndex)}
                                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add slot
                                        </Button>
                                    )}
                                </div>

                                {/* Time Slots */}
                                {day.is_open && (
                                    <div className="space-y-2 ml-12">
                                        {day.slots.map((slot, slotIndex) => (
                                            <div
                                                key={slotIndex}
                                                className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) =>
                                                            updateSlot(dayIndex, slotIndex, "start_time", e.target.value)
                                                        }
                                                        className="w-[120px]"
                                                    />
                                                    <span className="text-slate-400">to</span>
                                                    <Input
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) =>
                                                            updateSlot(dayIndex, slotIndex, "end_time", e.target.value)
                                                        }
                                                        className="w-[120px]"
                                                    />
                                                </div>

                                                {day.slots.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Validation Error */}
                                {hasError && (
                                    <p className="text-sm text-rose-600 mt-2 ml-12">
                                        {validationErrors[dayIndex]}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Bottom Save Button (mobile convenience) */}
            <div className="sm:hidden">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
