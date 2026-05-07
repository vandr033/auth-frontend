"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clock, User, Calendar, CreditCard, Loader2, Upload, DoorOpen, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShop } from "../../contexts/ShopContext";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import type {
    BookingStep,
    BookingState,
    BookingScheduleSlot,
    BookingServiceGroup,
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
    getServiceDisplayPriceCents,
    getServiceRegularPriceCents,
} from "@/types/booking";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { type AvailableDate, getTodayDateString } from "@/utils/business-hours";
import { ClosedBanner } from "@/components/shop/OpenStatusBadge";
import { getImageUrl } from "@/utils/image-url";
import { ShopSettings } from "@/types/shop";
import { appendShopParam, buildSignInRedirectPath } from "@/app/lib/shop-context";
import { parseMarketplaceBookingHandoff } from "@/lib/marketplace/handoff";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { QrProofPreview } from "@/app/shop/components/QrProofPreview";
import { getShopPublicFeatures } from "@/lib/storefront/public-features";

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

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)/;
const SLOT_UNAVAILABLE_PATTERN = /(slot|time slot|hora(?:rio)?|occupied|ocupad|conflict|reserved)/i;
const STAFF_UNAVAILABLE_PATTERN = /(staff|barber|professional|employee|personal)/i;
const SERVICE_UNAVAILABLE_PATTERN = /(service|servicio)/i;

