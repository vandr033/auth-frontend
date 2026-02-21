"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clock, DollarSign, User, Calendar, CreditCard, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { type AvailableDate, getTodayDateString } from "@/utils/business-hours";
import { ClosedBanner } from "@/components/shop/OpenStatusBadge";
import { getImageUrl } from "@/utils/image-url";
import { ShopSettings } from "@/types/shop";

// Helper to resolve API URL (duplicate of logic in ShopContext, consider exported helper)
const resolveApiUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "";
    return `${base}${url}`;
};

type BrowseMode = "service-first" | "staff-first";

// Step indicator component
function StepIndicator({ currentStep, browseMode }: { currentStep: BookingStep; browseMode: BrowseMode }) {
    const steps = browseMode === "service-first"
        ? [
            { num: 1, label: "Services" },
            { num: 2, label: "Staff" },
            { num: 3, label: "Date & Time" },
            { num: 4, label: "Confirm" },
        ]
        : [
            { num: 1, label: "Staff" },
            { num: 2, label: "Services" },
            { num: 3, label: "Date & Time" },
            { num: 4, label: "Confirm" },
        ];

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => (
                <React.Fragment key={step.num}>
                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                            currentStep === step.num
                                ? "bg-brand text-white"
                                : currentStep > step.num
                                    ? "bg-brand/20 text-brand"
                                    : "bg-surface-border text-text-muted"
                        )}
                    >
                        {currentStep > step.num ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <span className="h-5 w-5 flex items-center justify-center rounded-full border border-current text-xs">
                                {step.num}
                            </span>
                        )}
                        <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className="w-8 h-px bg-surface-border hidden sm:block" />
                    )}
                </React.Fragment>
            ))}
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
    const selectedIds = new Set(selectedServices.map((s) => s.id));

    // Group services by category
    const servicesByCategory = categories.map((cat) => ({
        category: cat,
        services: services.filter((s) => s.category_id === cat.id),
    }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">Select Services</h2>
                <p className="text-text-muted">Choose one or more services for your appointment</p>
            </div>

            {servicesByCategory.map(({ category, services: catServices }) => (
                <div key={category.id} className="space-y-3">
                    {categories.length > 1 && (
                        <h3 className="text-lg font-semibold text-text-main">{category.name}</h3>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {catServices.map((service) => {
                            const isSelected = selectedIds.has(service.id);
                            return (
                                <Card
                                    key={service.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:shadow-md",
                                        isSelected
                                            ? "border-brand ring-2 ring-brand/20"
                                            : "border-surface-border"
                                    )}
                                    onClick={() => onToggleService(service)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900">{service.name}</h4>
                                                {service.description && (
                                                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                                        {service.description}
                                                    </p>
                                                )}
                                                <div className="flex gap-3 mt-2 text-sm">
                                                    <span className="flex items-center gap-1 text-brand">
                                                        <DollarSign className="h-3 w-3" />
                                                        {formatPrice(service.price_cents)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDuration(service.duration_minutes)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={cn(
                                                    "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                                    isSelected
                                                        ? "bg-brand border-brand text-white"
                                                        : "border-slate-300"
                                                )}
                                            >
                                                {isSelected && <Check className="h-4 w-4" />}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}

            {services.length === 0 && (
                <p className="text-center text-text-muted py-8">No services available.</p>
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
    const anyAvailableOption: SelectedStaff = {
        id: "any",
        display_name: "Any available",
    };

    const options = [anyAvailableOption, ...staffList];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">Select Staff</h2>
                <p className="text-text-muted">Choose a specific staff member or let us assign one</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((staff) => {
                    const isSelected = selectedStaff?.id === staff.id;
                    return (
                        <Card
                            key={staff.id}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                isSelected
                                    ? "border-brand ring-2 ring-brand/20"
                                    : "border-surface-border"
                            )}
                            onClick={() => onSelectStaff(staff)}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div
                                    className={cn(
                                        "h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0",
                                        staff.id === "any"
                                            ? "bg-brand/10 text-brand"
                                            : "bg-slate-100 text-slate-600"
                                    )}
                                >
                                    {staff.id === "any" ? (
                                        <User className="h-6 w-6" />
                                    ) : staff.image_url ? (
                                        <img
                                            src={getImageUrl(staff.image_url) || undefined}
                                            alt={staff.display_name}
                                            className="h-full w-full object-cover rounded-full"
                                        />
                                    ) : (
                                        staff.display_name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900">{staff.display_name}</h4>
                                    {staff.id === "any" && (
                                        <p className="text-sm text-slate-500">First available team member</p>
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                        isSelected
                                            ? "bg-brand border-brand text-white"
                                            : "border-slate-300"
                                    )}
                                >
                                    {isSelected && <Check className="h-4 w-4" />}
                                </div>
                            </CardContent>
                        </Card>
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
                <h2 className="text-2xl font-bold text-text-main">Select Date & Time</h2>
                <p className="text-text-muted">Choose when you would like your appointment</p>
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
                    <span className="ml-2 text-slate-500">Loading available dates...</span>
                </div>
            ) : dateOptions.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                    No available dates in the next 14 days. Please check back later.
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
                                        "flex flex-col items-center px-4 py-3 rounded-lg border transition-colors min-w-[70px]",
                                        isSelected
                                            ? "border-brand bg-brand text-white"
                                            : "border-surface-border bg-surface hover:border-brand/50"
                                    )}
                                >
                                    <span className="text-xs font-medium opacity-80">{date.dayName}</span>
                                    <span className="text-lg font-bold">{date.label.split(" ")[1]}</span>
                                    <span className="text-xs opacity-80">
                                        {isToday ? "Today" : date.label.split(" ")[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Time Slots */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                        <Calendar className="h-5 w-5" />
                        Available Times
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                            <span className="ml-2 text-slate-500">Loading available times...</span>
                        </div>
                    ) : slotsError ? (
                        <p className="text-center text-rose-500 py-8">{slotsError}</p>
                    ) : slots.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No available times for this date.</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {slots.map((slot, index) => {
                                const isSelected =
                                    selectedSlot?.date === selectedDate && selectedSlot?.time === slot.time;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectSlot(slot)}
                                        disabled={!slot.available}
                                        className={cn(
                                            "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            !slot.available
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed line-through"
                                                : isSelected
                                                    ? "bg-brand text-white"
                                                    : "bg-white border border-slate-200 text-slate-900 hover:border-brand"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
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
    const { totalPrice, totalDuration } = calculateBookingTotals(booking.services);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">Confirm Booking</h2>
                <p className="text-text-muted">Review your appointment details</p>
            </div>

            <Card className="border-slate-200">
                <CardContent className="p-6 space-y-4">
                    {/* Services Summary */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Services
                        </h3>
                        <div className="space-y-2">
                            {booking.services.map((service) => (
                                <div key={service.id} className="flex justify-between">
                                    <span className="text-slate-900">{service.name}</span>
                                    <span className="text-slate-500">{formatPrice(service.price_cents)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-surface-border" />

                    {/* Staff */}
                    <div className="flex justify-between">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            Staff
                        </span>
                        <span className="text-slate-900">{booking.staff?.display_name || "Any available"}</span>
                    </div>

                    {/* Date & Time */}
                    {booking.slot && (
                        <div className="flex justify-between">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                Date & Time
                            </span>
                            <span className="text-slate-900">
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
                        <span className="text-slate-900">Total</span>
                        <span className="text-brand">{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Duration</span>
                        <span>{formatDuration(totalDuration)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Method */}
            {(settings?.allow_cash_payment || settings?.allow_qr_payment) && (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                            <CreditCard className="h-5 w-5" />
                            Payment Method
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {settings?.allow_cash_payment && (
                            <label
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                    booking.paymentMethod === "CASH"
                                        ? "border-brand bg-brand/5"
                                        : "border-slate-200 hover:border-brand/50"
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
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                        booking.paymentMethod === "CASH" ? "border-brand" : "border-slate-300"
                                    )}
                                >
                                    {booking.paymentMethod === "CASH" && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                                    )}
                                </div>
                                <span className="font-medium text-slate-900">Pay with Cash</span>
                            </label>
                        )}
                        {settings?.allow_qr_payment && (
                            <>
                                <label
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                        booking.paymentMethod === "QR"
                                            ? "border-brand bg-brand/5"
                                            : "border-slate-200 hover:border-brand/50"
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
                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                            booking.paymentMethod === "QR" ? "border-brand" : "border-slate-300"
                                        )}
                                    >
                                        {booking.paymentMethod === "QR" && (
                                            <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                                        )}
                                    </div>
                                    <span className="font-medium text-slate-900">Pay with QR Code</span>
                                </label>

                                {booking.paymentMethod === "QR" && (
                                    <div className="mt-2 pl-3 ml-3 border-l-2 border-brand/20 space-y-4">
                                        {/* Company QR Display */}
                                        {settings.qr_image_url ? (
                                            <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center">
                                                <p className="text-sm font-medium text-slate-700 mb-2">Scan to Pay</p>
                                                <div className="relative w-48 h-48 bg-white rounded-lg shadow-sm border p-2">
                                                    <img
                                                        src={getImageUrl(settings.qr_image_url) || undefined}
                                                        alt="Company QR Code"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-amber-50 text-amber-700 text-sm rounded-lg">
                                                Payment details available but QR code not uploaded. Please ask staff for details.
                                            </div>
                                        )}

                                        {/* Proof Upload */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Upload Payment Proof (Screenshot)
                                            </label>

                                            <div className="flex items-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('qr-proof-upload')?.click()}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    {qrProofFile ? "Change File" : "Upload File"}
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
                                                            className="text-slate-400 hover:text-rose-500 ml-1"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {!qrProofFile && (
                                                <p className="text-xs text-slate-500">
                                                    Please upload a screenshot of your successful transaction.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Additional Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                    <textarea
                        value={booking.notes}
                        onChange={(e) => onChangeNotes(e.target.value)}
                        placeholder="Any special requests or notes for your appointment..."
                        className="w-full h-24 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                </CardContent>
            </Card>

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
                        Booking...
                    </>
                ) : (
                    "Confirm Booking"
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
    const searchParams = useSearchParams();
    const preselectedServiceId = searchParams.get("serviceId");
    const preselectedStaffId = searchParams.get("staffId");
    const [preselectionApplied, setPreselectionApplied] = useState(false);

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

    const { totalPrice, totalDuration } = calculateBookingTotals(booking.services);

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

    const handleSubmit = async () => {
        if (!user) {
            router.push(`/auth/sign-in?redirect=/shop/${slug}/book`);
            return;
        }

        if (!booking.slot || !company) return;

        // Validation for QR Proof
        if (booking.paymentMethod === 'QR' && !qrProofFile) {
            setSubmitError("Please upload a payment proof for QR payment.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            let qrProofUrl: string | undefined = undefined;

            // Upload QR proof if present (moved outside nested if)
            if (booking.paymentMethod === 'QR' && qrProofFile) {
                const formData = new FormData();
                formData.append('image', qrProofFile);
                formData.append('company_id', company.id.toString());

                const uploadRes = await fetch(resolveApiUrl('/upload/qr'), {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload payment proof. Please try again.");
                }

                const uploadData = await uploadRes.json();

                // Check for upload errors
                if (uploadData.error) {
                    throw new Error(uploadData.message || "Failed to upload QR code");
                }

                qrProofUrl = uploadData.data.url; // Note: .data.url not .url
            }

            if (!user.id) throw new Error("User ID is missing");

            const payload: BookingRequest = {
                company_id: company.id,
                staff_id: booking.staff && booking.staff.id !== 'any' ? booking.staff.id : booking.slot.staff_id,
                customer_id: user.id,
                service_ids: booking.services.map((s) => s.id),
                start_at: `${booking.slot.date}T${booking.slot.time}:00`,
                payment_method: booking.paymentMethod,
                notes: booking.notes,
                qr_proof_image_url: qrProofUrl,
            };

            await api.post("/booking/customer", payload as unknown as Record<string, unknown>);
            setSuccess(true);
        } catch (err: any) {
            console.error("Booking failed:", err);
            setSubmitError(err.message || "Failed to create booking. Please try again.");
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
                <p className="text-slate-500">{error || "Shop not found"}</p>
                <Button className="mt-4" onClick={() => router.push(`/shop/${slug}`)}>
                    Return to Shop
                </Button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-12 p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
                <p className="text-slate-500">
                    Your appointment has been successfully scheduled. We have sent a confirmation email to your
                    inbox.
                </p>
                <Button className="bg-brand text-white w-full" onClick={() => router.push(`/shop/${slug}`)}>
                    Return to Shop
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    href={`/shop/${slug}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-brand transition-colors mb-4"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Shop
                </Link>
                <h1 className="text-3xl font-bold text-text-main">Book an Appointment</h1>
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
                        Browse by Service
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
                        Browse by Staff
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
                        Back
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
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
