"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clock, User, Calendar, CreditCard, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShop } from "../../contexts/ShopContext";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import type {
    BookingStep,
    BookingState,
    SelectedService,
    SelectedStaff,
    SelectedSlot,
    TimeSlot,
    BookingRequest,
} from "@/types/booking";
import {
    calculateBookingTotals,
    formatPrice,
    formatDuration,
} from "@/types/booking";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { type AvailableDate, getTodayDateString } from "@/utils/business-hours";
import { ClosedBanner } from "@/components/shop/OpenStatusBadge";
import { getImageUrl } from "@/utils/image-url";
import { ShopSettings } from "@/types/shop";
import { appendShopParam, buildSignInRedirectPath } from "@/app/lib/shop-context";

// Helper to resolve API URL (duplicate of logic in ShopContext, consider exported helper)
const resolveApiUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "";
    return `${base}${url}`;
};

const PENDING_BOOKING_STORAGE_KEY = "pending-booking-intent-v1";
const PENDING_BOOKING_MAX_AGE_MS = 30 * 60 * 1000;

type PendingBookingIntent = {
    slug: string;
    company_id: number;
    staff_id: number;
    service_ids: number[];
    start_at: string;
    payment_method: "CASH" | "QR" | "NONE";
    notes: string;
    qr_proof_image_url?: string;
    created_at: string;
};

const savePendingBookingIntent = (intent: PendingBookingIntent) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(PENDING_BOOKING_STORAGE_KEY, JSON.stringify(intent));
};

const clearPendingBookingIntent = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
};

const loadPendingBookingIntent = (): PendingBookingIntent | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(PENDING_BOOKING_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as PendingBookingIntent;
        if (!parsed?.slug || !parsed?.created_at) {
            clearPendingBookingIntent();
            return null;
        }

        const createdAt = new Date(parsed.created_at).getTime();
        if (!Number.isFinite(createdAt) || Date.now() - createdAt > PENDING_BOOKING_MAX_AGE_MS) {
            clearPendingBookingIntent();
            return null;
        }

        return parsed;
    } catch {
        clearPendingBookingIntent();
        return null;
    }
};

type BrowseMode = "service-first" | "staff-first";