const toMinutes = (time: string): number | null => {
    const match = time.match(TIME_PATTERN);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

type PendingBookingIntent = {
    slug: string;
} & Omit<BookingRequest, "customer_id"> & {
    created_at: string;
};

type BlockedSlotInterval = {
    endAt: Date;
    startAt: Date;
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

type BookingScheduleItem = {
    key: string;
    groupId: string;
    title: string;
    subtitle: string;
    group: BookingServiceGroup;
    sessionIndex: number | null;
    sessionCount: number | null;
};

function buildScheduleSlotKey(groupId: string, sessionIndex: number | null) {
    return `${groupId}::${sessionIndex ?? 1}`;
}

function buildSlotDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`);
}

function doIntervalsOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
) {
    return startA < endB && endA > startB;
}

function getGroupSlotDurationMinutes(group: BookingServiceGroup) {
    if (group.isMultiSession) {
        return group.sessionDurationMinutes;
    }

    return group.services.reduce(
        (total, service) => total + service.duration_minutes,
        0,
    );
}

function getEligiblePrimaryStaffForGroup(
    group: BookingServiceGroup,
    staffList: SelectedStaff[],
) {
    return staffList.filter((staff) => {
        if (staff.resource_type === "ROOM" || staff.resource_type === "EQUIPMENT") {
            return false;
        }

        const staffServices = staff.services || [];
        return group.services.every((service) => staffServices.includes(service.id));
    });
}

function canGroupScheduleWithoutSharedStaffSelection(
    group: BookingServiceGroup,
    staffList: SelectedStaff[],
) {
    if (group.fixedStaff || group.fixedSecondaryStaff) {
        return true;
    }

    return getEligiblePrimaryStaffForGroup(group, staffList).length > 0;
}

function resolveRequiredResourcesForService(
    service: SelectedService,
    staffList: SelectedStaff[],
) {
    const requiredStaff = staffList.filter(
        (staff) =>
            typeof staff.id === "number" &&
            (service.required_resource_ids ?? []).includes(staff.id),
    );
    return {
        primary:
            requiredStaff.find(
                (staff) =>
                    staff.resource_type !== "ROOM" &&
                    staff.resource_type !== "EQUIPMENT",
            ) ?? null,
        secondary:
            requiredStaff.find(
                (staff) =>
                    staff.resource_type === "ROOM" ||
                    staff.resource_type === "EQUIPMENT",
            ) ?? null,
    };
}

function buildBookingServiceGroups(params: {
    services: SelectedService[];
    selectedStaff: SelectedStaff | null;
    staffList: SelectedStaff[];
}): BookingServiceGroup[] {
    const groups = new Map<string, BookingServiceGroup>();

    for (const service of params.services) {
        const required = resolveRequiredResourcesForService(service, params.staffList);
        const fixedStaff =
            required.primary ??
            (params.selectedStaff && params.selectedStaff.id !== "any"
                ? params.selectedStaff
                : null);
        const fixedSecondary = required.secondary ?? null;
        const isMultiSession = service.is_multi_session === true;
        const sessionCount = isMultiSession
            ? Math.max(service.session_count ?? 0, 1)
            : 1;
        const sessionDurationMinutes = isMultiSession
            ? Math.max(service.session_duration_minutes ?? 0, 1)
            : service.duration_minutes;
        const key = isMultiSession
            ? [
                "multi",
                service.id,
                fixedStaff?.id ?? "any",
                fixedSecondary?.id ?? "none",
              ].join(":")
            : [
                "single",
                fixedStaff?.id ?? "any",
                fixedSecondary?.id ?? "none",
              ].join(":");

        const existing = groups.get(key);
        if (existing && !isMultiSession) {
            existing.services.push(service);
            existing.label = existing.services.map((item) => item.name).join(" + ");
            continue;
        }

        groups.set(key, {
            id: key,
            label: service.name,
            services: [service],
            fixedStaff,
            fixedSecondaryStaff: fixedSecondary,
            isMultiSession,
            sessionCount,
            sessionDurationMinutes,
        });
    }

    return Array.from(groups.values()).map((group) => ({
        ...group,
        label: group.services.map((service) => service.name).join(" + "),
    }));
}

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
    currency,
    onToggleService,
}: {
    services: SelectedService[];
    categories: { id: number; name: string }[];
    selectedServices: SelectedService[];
    currency?: string | null;
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
                                            <div className="flex flex-col items-end text-right">
                                                <span className="text-sm font-bold text-brand flex-shrink-0">
                                                    {formatPrice(getServiceDisplayPriceCents(service), currency)}
                                                </span>
                                                {getServiceRegularPriceCents(service) ? (
                                                    <span className="text-xs text-text-muted line-through">
                                                        {formatPrice(getServiceRegularPriceCents(service) ?? 0, currency)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        {service.description && (
                                            <p className="text-sm text-text-muted line-clamp-1 mt-0.5">
                                                {service.description}
                                            </p>
                                        )}
                                        {service.pricing?.promo_applied ? (
                                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-500">
                                                {service.pricing.promo_label || t('shopServices.promo')}
                                            </p>
                                        ) : null}
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
    staffLabel,
}: {
    staffList: SelectedStaff[];
    selectedStaff: SelectedStaff | null;
    onSelectStaff: (staff: SelectedStaff) => void;
    staffLabel: string;
}) {
    const t = useT();
    const hasStaffAvailable = staffList.length > 0;
    const anyAvailableOption: SelectedStaff = {
        id: "any",
        display_name: t('shopBooking.anyAvailable'),
    };

    const people = staffList.filter(s => s.resource_type !== 'ROOM' && s.resource_type !== 'EQUIPMENT');
    const roomsAndEquipment = staffList.filter(s => s.resource_type === 'ROOM' || s.resource_type === 'EQUIPMENT');
    const peopleOptions = people.length > 0 ? [anyAvailableOption, ...people] : [];

    function StaffGrid({ items }: { items: SelectedStaff[] }) {
        return (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((staff) => {
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
                                ) : staff.resource_type === 'ROOM' ? (
                                    <DoorOpen className="h-7 w-7" />
                                ) : staff.resource_type === 'EQUIPMENT' ? (
                                    <Wrench className="h-7 w-7" />
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
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-main">{t('shopBooking.selectStaffTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.selectStaffSubtitle')}</p>
                {hasStaffAvailable && (
                    <p className="text-xs text-text-muted mt-1.5">
                        {t('shopBooking.anyAvailableExplanation', { label: staffLabel.toLowerCase() })}
                    </p>
                )}
            </div>

            {hasStaffAvailable ? (
                <div className="space-y-8">
                    {peopleOptions.length > 0 && (
                        <div className="space-y-3">
                            {roomsAndEquipment.length > 0 && (
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                                    {t('shopBooking.staffSection')}
                                </h3>
                            )}
                            <StaffGrid items={peopleOptions} />
                        </div>
                    )}
                    {roomsAndEquipment.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                                {t('shopBooking.roomsEquipmentSection')}
                            </h3>
                            <StaffGrid items={roomsAndEquipment} />
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-center text-text-muted py-8">{t('shopBooking.noStaffAvailable', { label: staffLabel.toLowerCase() })}</p>
            )}
        </div>
    );
}

// Step 3: Date & Time Selection
function DateTimeStep({
    companyId,
    isActive,
    selectedServices,
    selectedStaff,
    selectedSecondaryStaff,
    selectedSlot,
    onSelectSlot,
    selectedDate,
    onSelectDate,
    timezone,
    preferredSlotTime,
    marketplacePrefillEnabled,
    maxAdvanceDays,
    minAdvanceMinutes,
    defaultTimeViewMode,
    slotDurationMinutes,
    blockedIntervals,
    refreshVersion,
    title,
    subtitle,
    ignoreMaxAdvanceLimit,
}: {
    companyId: number;
    isActive: boolean;
    selectedServices: SelectedService[];
    selectedStaff: SelectedStaff | null;
    selectedSecondaryStaff: SelectedStaff | null;
    selectedSlot: SelectedSlot | null;
    onSelectSlot: (slot: SelectedSlot) => void;
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
    timezone?: string;
    preferredSlotTime?: string | null;
    marketplacePrefillEnabled?: boolean;
    maxAdvanceDays?: number | null;
    minAdvanceMinutes?: number | null;
    defaultTimeViewMode?: "all" | "hour";
    slotDurationMinutes: number;
    blockedIntervals?: BlockedSlotInterval[];
    refreshVersion?: number;
    title?: string;
    subtitle?: string;
    ignoreMaxAdvanceLimit?: boolean;
}) {
    const t = useT();
    const resolvedDefaultTimeViewMode = defaultTimeViewMode === "all" ? "all" : "hour";
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [loadingDates, setLoadingDates] = useState(true);
    const [datesError, setDatesError] = useState<string | null>(null);
    const [datePage, setDatePage] = useState(0);
    const [timeViewMode, setTimeViewMode] = useState<"all" | "hour">(resolvedDefaultTimeViewMode);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const hasLoadedDates = React.useRef(false);
    const prefillSlotAppliedRef = React.useRef(false);
    const latestSlotsRequestIdRef = React.useRef(0);
    const api = useApi();
    const selectedServiceIds = useMemo(
        () => selectedServices.map((service) => service.id).join(","),
        [selectedServices],
    );
    const effectiveBlockedIntervals = useMemo(
        () => blockedIntervals ?? [],
        [blockedIntervals],
    );
    const blockedIntervalsKey = useMemo(
        () =>
            effectiveBlockedIntervals
                .map((interval) => `${interval.startAt.toISOString()}-${interval.endAt.toISOString()}`)
                .join("|"),
        [effectiveBlockedIntervals],
    );
    const selectedStaffId = selectedStaff?.id === "any" ? "" : selectedStaff?.id ?? "";
    const selectedSecondaryStaffId = selectedSecondaryStaff?.id ?? "";

    React.useEffect(() => {
        setTimeViewMode(resolvedDefaultTimeViewMode);
    }, [resolvedDefaultTimeViewMode]);

    // Fetch available dates on mount (only once)
    React.useEffect(() => {
        if (!isActive) return;
        if (hasLoadedDates.current) return;

        const fetchAvailableDates = async () => {
            hasLoadedDates.current = true;
            setLoadingDates(true);
            setDatesError(null);
            try {
                const fetchDays = ignoreMaxAdvanceLimit ? 365 : maxAdvanceDays ?? 14;
                const response = await api.get<{ data: { dates: AvailableDate[]; timezone: string } }>(
                    `/booking/available-dates?company_id=${companyId}&days=${fetchDays}${ignoreMaxAdvanceLimit ? "&ignore_max_advance=1" : ""}`
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
                setAvailableDates([]);
                setDatesError(err instanceof Error ? err.message : "No pudimos cargar las fechas disponibles.");
            } finally {
                setLoadingDates(false);
            }
        };

        void fetchAvailableDates();
    }, [api, companyId, ignoreMaxAdvanceLimit, isActive, maxAdvanceDays, onSelectDate, selectedDate]);

    const dateOptions = useMemo(() => {
        const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
        return availableDates
            .filter((d) => d.is_open)
            .map((d) => {
                const date = new Date(`${d.date}T12:00:00`);
                return {
                    value: d.date,
                    dayName: date.toLocaleDateString(locale, { weekday: "short" }),
                    dayNumber: date.toLocaleDateString(locale, { day: "numeric" }),
                    monthLabel: date.toLocaleDateString(locale, { month: "short" }),
                    label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
                };
            });
    }, [availableDates]);

    const datesPerPage = 7;
    const maxDatePage = Math.max(0, Math.ceil(dateOptions.length / datesPerPage) - 1);
    const pagedDateOptions = useMemo(() => {
        const start = datePage * datesPerPage;
        return dateOptions.slice(start, start + datesPerPage);
    }, [dateOptions, datePage]);

    React.useEffect(() => {
        setDatePage((prev) => Math.min(prev, maxDatePage));
    }, [maxDatePage]);

    React.useEffect(() => {
        if (!selectedDate) return;
        const selectedIndex = dateOptions.findIndex((d) => d.value === selectedDate);
        if (selectedIndex < 0) return;
        const page = Math.floor(selectedIndex / datesPerPage);
        setDatePage(page);
    }, [selectedDate, dateOptions]);

    // Get today's date for comparison
    const today = getTodayDateString(timezone);

    // Fetch available slots when date changes
    React.useEffect(() => {
        if (!isActive || !selectedDate || selectedServiceIds.length === 0) return;

        const controller = new AbortController();
        const requestId = latestSlotsRequestIdRef.current + 1;
        latestSlotsRequestIdRef.current = requestId;
        let timedOut = false;
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, 15000);

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setSlotsError(null);
            setSlots([]);

            try {
                const response = await api.get<{ data: TimeSlot[] }>(
                    `/booking/slots?company_id=${companyId}&date=${selectedDate}&service_ids=${selectedServiceIds}${selectedStaffId ? `&staff_id=${selectedStaffId}` : ""}${selectedSecondaryStaffId ? `&secondary_staff_id=${selectedSecondaryStaffId}` : ""}`,
                    { signal: controller.signal },
                );

                let fetchedSlots = response.data || [];

                // Filter out slots that violate min_advance_booking_hours
                if (minAdvanceMinutes && selectedDate) {
                    const now = new Date();
                    const minMs = minAdvanceMinutes * 60 * 1000;
                    fetchedSlots = fetchedSlots.map((slot) => {
                        const slotDate = buildSlotDateTime(selectedDate, slot.time);
                        if (slotDate.getTime() - now.getTime() < minMs) {
                            return { ...slot, available: false };
                        }
                        return slot;
                    });
                }

                if (selectedDate && effectiveBlockedIntervals.length > 0) {
                    fetchedSlots = fetchedSlots.map((slot) => {
                        if (!slot.available) return slot;

                        const slotStart = buildSlotDateTime(selectedDate, slot.time);
                        const slotEnd = new Date(
                            slotStart.getTime() + slotDurationMinutes * 60 * 1000,
                        );
                        const overlapsBlockedInterval = effectiveBlockedIntervals.some((interval) =>
                            doIntervalsOverlap(
                                slotStart,
                                slotEnd,
                                interval.startAt,
                                interval.endAt,
                            ),
                        );

                        return overlapsBlockedInterval
                            ? { ...slot, available: false }
                            : slot;
                    });
                }

                if (latestSlotsRequestIdRef.current !== requestId) return;
                setSlots(fetchedSlots);
            } catch (err) {
                if (latestSlotsRequestIdRef.current !== requestId) return;
                if (controller.signal.aborted && !timedOut) return;
                setSlotsError(err instanceof Error ? err.message : "No pudimos cargar los horarios disponibles.");
            } finally {
                window.clearTimeout(timeoutId);
                if (latestSlotsRequestIdRef.current !== requestId) return;
                if (timedOut) {
                    setSlotsError("La carga de horarios tardó demasiado. Volvé a elegir la fecha para reintentar.");
                }
                setLoadingSlots(false);
            }
        };

        void fetchSlots();

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [
        api,
        blockedIntervalsKey,
        companyId,
        effectiveBlockedIntervals,
        isActive,
        minAdvanceMinutes,
        selectedDate,
        selectedSecondaryStaffId,
        selectedServiceIds,
        selectedStaffId,
        slotDurationMinutes,
        refreshVersion,
    ]);

    const availableHours = useMemo(() => {
        const unique = new Set<number>();
        slots.forEach((slot) => {
            if (!slot.available) return;
            const hour = Number.parseInt(slot.time.split(":")[0], 10);
            if (!Number.isNaN(hour)) {
                unique.add(hour);
            }
        });
        return Array.from(unique).sort((a, b) => a - b);
    }, [slots]);

    React.useEffect(() => {
        if (timeViewMode !== "hour") return;
        if (availableHours.length === 0) {
            setSelectedHour(null);
            return;
        }
        if (selectedHour === null || !availableHours.includes(selectedHour)) {
            setSelectedHour(availableHours[0]);
        }
    }, [timeViewMode, availableHours, selectedHour]);

    const visibleSlots = useMemo(() => {
        if (timeViewMode !== "hour" || selectedHour === null) {
            return slots;
        }
        return slots.filter((slot) => {
            const hour = Number.parseInt(slot.time.split(":")[0], 10);
            return hour === selectedHour;
        });
    }, [slots, timeViewMode, selectedHour]);

    const availableVisibleSlots = useMemo(
        () => visibleSlots.filter((slot) => slot.available),
        [visibleSlots],
    );

    React.useEffect(() => {
        prefillSlotAppliedRef.current = false;
    }, [selectedDate, preferredSlotTime, marketplacePrefillEnabled]);

    React.useEffect(() => {
        if (!marketplacePrefillEnabled || prefillSlotAppliedRef.current) return;
        if (!selectedDate || !preferredSlotTime || loadingSlots) return;

        const availableSlots = slots.filter((slot) => slot.available);
        if (availableSlots.length === 0) return;

        let target = availableSlots.find((slot) => slot.time === preferredSlotTime) ?? null;
        if (!target) {
            const preferredMinutes = toMinutes(preferredSlotTime);
            if (preferredMinutes !== null) {
                target = availableSlots.reduce<TimeSlot | null>((best, slot) => {
                    const slotMinutes = toMinutes(slot.time);
                    if (slotMinutes === null) return best;
                    if (!best) return slot;
                    const bestMinutes = toMinutes(best.time);
                    if (bestMinutes === null) return slot;
                    return Math.abs(slotMinutes - preferredMinutes) < Math.abs(bestMinutes - preferredMinutes)
                        ? slot
                        : best;
                }, null);
            }
        }

        if (target) {
            onSelectSlot({
                date: selectedDate,
                time: target.time,
                staff_id: target.staff_id,
                staff_name: target.staff_name,
            });
            prefillSlotAppliedRef.current = true;
        }
    }, [loadingSlots, marketplacePrefillEnabled, onSelectSlot, preferredSlotTime, selectedDate, slots]);

    React.useEffect(() => {
        if (loadingSlots || !selectedDate) return;
        if (availableVisibleSlots.length !== 1) return;

        const onlySlot = availableVisibleSlots[0];
        const isAlreadySelected =
            selectedSlot?.date === selectedDate && selectedSlot?.time === onlySlot.time;
        if (isAlreadySelected) return;

        onSelectSlot({
            date: selectedDate,
            time: onlySlot.time,
            staff_id: onlySlot.staff_id,
            staff_name: onlySlot.staff_name,
        });
    }, [availableVisibleSlots, loadingSlots, onSelectSlot, selectedDate, selectedSlot]);

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
                <h2 className="text-2xl font-bold text-text-main">{title ?? t('shopBooking.selectDateTimeTitle')}</h2>
                <p className="text-text-muted">{t('shopBooking.selectDateTimeSubtitle')}</p>
                {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
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
            {datesError ? (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    {datesError}
                </div>
            ) : loadingDates ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-brand" />
                    <span className="ml-2 text-slate-500">{t('shopBooking.loadingDates')}</span>
                </div>
            ) : dateOptions.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                    {t('shopBooking.noDatesAvailable')}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            {pagedDateOptions.length > 0
                                ? `${pagedDateOptions[0].label} - ${pagedDateOptions[pagedDateOptions.length - 1].label}`
                                : ""}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={datePage === 0}
                                onClick={() => setDatePage((prev) => Math.max(0, prev - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={datePage === maxDatePage}
                                onClick={() => setDatePage((prev) => Math.min(maxDatePage, prev + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {pagedDateOptions.map((date) => {
                            const isSelected = selectedDate === date.value;
                            const isToday = date.value === today;
                            return (
                                <button
                                    key={date.value}
                                    onClick={() => onSelectDate(date.value)}
                                    className={cn(
                                        "flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center transition-all",
                                        isSelected
                                            ? "border-brand bg-brand text-white shadow-md"
                                            : "border-surface-border bg-surface hover:border-brand/50",
                                    )}
                                >
                                    <span className="text-[11px] font-semibold opacity-85">{date.dayName}</span>
                                    <span className="text-xl font-bold leading-none">{date.dayNumber}</span>
                                    <span className="mt-1 text-[10px] opacity-80">
                                        {isToday ? t('shopBooking.today') : date.monthLabel}
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
                <div className="mb-3 flex items-center gap-2">
                    <Button
                        type="button"
                        variant={timeViewMode === "hour" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeViewMode("hour")}
                        className={timeViewMode === "hour" ? "bg-brand hover:bg-brand-hover text-white" : ""}
                    >
                        {t('shopBooking.timeViewHour')}
                    </Button>
                    <Button
                        type="button"
                        variant={timeViewMode === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeViewMode("all")}
                        className={timeViewMode === "all" ? "bg-brand hover:bg-brand-hover text-white" : ""}
                    >
                        {t('shopBooking.timeViewAll')}
                    </Button>
                </div>
                {timeViewMode === "hour" && availableHours.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {availableHours.map((hour) => (
                            <Button
                                key={hour}
                                type="button"
                                variant={selectedHour === hour ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedHour(hour)}
                                className={selectedHour === hour ? "bg-brand hover:bg-brand-hover text-white" : ""}
                            >
                                {`${hour.toString().padStart(2, "0")}:00`}
                            </Button>
                        ))}
                    </div>
                )}
                {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        <span className="ml-2 text-text-muted">{t('shopBooking.loadingTimes')}</span>
                    </div>
                ) : slotsError ? (
                    <p className="text-center text-rose-500 py-8">{slotsError}</p>
                ) : visibleSlots.length === 0 ? (
                    <p className="text-center text-text-muted py-8">{t('shopBooking.noTimesAvailable')}</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {visibleSlots.map((slot, index) => {
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
    bookingGroups,
    scheduledSlots,
    settings,
    currency,
    qrProofFile,
    onChangePayment,
    onChangeNotes,
    onChangeProof,
    onSubmit,
    submitting,
    error,
}: {
    booking: BookingState;
    bookingGroups: BookingServiceGroup[];
    scheduledSlots: BookingScheduleSlot[];
    settings: ShopSettings | null;
    currency?: string | null;
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
    const orderedSlots = [...scheduledSlots].sort((left, right) => {
        const leftAt = new Date(`${left.date}T${left.time}:00`).getTime();
        const rightAt = new Date(`${right.date}T${right.time}:00`).getTime();
        return leftAt - rightAt;
    });

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
                                <div className="text-right">
                                    <span className="text-text-muted">
                                        {formatPrice(getServiceDisplayPriceCents(service), currency)}
                                    </span>
                                    {getServiceRegularPriceCents(service) ? (
                                        <p className="text-xs text-text-muted line-through">
                                            {formatPrice(getServiceRegularPriceCents(service) ?? 0, currency)}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-surface-border" />

                <div>
                    <span className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                        Agenda confirmada
                    </span>
                    <div className="mt-3 space-y-3">
                        {orderedSlots.map((slot) => (
                            <div key={slot.key} className="rounded-lg border border-surface-border bg-white/70 p-3">
                                <p className="font-medium text-text-main">{slot.groupLabel}</p>
                                <p className="mt-1 text-sm text-text-muted">
                                    {slot.sessionIndex && slot.sessionCount
                                        ? `Sesión ${slot.sessionIndex} de ${slot.sessionCount} · `
                                        : ""}
                                    {new Date(`${slot.date}T12:00:00`).toLocaleDateString("es-BO", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}{" "}
                                    · {slot.time} · {slot.staff_name}
                                </p>
                            </div>
                        ))}
                    </div>
                    {bookingGroups.length > 1 ? (
                        <p className="mt-3 text-sm text-text-muted">
                            Se crearán {bookingGroups.length} reservas vinculadas con una sola confirmación.
                        </p>
                    ) : null}
                </div>

                <hr className="border-surface-border" />

                {/* Total */}
                <div className="flex justify-between text-lg font-bold">
                    <span className="text-text-main">{t('shopBooking.total')}</span>
                    <span className="text-brand">{formatPrice(totalPrice, currency)}</span>
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
                                                {settings?.require_comprobante_for_qr === false && (
                                                    <span className="ml-1 text-xs font-normal text-text-muted">({t('shopBooking.optional')})</span>
                                                )}
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
                                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        onChangeProof(file);
                                                    }}
                                                />
                                                {qrProofFile && (
                                                    <QrProofPreview
                                                        file={qrProofFile}
                                                        alt={t('shopBooking.uploadProofLabel')}
                                                        removeLabel={t('shopBooking.removeProof')}
                                                        onRemove={() => onChangeProof(null)}
                                                    />
                                                )}
                                            </div>
                                            {!qrProofFile && (
                                                <p className="text-xs text-text-muted">
                                                    {settings?.require_comprobante_for_qr === false
                                                        ? t('shopBooking.uploadProofHintOptional')
                                                        : t('shopBooking.uploadProofHint')}
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
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { company, services, staff, categories, settings, loading, error, slug, isShopActive, publicFeatures } = useShop();
    const t = useT();
    const api = useApi();
    const bookingEnabled = getShopPublicFeatures(company).bookingsEnabled || publicFeatures.bookingsEnabled;
    const searchParamsString = searchParams?.toString() || "";
    const marketplaceHandoff = useMemo(
        () => parseMarketplaceBookingHandoff(new URLSearchParams(searchParamsString)),
        [searchParamsString],
    );
    const isMarketplaceSource = marketplaceHandoff.source === "marketplace";
    const preselectedServiceId = marketplaceHandoff.serviceId;
    const preselectedStaffId = marketplaceHandoff.staffId;
    const preselectedDate = marketplaceHandoff.date;
    const preselectedSlotTime = marketplaceHandoff.matchedSlotTime;
    const hasMarketplacePrefillData = Boolean(
        preselectedServiceId ||
        preselectedStaffId ||
        preselectedDate ||
        preselectedSlotTime ||
        marketplaceHandoff.requestedTime
    );
    const bookingSource: BookingRequest["booking_source"] = isMarketplaceSource ? "MARKETPLACE" : "SALON_SITE";
    const staffLabel = settings?.staff_label || 'Staff';

    const [selectedDate, setSelectedDate] = useState<string | null>(preselectedDate);
    const [schedulePage, setSchedulePage] = useState(0);
    const [booking, setBooking] = useState<BookingState>({
        step: 1,
        services: [],
        staff: null,
        secondaryStaff: null,
        slot: null,
        groupSlots: {},
        paymentMethod: "NONE",
        notes: "",
    });
    const [scheduleDates, setScheduleDates] = useState<Record<string, string | null>>({});
    const [qrProofFile, setQrProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [slotRefreshVersion, setSlotRefreshVersion] = useState(0);
    const [success, setSuccess] = useState(false);
    const [completedAfterSignIn, setCompletedAfterSignIn] = useState(false);
    const [preselectionApplied, setPreselectionApplied] = useState(false);
    const [prefillWarnings, setPrefillWarnings] = useState<string[]>([]);
    const [showMarketplacePrefillBanner, setShowMarketplacePrefillBanner] = useState(isMarketplaceSource && hasMarketplacePrefillData);
    const [marketplaceAutoAdvanceEnabled, setMarketplaceAutoAdvanceEnabled] = useState(isMarketplaceSource && hasMarketplacePrefillData);
    const pendingBookingHandledRef = React.useRef(false);
    const bookingStartedTrackedRef = React.useRef(false);

    // Browse mode: service-first (default) or staff-first
    const [browseMode, setBrowseMode] = useState<BrowseMode>(
        preselectedStaffId ? "staff-first" : "service-first"
    );

    useEffect(() => {
        setShowMarketplacePrefillBanner(isMarketplaceSource && hasMarketplacePrefillData);
        setMarketplaceAutoAdvanceEnabled(isMarketplaceSource && hasMarketplacePrefillData);
    }, [hasMarketplacePrefillData, isMarketplaceSource]);

    useEffect(() => {
        if (selectedDate || !preselectedDate) return;
        setSelectedDate(preselectedDate);
    }, [preselectedDate, selectedDate]);

    useEffect(() => {
        if (loading || !company || bookingStartedTrackedRef.current) return;
        bookingStartedTrackedRef.current = true;

        const source = bookingSource === "MARKETPLACE" ? "marketplace" : "salon_site";
        const eventDate = marketplaceHandoff.date || selectedDate || getTodayDateString(company.timezone);
        const eventTime = marketplaceHandoff.requestedTime || marketplaceHandoff.matchedSlotTime || undefined;

        void api.post("/marketplace/events", {
            event_name: "booking_started",
            source,
            company_id: company.id,
            service_type_id: marketplaceHandoff.serviceTypeId,
            date: eventDate,
            time: eventTime,
            surface: marketplaceHandoff.surface,
            metadata: {
                companySlug: slug,
                fromMarketplace: isMarketplaceSource,
                resume: searchParams?.get("resume") === "1",
                serviceId: marketplaceHandoff.serviceId,
                staffId: marketplaceHandoff.staffId,
            },
        }).catch(() => {
            // Non-blocking analytics failure.
        });
    }, [
        api,
        bookingSource,
        company,
        isMarketplaceSource,
        loading,
        marketplaceHandoff.date,
        marketplaceHandoff.matchedSlotTime,
        marketplaceHandoff.requestedTime,
        marketplaceHandoff.serviceId,
        marketplaceHandoff.serviceTypeId,
        marketplaceHandoff.staffId,
        marketplaceHandoff.surface,
        searchParams,
        selectedDate,
        slug,
    ]);

    // Convert shop services to SelectedService format
    const selectableServices: SelectedService[] = useMemo(
        () => services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price_cents: s.price_cents,
            promo_price_cents: s.promo_price_cents,
            promo_starts_at: s.promo_starts_at,
            promo_ends_at: s.promo_ends_at,
            promo_label: s.promo_label,
            duration_minutes: s.duration_minutes,
            is_multi_session: s.is_multi_session,
            session_count: s.session_count,
            session_duration_minutes: s.session_duration_minutes,
            category_id: s.category_id,
            pricing: s.pricing,
            required_resource_ids: s.required_resource_ids ?? [],
        })),
        [services],
    );

    // Convert shop staff to SelectedStaff format
    const selectableStaff: SelectedStaff[] = useMemo(
        () => staff.map((s) => ({
            id: s.id,
            display_name: s.display_name,
            image_url: s.image_url,
            services: s.services,
            resource_type: s.resource_type,
        })),
        [staff],
    );

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

    const bookingGroups = useMemo(
        () =>
            buildBookingServiceGroups({
                services: booking.services,
                selectedStaff: booking.staff,
                staffList: selectableStaff,
            }),
        [booking.services, booking.staff, selectableStaff],
    );

    const canScheduleGroupsIndependently = useMemo(
        () =>
            bookingGroups.length > 0 &&
            bookingGroups.every((group) =>
                canGroupScheduleWithoutSharedStaffSelection(group, selectableStaff),
            ),
        [bookingGroups, selectableStaff],
    );

    const shouldSkipSharedStaffStep = useMemo(
        () =>
            browseMode === "service-first" &&
            booking.services.length > 0 &&
            filteredStaff.length === 0 &&
            canScheduleGroupsIndependently,
        [
            booking.services.length,
            browseMode,
            canScheduleGroupsIndependently,
            filteredStaff.length,
        ],
    );
    const autoSkipsSharedStaffStep = useMemo(
        () =>
            browseMode === "service-first" &&
            booking.services.length > 0 &&
            (
                filteredStaff.length === 1 ||
                shouldSkipSharedStaffStep ||
                bookingGroups.every(
                    (group) => group.fixedStaff !== null || booking.staff !== null,
                )
            ),
        [
            booking.services.length,
            booking.staff,
            bookingGroups,
            browseMode,
            filteredStaff.length,
            shouldSkipSharedStaffStep,
        ],
    );

    const scheduleItems = useMemo<BookingScheduleItem[]>(
        () =>
            bookingGroups.flatMap((group) =>
                Array.from({ length: group.isMultiSession ? group.sessionCount : 1 }, (_, index) => {
                    const sessionIndex = group.isMultiSession ? index + 1 : null;
                    return {
                        key: buildScheduleSlotKey(group.id, sessionIndex),
                        groupId: group.id,
                        title:
                            group.isMultiSession && sessionIndex
                                ? `${group.label} · Sesión ${sessionIndex}`
                                : group.label,
                        subtitle: group.isMultiSession
                            ? `${group.sessionDurationMinutes} min por sesión`
                            : "Elegí fecha y hora para este grupo.",
                        group,
                        sessionIndex,
                        sessionCount: group.isMultiSession ? group.sessionCount : null,
                    };
                }),
            ),
        [bookingGroups],
    );

    const activeScheduleItem = scheduleItems[schedulePage] ?? null;
    const allScheduleItemsSelected = useMemo(
        () =>
            scheduleItems.length > 0 &&
            scheduleItems.every((item) => booking.groupSlots[item.key] !== null),
        [booking.groupSlots, scheduleItems],
    );

    const activeBlockedIntervals = useMemo(() => {
        if (!activeScheduleItem) return [];

        return scheduleItems.flatMap((item) => {
            if (item.key === activeScheduleItem.key) return [];

            const selectedSlot = booking.groupSlots[item.key];
            if (!selectedSlot) return [];

            const startAt = buildSlotDateTime(selectedSlot.date, selectedSlot.time);
            return [
                {
                    startAt,
                    endAt: new Date(
                        startAt.getTime() +
                            getGroupSlotDurationMinutes(item.group) * 60 * 1000,
                    ),
                },
            ];
        });
    }, [activeScheduleItem, booking.groupSlots, scheduleItems]);

    useEffect(() => {
        setScheduleDates((current) => {
            const next: Record<string, string | null> = {};
            scheduleItems.forEach((item) => {
                next[item.key] = current[item.key] ?? null;
            });

            if (
                Object.keys(next).length === Object.keys(current).length &&
                Object.keys(next).every((key) => next[key] === current[key])
            ) {
                return current;
            }

            return next;
        });

        setBooking((current) => {
            const nextGroupSlots: Record<string, BookingScheduleSlot | null> = {};
            scheduleItems.forEach((item) => {
                nextGroupSlots[item.key] = current.groupSlots[item.key] ?? null;
            });

            const sameKeys =
                Object.keys(nextGroupSlots).length ===
                    Object.keys(current.groupSlots).length &&
                Object.keys(nextGroupSlots).every(
                    (key) => nextGroupSlots[key] === current.groupSlots[key],
                );

            if (sameKeys) {
                return current;
            }

            const firstItem = scheduleItems[0];
            const firstSlot = firstItem ? nextGroupSlots[firstItem.key] : null;
            return {
                ...current,
                groupSlots: nextGroupSlots,
                slot: firstSlot
                    ? {
                        date: firstSlot.date,
                        time: firstSlot.time,
                        staff_id: firstSlot.staff_id,
                        staff_name: firstSlot.staff_name,
                    }
                    : null,
            };
        });
    }, [scheduleItems]);

    useEffect(() => {
        setSchedulePage((current) => {
            if (scheduleItems.length === 0) return 0;
            return Math.min(current, scheduleItems.length - 1);
        });
    }, [scheduleItems.length]);

    useEffect(() => {
        if (!preselectedDate || scheduleItems.length === 0) return;
        const firstKey = scheduleItems[0]?.key;
        if (!firstKey) return;
        setScheduleDates((current) =>
            current[firstKey]
                ? current
                : {
                    ...current,
                    [firstKey]: preselectedDate,
                },
        );
    }, [preselectedDate, scheduleItems]);

    // Auto-apply required resources from selected services (service-first mode)
    React.useEffect(() => {
        if (browseMode !== "service-first" || booking.services.length === 0) return;

        const primaryIds = new Set<number>();
        const secondaryIds = new Set<number>();
        booking.services.forEach((service) => {
            const required = resolveRequiredResourcesForService(service, selectableStaff);
            if (required.primary && typeof required.primary.id === "number") {
                primaryIds.add(required.primary.id);
            }
            if (required.secondary && typeof required.secondary.id === "number") {
                secondaryIds.add(required.secondary.id);
            }
        });

        const requiredPerson =
            primaryIds.size === 1
                ? selectableStaff.find((staff) => staff.id === Array.from(primaryIds)[0]) ?? null
                : null;
        const requiredRoom =
            secondaryIds.size === 1
                ? selectableStaff.find((staff) => staff.id === Array.from(secondaryIds)[0]) ?? null
                : null;

        setBooking((prev) => {
            const nextStaff = requiredPerson ?? prev.staff;
            const nextSecondary = requiredRoom;
            if (prev.staff?.id === nextStaff?.id && prev.secondaryStaff?.id === nextSecondary?.id) return prev;
            return { ...prev, staff: nextStaff ?? prev.staff, secondaryStaff: nextSecondary, slot: null };
        });
    }, [booking.services, browseMode, selectableStaff]);

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

    React.useEffect(() => {
        if (browseMode !== "service-first") return;
        if (booking.step !== 2) return;

        // If service has required resources that fully determine the staff, auto-advance
        const allGroupsHaveFixedScheduling = bookingGroups.length > 0 && bookingGroups.every(
            (group) => group.fixedStaff !== null || booking.staff !== null,
        );
        if (allGroupsHaveFixedScheduling) {
            setBooking((prev) => ({ ...prev, slot: null, step: 3 }));
            return;
        }

        if (shouldSkipSharedStaffStep) {
            setBooking((prev) => ({ ...prev, staff: null, slot: null, step: 3 }));
            return;
        }

        if (filteredStaff.length !== 1) return;
        const [onlyStaff] = filteredStaff;
        setBooking((prev) => ({
            ...prev,
            staff: onlyStaff,
            slot: null,
            step: 3,
        }));
    }, [
        booking.step,
        booking.staff,
        booking.services,
        bookingGroups,
        browseMode,
        filteredStaff,
        shouldSkipSharedStaffStep,
    ]);

    // Pre-select from marketplace handoff params.
    useEffect(() => {
        if (preselectionApplied || loading || services.length === 0) return;

        const warnings: string[] = [];
        let serviceToSelect: SelectedService | null = null;
        let staffToSelect: SelectedStaff | null = null;

        if (preselectedServiceId) {
            serviceToSelect = selectableServices.find((s) => s.id === preselectedServiceId) || null;
            if (!serviceToSelect && isMarketplaceSource) {
                warnings.push("El servicio elegido desde Marketplace ya no está disponible. Elegí otro para continuar.");
            }
        }

        if (preselectedStaffId) {
            staffToSelect = selectableStaff.find((s) => s.id === preselectedStaffId) || null;
            if (!staffToSelect && isMarketplaceSource) {
                warnings.push("El profesional preseleccionado ya no está disponible. Vamos a usar el primero que tenga horario.");
            }
        }

        if (serviceToSelect || staffToSelect) {
            setBooking((prev) => {
                const next = { ...prev };
                if (serviceToSelect && !prev.services.some((s) => s.id === serviceToSelect?.id)) {
                    next.services = [serviceToSelect];
                }
                if (staffToSelect) {
                    next.staff = staffToSelect;
                }
                return next;
            });
        }

        if (staffToSelect) {
            setBrowseMode("staff-first");
        }
        if (warnings.length > 0) {
            setPrefillWarnings(warnings);
        }

        setPreselectionApplied(true);
    }, [
        preselectedServiceId,
        preselectedStaffId,
        loading,
        services.length,
        selectableServices,
        selectableStaff,
        preselectionApplied,
        isMarketplaceSource,
    ]);

    // Marketplace fallback: if no valid staff is preselected, default to "any available".
    useEffect(() => {
        if (!isMarketplaceSource || !preselectionApplied) return;
        if (booking.services.length === 0 || booking.staff || filteredStaff.length === 0) return;
        setBooking((prev) => ({
            ...prev,
            staff: {
                id: "any",
                display_name: t('shopBooking.anyAvailable'),
            },
        }));
    }, [booking.services.length, booking.staff, filteredStaff.length, isMarketplaceSource, preselectionApplied, t]);

    // Auto-advance prefilled marketplace bookings without skipping required selections.
    useEffect(() => {
        if (!isMarketplaceSource || !preselectionApplied || !marketplaceAutoAdvanceEnabled) return;

        if (booking.step === 1) {
            const stepOneReady = browseMode === "service-first" ? booking.services.length > 0 : booking.staff !== null;
            if (stepOneReady) {
                setBooking((prev) => ({ ...prev, step: 2 }));
            }
            return;
        }

        if (booking.step === 2) {
            const stepTwoReady = browseMode === "service-first" ? booking.staff !== null : booking.services.length > 0;
            if (stepTwoReady) {
                setBooking((prev) => ({ ...prev, step: 3 }));
            }
            return;
        }

        if (booking.step === 3 && allScheduleItemsSelected) {
            setBooking((prev) => ({ ...prev, step: 4 }));
            setMarketplaceAutoAdvanceEnabled(false);
        }
    }, [
        isMarketplaceSource,
        preselectionApplied,
        marketplaceAutoAdvanceEnabled,
        booking.step,
        booking.services.length,
        booking.staff,
        allScheduleItemsSelected,
        browseMode,
    ]);

    // Handlers
    const getEffectiveGroupStaff = React.useCallback((group: BookingServiceGroup) => {
        if (group.fixedStaff) return group.fixedStaff;

        const groupSlots = Object.values(booking.groupSlots).filter(
            (slot): slot is BookingScheduleSlot =>
                slot != null && slot.groupId === group.id,
        );
        const firstSlot = groupSlots[0];
        if (!firstSlot) return booking.staff;

        return (
            selectableStaff.find((staff) => staff.id === firstSlot.staff_id) ??
            booking.staff
        );
    }, [booking.groupSlots, booking.staff, selectableStaff]);

    const getSchedulingStaffForItem = React.useCallback((item: BookingScheduleItem) => {
        if (item.group.fixedStaff) return item.group.fixedStaff;
        if (booking.staff && booking.staff.id !== "any") return booking.staff;

        const siblingSlot = Object.values(booking.groupSlots).find(
            (slot): slot is BookingScheduleSlot =>
                slot != null &&
                slot.groupId === item.group.id &&
                slot.key !== item.key,
        );

        if (!siblingSlot) {
            return booking.staff;
        }

        return (
            selectableStaff.find((staffEntry) => staffEntry.id === siblingSlot.staff_id) ??
            booking.staff
        );
    }, [booking.groupSlots, booking.staff, selectableStaff]);

    const toggleService = React.useCallback((service: SelectedService) => {
        if (isMarketplaceSource) setMarketplaceAutoAdvanceEnabled(false);
        setSchedulePage(0);
        setScheduleDates({});
        setSubmitError(null);
        setBooking((prev) => {
            const exists = prev.services.find((s) => s.id === service.id);
            return {
                ...prev,
                services: exists
                    ? prev.services.filter((s) => s.id !== service.id)
                    : [...prev.services, service],
                groupSlots: {},
                slot: null,
            };
        });
    }, [isMarketplaceSource]);

    const selectStaff = React.useCallback((staff: SelectedStaff) => {
        if (isMarketplaceSource) setMarketplaceAutoAdvanceEnabled(false);
        setSchedulePage(0);
        setScheduleDates({});
        setSubmitError(null);
        setBooking((prev) => ({ ...prev, staff, slot: null, groupSlots: {} }));
    }, [isMarketplaceSource]);

    const selectSlot = React.useCallback((item: BookingScheduleItem, slot: SelectedSlot) => {
        setSubmitError(null);
        setBooking((prev) => {
            const nextSlot: BookingScheduleSlot = {
                ...slot,
                key: item.key,
                groupId: item.groupId,
                groupLabel: item.group.label,
                sessionIndex: item.sessionIndex,
                sessionCount: item.sessionCount,
            };
            const nextGroupSlots = {
                ...prev.groupSlots,
                [item.key]: nextSlot,
            };
            const firstItem = scheduleItems[0];
            const firstSlot = firstItem ? nextGroupSlots[firstItem.key] : null;
            return {
                ...prev,
                groupSlots: nextGroupSlots,
                slot: firstSlot
                    ? {
                        date: firstSlot.date,
                        time: firstSlot.time,
                        staff_id: firstSlot.staff_id,
                        staff_name: firstSlot.staff_name,
                    }
                    : null,
            };
        });
        setScheduleDates((prev) => ({
            ...prev,
            [item.key]: slot.date,
        }));
    }, [scheduleItems]);

    const nextStep = () => {
        if (isMarketplaceSource) setMarketplaceAutoAdvanceEnabled(false);

        if (booking.step === 3 && activeScheduleItem) {
            if (!booking.groupSlots[activeScheduleItem.key]) {
                return;
            }

            if (schedulePage < scheduleItems.length - 1) {
                setSchedulePage((prev) => Math.min(prev + 1, scheduleItems.length - 1));
                return;
            }
        }

        setBooking((prev) => {
            if (
                browseMode === "service-first"
                && prev.step === 1
                && prev.services.length > 0
                && filteredStaff.length === 1
            ) {
                return {
                    ...prev,
                    staff: filteredStaff[0],
                    slot: null,
                    step: 3,
                };
            }

            if (
                browseMode === "service-first" &&
                prev.step === 1 &&
                prev.services.length > 0 &&
                autoSkipsSharedStaffStep
            ) {
                return {
                    ...prev,
                    staff: null,
                    slot: null,
                    step: 3,
                };
            }

            return { ...prev, step: Math.min(prev.step + 1, 4) as BookingStep };
        });
    };

    const prevStep = () => {
        if (isMarketplaceSource) setMarketplaceAutoAdvanceEnabled(false);

        if (booking.step === 3 && schedulePage > 0) {
            setSchedulePage((prev) => Math.max(prev - 1, 0));
            return;
        }

        setBooking((prev) => {
            if (
                browseMode === "service-first"
                && prev.step === 3
                && prev.services.length > 0
                && autoSkipsSharedStaffStep
            ) {
                return { ...prev, step: 1 as BookingStep };
            }

            return { ...prev, step: Math.max(prev.step - 1, 1) as BookingStep };
        });
    };

    // Handle browse mode toggle (only allowed at step 1)
    const handleToggleBrowseMode = (mode: BrowseMode) => {
        if (booking.step !== 1) return;
        if (isMarketplaceSource) setMarketplaceAutoAdvanceEnabled(false);
        setSchedulePage(0);
        setBrowseMode(mode);
        setScheduleDates({});
        // Reset selections when switching modes
        setBooking((prev) => ({
            ...prev,
            services: [],
            staff: null,
            secondaryStaff: null,
            slot: null,
            groupSlots: {},
            step: 1 as BookingStep,
        }));
    };

    const canProceed = (): boolean => {
        if (browseMode === "service-first") {
            switch (booking.step) {
                case 1: return booking.services.length > 0;
                case 2: return filteredStaff.length > 0 || shouldSkipSharedStaffStep;
                case 3:
                    return activeScheduleItem
                        ? booking.groupSlots[activeScheduleItem.key] !== null
                        : false;
                case 4: return true;
                default: return false;
            }
        } else {
            // staff-first
            switch (booking.step) {
                case 1: return booking.staff !== null;
                case 2: return booking.services.length > 0;
                case 3:
                    return activeScheduleItem
                        ? booking.groupSlots[activeScheduleItem.key] !== null
                        : false;
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
        if (!company || scheduleItems.some((item) => !booking.groupSlots[item.key])) {
            throw new Error(t('shopBooking.bookingError'));
        }

        let qrProofUrl: string | undefined = undefined;
        if (booking.paymentMethod === 'QR') {
            const requireComprobante = settings?.require_comprobante_for_qr !== false;
            if (requireComprobante && !qrProofFile) {
                throw new Error(t('shopBooking.qrProofRequired'));
            }
            if (qrProofFile) {
                qrProofUrl = await uploadQrProof(qrProofFile, company.id);
            }
        }

        const bookingGroupsPayload = bookingGroups.map((group) => {
            const groupItems = scheduleItems.filter((item) => item.groupId === group.id);
            const firstSlot = booking.groupSlots[groupItems[0]?.key]!;
            const effectiveStaff = getEffectiveGroupStaff(group);
            const resolvedStaffId =
                effectiveStaff && effectiveStaff.id !== "any"
                    ? effectiveStaff.id
                    : firstSlot.staff_id;
            const secondaryStaffId =
                group.fixedSecondaryStaff && typeof group.fixedSecondaryStaff.id === "number"
                    ? group.fixedSecondaryStaff.id
                    : undefined;

            if (group.isMultiSession) {
                return {
                    client_group_id: group.id,
                    staff_id: resolvedStaffId,
                    secondary_staff_id: secondaryStaffId,
                    service_ids: group.services.map((service) => service.id),
                    session_slots: groupItems.map((item) => {
                        const selectedSlot = booking.groupSlots[item.key]!;
                        return {
                            start_at: `${selectedSlot.date}T${selectedSlot.time}:00`,
                        };
                    }),
                };
            }

            return {
                client_group_id: group.id,
                staff_id: resolvedStaffId,
                secondary_staff_id: secondaryStaffId,
                service_ids: group.services.map((service) => service.id),
                start_at: `${firstSlot.date}T${firstSlot.time}:00`,
            };
        });

        return {
            company_id: company.id,
            staff_id: bookingGroupsPayload[0]?.staff_id,
            secondary_staff_id: bookingGroupsPayload[0]?.secondary_staff_id,
            service_ids: bookingGroupsPayload.length === 1 ? booking.services.map((s) => s.id) : undefined,
            start_at: bookingGroupsPayload.length === 1 && "start_at" in bookingGroupsPayload[0]
                ? bookingGroupsPayload[0].start_at
                : undefined,
            payment_method: booking.paymentMethod,
            notes: booking.notes,
            qr_proof_image_url: qrProofUrl,
            booking_source: bookingSource,
            booking_groups: bookingGroupsPayload,
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
            secondary_staff_id: pending.secondary_staff_id,
            service_ids: pending.service_ids,
            start_at: pending.start_at,
            payment_method: pending.payment_method,
            notes: pending.notes,
            qr_proof_image_url: pending.qr_proof_image_url,
            booking_source: pending.booking_source,
            booking_groups: pending.booking_groups,
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
        if (!company) return;

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
                const resumeParams = new URLSearchParams(searchParams?.toString() || "");
                resumeParams.set("resume", "1");
                router.push(buildSignInRedirectPath(`/shop/${slug}/book?${resumeParams.toString()}`, slug));
                return;
            }

            await submitBookingPayload(payload, user.id);
            clearPendingBookingIntent();
            setSuccess(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('shopBooking.bookingError');
            if (uploadedQrUrl) {
                await deleteUploadedQrProof(uploadedQrUrl);
            }

            if (STAFF_UNAVAILABLE_PATTERN.test(errorMessage)) {
                setScheduleDates({});
                setBooking((prev) => ({
                    ...prev,
                    step: 2,
                    staff: {
                        id: "any",
                        display_name: t('shopBooking.anyAvailable'),
                    },
                    slot: null,
                    groupSlots: {},
                }));
                setSubmitError("El personal seleccionado ya no está disponible. Elegí otra opción para continuar.");
                return;
            }

            if (SERVICE_UNAVAILABLE_PATTERN.test(errorMessage)) {
                setScheduleDates({});
                setBooking((prev) => ({
                    ...prev,
                    step: 1,
                    services: [],
                    slot: null,
                    groupSlots: {},
                }));
                setSubmitError("Uno o más servicios ya no están disponibles. Volvé a elegirlos.");
                return;
            }

            if (SLOT_UNAVAILABLE_PATTERN.test(errorMessage)) {
                setSlotRefreshVersion((prev) => prev + 1);
                setScheduleDates({});
                setBooking((prev) => ({
                    ...prev,
                    step: 3,
                    slot: null,
                    groupSlots: {},
                }));
                setSubmitError("Ese horario ya no está disponible. Elegí otro para continuar.");
                return;
            }

            console.error("Booking failed:", err);
            setSubmitError(errorMessage);
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

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    if (!bookingEnabled) {
        return (
            <main className="min-h-screen bg-page text-text-main">
                <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8">
                    <h1 className="text-3xl font-bold text-text-main">{t('shopBooking.title')}</h1>
                    <p className="mt-3 text-sm text-text-muted">{t('shopBooking.notAvailable')}</p>
                    <Button className="mt-6 bg-brand text-white hover:bg-brand-hover" onClick={() => router.push(`/shop/${slug}`)}>
                        {t('shopBooking.returnToShop')}
                    </Button>
                </section>
            </main>
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
        <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
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

            {isMarketplaceSource && showMarketplacePrefillBanner && (
                <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold">Datos cargados desde Marketplace</p>
                            <p className="mt-1 text-emerald-700">
                                Preseleccionamos los datos de tu reserva desde Marketplace. Revisalos y ajustá personal, fecha u hora si hace falta antes de confirmar.
                            </p>
                            {marketplaceHandoff.requestedTime && (
                                <p className="mt-1 text-emerald-700">
                                    Hora solicitada: {marketplaceHandoff.requestedTime}
                                </p>
                            )}
                            {prefillWarnings.length > 0 && (
                                <ul className="mt-2 list-disc pl-5 text-amber-700">
                                    {prefillWarnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button
                            type="button"
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                            onClick={() => setShowMarketplacePrefillBanner(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

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
                            currency={company.currency}
                            onToggleService={toggleService}
                        />
                    ) : (
                        <StaffStep
                            staffList={selectableStaff}
                            selectedStaff={booking.staff}
                            onSelectStaff={selectStaff}
                            staffLabel={staffLabel}
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
                            staffLabel={staffLabel}
                        />
                    ) : (
                        <ServiceStep
                            services={filteredServices}
                            categories={categories}
                            selectedServices={booking.services}
                            currency={company.currency}
                            onToggleService={toggleService}
                        />
                    )}
                </div>
                {booking.step === 3 && (
                    <div className="space-y-8">
                        {activeScheduleItem ? (
                            <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-6">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                                            {t("shopBooking.scheduleProgress", {
                                                current: schedulePage + 1,
                                                total: scheduleItems.length,
                                            })}
                                        </span>
                                        {activeScheduleItem.group.isMultiSession ? (
                                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                                {t("shopBooking.multiSessionService")}
                                            </span>
                                        ) : null}
                                    </div>
                                    {scheduleItems.length > 1 ? (
                                        <p className="text-xs text-text-muted">
                                            {t("shopBooking.scheduleProgressHint")}
                                        </p>
                                    ) : null}
                                </div>
                                <DateTimeStep
                                    companyId={company.id}
                                    isActive={booking.step === 3}
                                    selectedServices={activeScheduleItem.group.services}
                                    selectedStaff={getSchedulingStaffForItem(activeScheduleItem)}
                                    selectedSecondaryStaff={activeScheduleItem.group.fixedSecondaryStaff}
                                    selectedSlot={booking.groupSlots[activeScheduleItem.key]}
                                    onSelectSlot={(slot) => selectSlot(activeScheduleItem, slot)}
                                    selectedDate={scheduleDates[activeScheduleItem.key] ?? null}
                                    onSelectDate={(date) => {
                                        setSubmitError(null);
                                        setScheduleDates((prev) => ({
                                            ...prev,
                                            [activeScheduleItem.key]: date,
                                        }));
                                        setBooking((current) => {
                                            const currentSlot = current.groupSlots[activeScheduleItem.key];
                                            if (!currentSlot || currentSlot.date === date) {
                                                return current;
                                            }

                                            const nextGroupSlots = {
                                                ...current.groupSlots,
                                                [activeScheduleItem.key]: null,
                                            };
                                            const firstItem = scheduleItems[0];
                                            const firstSlot = firstItem ? nextGroupSlots[firstItem.key] : null;

                                            return {
                                                ...current,
                                                groupSlots: nextGroupSlots,
                                                slot: firstSlot
                                                    ? {
                                                        date: firstSlot.date,
                                                        time: firstSlot.time,
                                                        staff_id: firstSlot.staff_id,
                                                        staff_name: firstSlot.staff_name,
                                                    }
                                                    : null,
                                            };
                                        });
                                    }}
                                    timezone={company.timezone}
                                    preferredSlotTime={activeScheduleItem.group.isMultiSession ? null : preselectedSlotTime}
                                    marketplacePrefillEnabled={isMarketplaceSource && !activeScheduleItem.group.isMultiSession}
                                    maxAdvanceDays={settings?.max_advance_booking_days}
                                    minAdvanceMinutes={settings?.min_advance_booking_minutes}
                                    defaultTimeViewMode={settings?.booking_time_view_default}
                                    slotDurationMinutes={getGroupSlotDurationMinutes(activeScheduleItem.group)}
                                    blockedIntervals={activeBlockedIntervals}
                                    refreshVersion={slotRefreshVersion}
                                    title={activeScheduleItem.title}
                                    subtitle={activeScheduleItem.subtitle}
                                    ignoreMaxAdvanceLimit={activeScheduleItem.group.isMultiSession}
                                />
                            </div>
                        ) : null}
                    </div>
                )}
                {booking.step === 4 && (
                    <ConfirmStep
                        booking={booking}
                        bookingGroups={bookingGroups}
                        scheduledSlots={Object.values(booking.groupSlots).filter(
                            (slot): slot is BookingScheduleSlot => Boolean(slot),
                        )}
                        settings={settings}
                        currency={company.currency}
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

            <div
                className="sticky bottom-0 z-30 mt-8 -mx-4 border-t border-surface-border bg-page/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-page/80"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
                <div className="mx-auto flex max-w-3xl items-center justify-between">
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
        </div>
    );
}