// Step indicator component — horizontal stepper with numbered circles + connecting lines
function StepIndicator({ currentStep, browseMode }: { currentStep: BookingStep; browseMode: BrowseMode }) {
    const t = useT();
    const steps = browseMode === "service-first"
        ? [
            { num: 1, label: t('shopBooking.step1') },
            { num: 2, label: t('shopBooking.step2') },
            { num: 3, label: t('shopBooking.step3') },
            { num: 4, label: t('shopBooking.step4') },
        ]
        : [
            { num: 1, label: t('shopBooking.step2') },
            { num: 2, label: t('shopBooking.step1') },
            { num: 3, label: t('shopBooking.step3') },
            { num: 4, label: t('shopBooking.step4') },
        ];

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <React.Fragment key={step.num}>
                        {/* Step circle + label */}
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
                                    currentStep > step.num
                                        ? "bg-brand text-white"
                                        : currentStep === step.num
                                            ? "bg-brand text-white ring-4 ring-brand/20"
                                            : "bg-surface border-2 border-surface-border text-text-muted"
                                )}
                            >
                                {currentStep > step.num ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    step.num
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    currentStep >= step.num ? "text-brand" : "text-text-muted"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {/* Connecting line */}
                        {index < steps.length - 1 && (
                            <div className="flex-1 mx-2 mb-5">
                                <div
                                    className={cn(
                                        "h-0.5 w-full rounded-full transition-colors duration-200",
                                        currentStep > step.num ? "bg-brand" : "bg-surface-border"
                                    )}
                                />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// Step 1: Service Selection
function ServiceStep({
    services,
    categories,
    selectedServices,
    onToggleService,
}: {
    services: SelectedService[];
    categories: { id: number; name: string }[];
    selectedServices: SelectedService[];
    onToggleService: (service: SelectedService) => void;
}) {
    const t = useT();
    const selectedIds = new Set(selectedServices.map((s) => s.id));

    // Group services by category
    const servicesByCategory = categories.map((cat) => ({
        category: cat,
        services: services.filter((s) => s.category_id === cat.id),
    }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.selectServicesTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.selectServicesSubtitle')}</p>
            </div>

            {servicesByCategory.map(({ category, services: catServices }) => (
                <div key={category.id} className="space-y-2">
                    {categories.length > 1 && (
                        <h3 className="text-lg font-semibold text-text-main">{category.name}</h3>
                    )}
                    <div className="space-y-2">
                        {catServices.map((service) => {
                            const isSelected = selectedIds.has(service.id);
                            return (
                                <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => onToggleService(service)}
                                    className={cn(
                                        "w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-all min-h-[56px]",
                                        isSelected
                                            ? "border-brand bg-brand/5 border-l-4"
                                            : "border-surface-border hover:border-brand/40 hover:bg-surface"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <h4 className="font-semibold text-text-main truncate">{service.name}</h4>
                                            <span className="text-sm font-bold text-brand flex-shrink-0">
                                                {formatPrice(service.price_cents)}
                                            </span>
                                        </div>
                                        {service.description && (
                                            <p className="text-sm text-text-muted line-clamp-1 mt-0.5">
                                                {service.description}
                                            </p>
                                        )}
                                        <span className="flex items-center gap-1 text-xs text-text-muted mt-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDuration(service.duration_minutes)}
                                        </span>
                                    </div>
                                    <div
                                        className={cn(
                                            "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                            isSelected
                                                ? "bg-brand border-brand text-white"
                                                : "border-surface-border"
                                        )}
                                    >
                                        {isSelected && <Check className="h-4 w-4" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {services.length === 0 && (
                <p className="text-center text-text-muted py-8">{t('shopBooking.noServicesAvailable')}</p>
            )}
        </div>
    );
}

// Step 2: Staff Selection
function StaffStep({
    staffList,
    selectedStaff,
    onSelectStaff,
}: {
    staffList: SelectedStaff[];
    selectedStaff: SelectedStaff | null;
    onSelectStaff: (staff: SelectedStaff) => void;
}) {
    const t = useT();
    const anyAvailableOption: SelectedStaff = {
        id: "any",
        display_name: t('shopBooking.anyAvailable'),
    };

    const options = [anyAvailableOption, ...staffList];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.selectStaffTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.selectStaffSubtitle')}</p>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {options.map((staff) => {
                    const isSelected = selectedStaff?.id === staff.id;
                    return (
                        <button
                            key={staff.id}
                            type="button"
                            onClick={() => onSelectStaff(staff)}
                            className={cn(
                                "flex flex-col items-center gap-3 rounded-xl border p-5 transition-all min-h-[120px]",
                                isSelected
                                    ? "border-brand bg-brand/5 shadow-md"
                                    : "border-surface-border hover:border-brand/40 hover:bg-surface"
                            )}
                        >
                            <div
                                className={cn(
                                    "h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 transition-all overflow-hidden",
                                    isSelected
                                        ? "ring-3 ring-brand ring-offset-2"
                                        : "",
                                    staff.id === "any"
                                        ? "bg-brand/10 text-brand"
                                        : "bg-section text-text-muted"
                                )}
                            >
                                {staff.id === "any" ? (
                                    <User className="h-7 w-7" />
                                ) : staff.image_url ? (
                                    <img
                                        src={getImageUrl(staff.image_url) || undefined}
                                        alt={staff.display_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    staff.display_name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="text-center">
                                <h4 className={cn(
                                    "text-sm font-semibold",
                                    isSelected ? "text-brand" : "text-text-main"
                                )}>
                                    {staff.display_name}
                                </h4>
                                {staff.id === "any" && (
                                    <p className="text-xs text-text-muted mt-0.5">{t('shopBooking.firstAvailable')}</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Step 3: Date & Time Selection
function DateTimeStep({
    companyId,
    selectedServices,
    selectedStaff,
    selectedSlot,
    onSelectSlot,
    selectedDate,
    onSelectDate,
    timezone,
}: {
    companyId: number;
    selectedServices: SelectedService[];
    selectedStaff: SelectedStaff | null;
    selectedSlot: SelectedSlot | null;
    onSelectSlot: (slot: SelectedSlot) => void;
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
    timezone?: string;
}) {
    const t = useT();
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [loadingDates, setLoadingDates] = useState(true);
    const hasLoadedDates = React.useRef(false);
    const api = useApi();

    // Fetch available dates on mount (only once)
    React.useEffect(() => {
        if (hasLoadedDates.current) return;

        const fetchAvailableDates = async () => {
            hasLoadedDates.current = true;
            setLoadingDates(true);
            try {
                const response = await api.get<{ data: { dates: AvailableDate[]; timezone: string } }>(
                    `/booking/available-dates?company_id=${companyId}&days=14`
                );
                const dates = response.data?.dates || [];
                setAvailableDates(dates);

                // Select first open date by default
                // Only auto-select if no date is already selected
                if (!selectedDate) {
                    const firstOpenDate = dates.find(d => d.is_open);
                    if (firstOpenDate) {
                        onSelectDate(firstOpenDate.date);
                    } else if (dates.length > 0) {
                        onSelectDate(dates[0].date);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch available dates:", err);
                // Fallback: generate dates without availability info
                const fallbackDates: AvailableDate[] = [];
                const today = new Date();
                for (let i = 0; i < 14; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    fallbackDates.push({
                        date: date.toISOString().split("T")[0],
                        day_of_week: date.getDay(),
                        is_open: true,
                        windows: [],
                    });
                }
                setAvailableDates(fallbackDates);
                if (!selectedDate) {
                    onSelectDate(fallbackDates[0].date);
                }
            } finally {
                setLoadingDates(false);
            }
        };

        void fetchAvailableDates();
    }, [companyId, api]);

    // Filter to only show open dates
    const dateOptions = useMemo(() => {
        return availableDates
            .filter(d => d.is_open)
            .map(d => {
                const date = new Date(d.date + "T12:00:00");
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return { value: d.date, label, dayName };
            });
    }, [availableDates]);

    // Get today's date for comparison
    const today = getTodayDateString(timezone);

    // Fetch available slots when date changes
    React.useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedDate || selectedServices.length === 0) return;

            setLoadingSlots(true);
            setSlotsError(null);

            try {
                const serviceIds = selectedServices.map((s) => s.id).join(",");
                const staffId = selectedStaff?.id === "any" ? "" : selectedStaff?.id;

                const response = await api.get<{ data: TimeSlot[] }>(
                    `/booking/slots?company_id=${companyId}&date=${selectedDate}&service_ids=${serviceIds}${staffId ? `&staff_id=${staffId}` : ""}`
                );

                setSlots(response.data || []);
            } catch (err) {
                setSlotsError("Unable to load available times. Please try again.");
                // For demo: generate mock slots if backend not ready
                const mockSlots: TimeSlot[] = [];
                const startHour = 9;
                const endHour = 18;
                for (let hour = startHour; hour < endHour; hour++) {
                    for (const minutes of ["00", "30"]) {
                        mockSlots.push({
                            time: `${hour.toString().padStart(2, "0")}:${minutes}`,
                            staff_id: typeof selectedStaff?.id === "number" ? selectedStaff.id : 1,
                            staff_name: selectedStaff?.display_name || "Available Staff",
                            available: Math.random() > 0.3, // Random availability for demo
                        });
                    }
                }
                setSlots(mockSlots);
                setSlotsError(null); // Clear error since we have mock data
            } finally {
                setLoadingSlots(false);
            }
        };

        void fetchSlots();
    }, [selectedDate, selectedServices, selectedStaff, companyId, api]);

    const handleSelectSlot = (slot: TimeSlot) => {
        if (!slot.available || !selectedDate) return;
        onSelectSlot({
            date: selectedDate,
            time: slot.time,
            staff_id: slot.staff_id,
            staff_name: slot.staff_name,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.selectDateTimeTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.selectDateTimeSubtitle')}</p>
            </div>

            {/* Closed Banner - shows when today is selected and currently closed */}
            {selectedDate === today && (
                <ClosedBanner
                    availableDates={availableDates}
                    timezone={timezone}
                    className="mb-2"
                />
            )}

            {/* Date Selection - only shows open days */}
            {loadingDates ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-brand" />
                    <span className="ml-2 text-slate-500">{t('shopBooking.loadingDates')}</span>
                </div>
            ) : dateOptions.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                    {t('shopBooking.noDatesAvailable')}
                </div>
            ) : (
                <div className="overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                        {dateOptions.map((date) => {
                            const isSelected = selectedDate === date.value;
                            const isToday = date.value === today;
                            return (
                                <button
                                    key={date.value}
                                    onClick={() => onSelectDate(date.value)}
                                    className={cn(
                                        "flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all min-w-[72px] min-h-[72px]",
                                        isSelected
                                            ? "border-brand bg-brand text-white shadow-md"
                                            : "border-surface-border bg-surface hover:border-brand/50"
                                    )}
                                >
                                    <span className="text-xs font-medium opacity-80">{date.dayName}</span>
                                    <span className="text-xl font-bold">{date.label.split(" ")[1]}</span>
                                    <span className="text-xs opacity-80">
                                        {isToday ? t('shopBooking.today') : date.label.split(" ")[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Time Slots */}
            <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('shopBooking.availableTimes')}
                </h3>
                {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        <span className="ml-2 text-text-muted">{t('shopBooking.loadingTimes')}</span>
                    </div>
                ) : slotsError ? (
                    <p className="text-center text-rose-500 py-8">{slotsError}</p>
                ) : slots.length === 0 ? (
                    <p className="text-center text-text-muted py-8">{t('shopBooking.noTimesAvailable')}</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((slot, index) => {
                            const isSelected =
                                selectedSlot?.date === selectedDate && selectedSlot?.time === slot.time;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSelectSlot(slot)}
                                    disabled={!slot.available}
                                    className={cn(
                                        "px-3 py-3 rounded-lg text-sm font-semibold transition-all min-h-[44px]",
                                        !slot.available
                                            ? "bg-section text-text-muted/40 cursor-not-allowed line-through"
                                            : isSelected
                                                ? "bg-brand text-white shadow-md"
                                                : "bg-surface border border-surface-border text-text-main hover:border-brand"
                                    )}
                                >
                                    {slot.time}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Step 4: Confirmation
function ConfirmStep({
    booking,
    settings,
    qrProofFile,
    onChangePayment,
    onChangeNotes,
    onChangeProof,
    onSubmit,
    submitting,
    error,
}: {
    booking: BookingState;
    settings: ShopSettings | null;
    qrProofFile: File | null;
    onChangePayment: (method: "CASH" | "QR" | "NONE") => void;
    onChangeNotes: (notes: string) => void;
    onChangeProof: (file: File | null) => void;
    onSubmit: () => void;
    submitting: boolean;
    error: string | null;
}) {
    const t = useT();
    const { totalPrice, totalDuration } = calculateBookingTotals(booking.services);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.confirmTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.confirmSubtitle')}</p>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-6 space-y-4">
                {/* Services Summary */}
                <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
                        {t('shopBooking.services')}
                    </h3>
                    <div className="space-y-2">
                        {booking.services.map((service) => (
                            <div key={service.id} className="flex justify-between">
                                <span className="text-text-main">{service.name}</span>
                                <span className="text-text-muted">{formatPrice(service.price_cents)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-surface-border" />

                {/* Staff */}
                <div className="flex justify-between">
                    <span className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                        {t('shopBooking.step2')}
                    </span>
                    <span className="text-text-main">{booking.staff?.display_name || t('shopBooking.anyAvailable')}</span>
                </div>

                {/* Date & Time */}
                {booking.slot && (
                    <div className="flex justify-between">
                        <span className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                            {t('shopBooking.dateAndTime')}
                        </span>
                        <span className="text-text-main">
                            {new Date(booking.slot.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                            })}
                            {" "}
                            at {booking.slot.time}
                        </span>
                    </div>
                )}

                <hr className="border-surface-border" />

                {/* Total */}
                <div className="flex justify-between text-lg font-bold">
                    <span className="text-text-main">{t('shopBooking.total')}</span>
                    <span className="text-brand">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-text-muted">
                    <span>{t('shopBooking.duration')}</span>
                    <span>{formatDuration(totalDuration)}</span>
                </div>
            </div>

            {/* Payment Method */}
            {(settings?.allow_cash_payment || settings?.allow_qr_payment) && (
                <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t('shopBooking.payment')}
                    </h3>
                    <div className="space-y-3">
                        {settings?.allow_cash_payment && (
                            <label
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[56px]",
                                    booking.paymentMethod === "CASH"
                                        ? "border-brand bg-brand/5"
                                        : "border-surface-border hover:border-brand/40"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={booking.paymentMethod === "CASH"}
                                    onChange={() => onChangePayment("CASH")}
                                    className="sr-only"
                                />
                                <div
                                    className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                        booking.paymentMethod === "CASH" ? "border-brand" : "border-surface-border"
                                    )}
                                >
                                    {booking.paymentMethod === "CASH" && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                                    )}
                                </div>
                                <span className="font-medium text-text-main">{t('shopBooking.payCash')}</span>
                            </label>
                        )}
                        {settings?.allow_qr_payment && (
                            <>
                                <label
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[56px]",
                                        booking.paymentMethod === "QR"
                                            ? "border-brand bg-brand/5"
                                            : "border-surface-border hover:border-brand/40"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="payment"
                                        checked={booking.paymentMethod === "QR"}
                                        onChange={() => onChangePayment("QR")}
                                        className="sr-only"
                                    />
                                    <div
                                        className={cn(
                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                            booking.paymentMethod === "QR" ? "border-brand" : "border-surface-border"
                                        )}
                                    >
                                        {booking.paymentMethod === "QR" && (
                                            <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                                        )}
                                    </div>
                                    <span className="font-medium text-text-main">{t('shopBooking.payQR')}</span>
                                </label>

                                {booking.paymentMethod === "QR" && (
                                    <div className="mt-2 pl-3 ml-3 border-l-2 border-brand/20 space-y-4">
                                        {/* Company QR Display */}
                                        {settings.qr_image_url ? (
                                            <div className="bg-section p-4 rounded-lg flex flex-col items-center">
                                                <p className="text-sm font-medium text-text-main mb-2">{t('shopBooking.scanToPay')}</p>
                                                <div className="relative w-48 h-48 bg-surface rounded-lg shadow-sm border border-surface-border p-2">
                                                    <img
                                                        src={getImageUrl(settings.qr_image_url) || undefined}
                                                        alt={t('shopBooking.companyQrCode')}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-amber-50 text-amber-700 text-sm rounded-lg">
                                                {t('shopBooking.qrNotUploaded')}
                                            </div>
                                        )}

                                        {/* Proof Upload */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-text-main">
                                                {t('shopBooking.uploadProofLabel')}
                                            </label>

                                            <div className="flex items-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('qr-proof-upload')?.click()}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    {qrProofFile ? t('shopBooking.changeFile') : t('shopBooking.uploadFile')}
                                                </Button>
                                                <input
                                                    id="qr-proof-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        onChangeProof(file);
                                                    }}
                                                />
                                                {qrProofFile && (
                                                    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                        <Check className="h-3 w-3" />
                                                        <span className="truncate max-w-[150px]">{qrProofFile.name}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onChangeProof(null); }}
                                                            className="text-text-muted hover:text-rose-500 ml-1"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {!qrProofFile && (
                                                <p className="text-xs text-text-muted">
                                                    {t('shopBooking.uploadProofHint')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Notes */}
            <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                    {t('shopBooking.additionalNotes')}
                </h3>
                <textarea
                    value={booking.notes}
                    onChange={(e) => onChangeNotes(e.target.value)}
                    placeholder={t('shopBooking.notesPlaceholder2')}
                    className="w-full h-24 px-4 py-3 rounded-xl border-2 border-surface-border bg-surface text-text-main placeholder:text-text-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    {error}
                </div>
            )}

            <Button
                onClick={onSubmit}
                disabled={submitting}
                className="w-full bg-brand text-white hover:bg-brand-hover h-12 text-lg font-semibold"
            >
                {submitting ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t('shopBooking.booking')}
                    </>
                ) : (
                    t('shopBooking.confirmBooking')
                )}
            </Button>
        </div>
    );
}

// Main Booking Page
export default function BookingPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { company, services, staff, categories, settings, loading, error, slug } = useShop();
    const t = useT();
    const api = useApi();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [booking, setBooking] = useState<BookingState>({
        step: 1,
        services: [],
        staff: null,
        slot: null,
        paymentMethod: "NONE",
        notes: "",
    });
    const [qrProofFile, setQrProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [completedAfterSignIn, setCompletedAfterSignIn] = useState(false);
    const searchParams = useSearchParams();
    const preselectedServiceId = searchParams.get("serviceId");
    const preselectedStaffId = searchParams.get("staffId");
    const [preselectionApplied, setPreselectionApplied] = useState(false);
    const pendingBookingHandledRef = React.useRef(false);

    // Browse mode: service-first (default) or staff-first
    const [browseMode, setBrowseMode] = useState<BrowseMode>(
        preselectedStaffId ? "staff-first" : "service-first"
    );

    // Convert shop services to SelectedService format
    const selectableServices: SelectedService[] = services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price_cents: s.price_cents,
        duration_minutes: s.duration_minutes,
        category_id: s.category_id,
    }));

    // Convert shop staff to SelectedStaff format
    const selectableStaff: SelectedStaff[] = staff.map((s) => ({
        id: s.id,
        display_name: s.display_name,
        image_url: s.image_url,
        services: s.services,
    }));

    // In service-first mode: filter staff based on selected services
    const filteredStaff = useMemo(() => {
        if (browseMode === "staff-first") return selectableStaff;
        if (booking.services.length === 0) return selectableStaff;

        return selectableStaff.filter((staff) => {
            const staffServices = staff.services || [];
            return booking.services.every((service) => staffServices.includes(service.id));
        });
    }, [selectableStaff, booking.services, browseMode]);

    // In staff-first mode: filter services based on selected staff
    const filteredServices = useMemo(() => {
        if (browseMode === "service-first") return selectableServices;
        if (!booking.staff || booking.staff.id === "any") return selectableServices;

        const staffServiceIds = new Set(booking.staff.services || []);
        return selectableServices.filter((s) => staffServiceIds.has(s.id));
    }, [selectableServices, booking.staff, browseMode]);

    // Reset selected staff if they are no longer in the filtered list (service-first only)
    React.useEffect(() => {
        if (browseMode !== "service-first") return;
        if (booking.staff && booking.staff.id !== "any") {
            const isStillValid = filteredStaff.some((s) => s.id === booking.staff!.id);
            if (!isStillValid) {
                setBooking((prev) => ({ ...prev, staff: null }));
            }
        }
    }, [filteredStaff, booking.staff, browseMode]);

    // Pre-select from query params (stay on step 1, don't auto-advance)
    useEffect(() => {
        if (preselectionApplied || loading || services.length === 0) return;

        if (preselectedServiceId) {
            const serviceId = parseInt(preselectedServiceId, 10);
            const serviceToSelect = selectableServices.find((s) => s.id === serviceId);
            if (serviceToSelect && !booking.services.find((s) => s.id === serviceId)) {
                setBooking((prev) => ({
                    ...prev,
                    services: [serviceToSelect],
                }));
            }
        }

        if (preselectedStaffId) {
            const staffId = parseInt(preselectedStaffId, 10);
            const staffToSelect = selectableStaff.find((s) => s.id === staffId);
            if (staffToSelect) {
                setBooking((prev) => ({
                    ...prev,
                    staff: staffToSelect,
                }));
                setBrowseMode("staff-first");
            }
        }

        setPreselectionApplied(true);
    }, [preselectedServiceId, preselectedStaffId, loading, services.length, selectableServices, selectableStaff, preselectionApplied, booking.services]);

    // Handlers
    const toggleService = (service: SelectedService) => {
        setBooking((prev) => {
            const exists = prev.services.find((s) => s.id === service.id);
            return {
                ...prev,
                services: exists
                    ? prev.services.filter((s) => s.id !== service.id)
                    : [...prev.services, service],
            };
        });
    };

    const selectStaff = (staff: SelectedStaff) => {
        setBooking((prev) => ({ ...prev, staff }));
    };

    const selectSlot = (slot: SelectedSlot) => {
        setBooking((prev) => ({ ...prev, slot }));
    };

    const nextStep = () => {
        setBooking((prev) => ({ ...prev, step: Math.min(prev.step + 1, 4) as BookingStep }));
    };

    const prevStep = () => {
        setBooking((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) as BookingStep }));
    };

    // Handle browse mode toggle (only allowed at step 1)
    const handleToggleBrowseMode = (mode: BrowseMode) => {
        if (booking.step !== 1) return;
        setBrowseMode(mode);
        // Reset selections when switching modes
        setBooking((prev) => ({
            ...prev,
            services: [],
            staff: null,
            slot: null,
            step: 1 as BookingStep,
        }));
    };

    const canProceed = (): boolean => {
        if (browseMode === "service-first") {
            switch (booking.step) {
                case 1: return booking.services.length > 0;
                case 2: return true;
                case 3: return booking.slot !== null;
                case 4: return true;
                default: return false;
            }
        } else {
            // staff-first
            switch (booking.step) {
                case 1: return booking.staff !== null;
                case 2: return booking.services.length > 0;
                case 3: return booking.slot !== null;
                case 4: return true;
                default: return false;
            }
        }
    };

    const uploadQrProof = async (file: File, companyId: number): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('company_id', companyId.toString());

        const uploadRes = await fetch(resolveApiUrl('/upload/qr'), {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            throw new Error(t('shopBooking.uploadProofError'));
        }

        const uploadData = await uploadRes.json();
        if (uploadData.error || !uploadData?.data?.url) {
            throw new Error(uploadData.message || t('shopBooking.uploadProofError'));
        }

        return uploadData.data.url as string;
    };

    const deleteUploadedQrProof = React.useCallback(async (url: string) => {
        try {
            await fetch(resolveApiUrl('/upload/qr'), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
        } catch {
            // Best-effort cleanup: ignore delete failures.
        }
    }, []);

    const buildBookingPayload = async (): Promise<Omit<BookingRequest, "customer_id">> => {
        if (!booking.slot || !company) {
            throw new Error(t('shopBooking.bookingError'));
        }

        let qrProofUrl: string | undefined = undefined;
        if (booking.paymentMethod === 'QR') {
            if (!qrProofFile) {
                throw new Error(t('shopBooking.qrProofRequired'));
            }
            qrProofUrl = await uploadQrProof(qrProofFile, company.id);
        }

        return {
            company_id: company.id,
            staff_id: booking.staff && booking.staff.id !== 'any' ? booking.staff.id : booking.slot.staff_id,
            service_ids: booking.services.map((s) => s.id),
            start_at: `${booking.slot.date}T${booking.slot.time}:00`,
            payment_method: booking.paymentMethod,
            notes: booking.notes,
            qr_proof_image_url: qrProofUrl,
        };
    };

    const submitBookingPayload = React.useCallback(async (
        payload: Omit<BookingRequest, "customer_id">,
        customerId: string,
    ) => {
        const fullPayload: BookingRequest = {
            ...payload,
            customer_id: customerId,
        };
        await api.post("/booking/customer", fullPayload as unknown as Record<string, unknown>);
    }, [api]);

    useEffect(() => {
        if (authLoading || !user?.id || success || pendingBookingHandledRef.current) return;

        const pending = loadPendingBookingIntent();
        if (!pending || pending.slug !== slug) return;

        pendingBookingHandledRef.current = true;
        clearPendingBookingIntent();
        setSubmitting(true);
        setSubmitError(null);

        const payload: Omit<BookingRequest, "customer_id"> = {
            company_id: pending.company_id,
            staff_id: pending.staff_id,
            service_ids: pending.service_ids,
            start_at: pending.start_at,
            payment_method: pending.payment_method,
            notes: pending.notes,
            qr_proof_image_url: pending.qr_proof_image_url,
        };

        void (async () => {
            try {
                await submitBookingPayload(payload, user.id!);
                setCompletedAfterSignIn(true);
                setSuccess(true);
            } catch (err) {
                if (payload.qr_proof_image_url) {
                    await deleteUploadedQrProof(payload.qr_proof_image_url);
                }
                setSubmitError(err instanceof Error ? err.message : t('shopBooking.bookingError'));
            } finally {
                setSubmitting(false);
            }
        })();
    }, [authLoading, user, slug, success, submitBookingPayload, t, deleteUploadedQrProof]);

    const handleSubmit = async () => {
        if (!booking.slot || !company) return;

        setSubmitting(true);
        setSubmitError(null);
        let uploadedQrUrl: string | undefined;

        try {
            const payload = await buildBookingPayload();
            uploadedQrUrl = payload.qr_proof_image_url;

            if (!user?.id) {
                savePendingBookingIntent({
                    slug,
                    ...payload,
                    created_at: new Date().toISOString(),
                });
                router.push(buildSignInRedirectPath(`/shop/${slug}/book?resume=1`, slug));
                return;
            }

            await submitBookingPayload(payload, user.id);
            clearPendingBookingIntent();
            setSuccess(true);
        } catch (err) {
            if (uploadedQrUrl) {
                await deleteUploadedQrProof(uploadedQrUrl);
            }
            console.error("Booking failed:", err);
            setSubmitError(err instanceof Error ? err.message : t('shopBooking.bookingError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    if (error || !company) {
        return (
            <div className="max-w-md mx-auto mt-12 p-6 text-center">
                <h2 className="text-xl font-bold text-text-main mb-2">{t('shopBooking.unavailable')}</h2>
                <p className="text-text-muted">{error || t('shopBooking.shopNotFound')}</p>
                <Button className="mt-4 bg-brand text-white hover:bg-brand-hover" onClick={() => router.push(`/shop/${slug}`)}>
                    {t('shopBooking.returnToShop')}
                </Button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-12 p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.bookingConfirmed')}</h2>
                <p className="text-text-muted">
                    {completedAfterSignIn
                        ? t('shopBooking.bookingCompletedAfterSignIn')
                        : t('shopBooking.bookingConfirmedMessage')}
                </p>
                <div className="space-y-2">
                    <Button
                        className="bg-brand text-white w-full h-12"
                        onClick={() => router.push(appendShopParam("/me/appointments", slug))}
                    >
                        {t('shopBooking.viewMyBookings')}
                    </Button>
                    <Button variant="outline" className="w-full h-12" onClick={() => router.push(`/shop/${slug}`)}>
                        {t('shopBooking.backToShop')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    href={`/shop/${slug}`}
                    className="inline-flex items-center text-sm font-medium text-text-muted hover:text-brand transition-colors mb-4"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('shopBooking.backToShop')}
                </Link>
                <h1 className="text-3xl font-bold font-heading text-text-main">{t('shopBooking.bookAnAppointment')}</h1>
            </div>

            <StepIndicator currentStep={booking.step} browseMode={browseMode} />

            {/* Browse mode toggle — only visible at step 1 */}
            {booking.step === 1 && (
                <div className="flex items-center justify-center gap-1 mb-6 p-1 bg-slate-100 rounded-lg max-w-xs mx-auto">
                    <button
                        onClick={() => handleToggleBrowseMode("service-first")}
                        className={cn(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                            browseMode === "service-first"
                                ? "bg-white text-brand shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {t('shopBooking.browseByService')}
                    </button>
                    <button
                        onClick={() => handleToggleBrowseMode("staff-first")}
                        className={cn(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                            browseMode === "staff-first"
                                ? "bg-white text-brand shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {t('shopBooking.browseByStaff')}
                    </button>
                </div>
            )}

            <div className="min-h-[400px]">
                {/* Step 1: depends on browse mode */}
                <div style={{ display: booking.step === 1 ? 'block' : 'none' }}>
                    {browseMode === "service-first" ? (
                        <ServiceStep
                            services={selectableServices}
                            categories={categories}
                            selectedServices={booking.services}
                            onToggleService={toggleService}
                        />
                    ) : (
                        <StaffStep
                            staffList={selectableStaff}
                            selectedStaff={booking.staff}
                            onSelectStaff={selectStaff}
                        />
                    )}
                </div>
                {/* Step 2: the opposite of step 1 */}
                <div style={{ display: booking.step === 2 ? 'block' : 'none' }}>
                    {browseMode === "service-first" ? (
                        <StaffStep
                            staffList={filteredStaff}
                            selectedStaff={booking.staff}
                            onSelectStaff={selectStaff}
                        />
                    ) : (
                        <ServiceStep
                            services={filteredServices}
                            categories={categories}
                            selectedServices={booking.services}
                            onToggleService={toggleService}
                        />
                    )}
                </div>
                <div style={{ display: booking.step === 3 ? 'block' : 'none' }}>
                    <DateTimeStep
                        companyId={company.id}
                        selectedServices={booking.services}
                        selectedStaff={booking.staff}
                        selectedSlot={booking.slot}
                        onSelectSlot={selectSlot}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        timezone={company.timezone}
                    />
                </div>
                {booking.step === 4 && (
                    <ConfirmStep
                        booking={booking}
                        settings={settings}
                        qrProofFile={qrProofFile}
                        onChangePayment={(method) => setBooking((prev) => ({ ...prev, paymentMethod: method }))}
                        onChangeNotes={(notes) => setBooking((prev) => ({ ...prev, notes }))}
                        onChangeProof={setQrProofFile}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                        error={submitError}
                    />
                )}
            </div>

            <div className="mt-8 flex justify-between pt-6 border-t border-surface-border">
                {booking.step > 1 ? (
                    <Button variant="outline" onClick={prevStep} disabled={submitting}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {t('common.back')}
                    </Button>
                ) : (
                    <div />
                )}

                {booking.step < 4 ? (
                    <Button
                        onClick={nextStep}
                        disabled={!canProceed()}
                        className="bg-brand text-white hover:bg-brand-hover"
                    >
                        {t('common.next')}
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
