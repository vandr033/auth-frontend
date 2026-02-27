"use client";

import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    type AvailableDate,
    type OpenStatus,
    calculateOpenStatus,
    formatTimeDisplay,
} from "@/utils/business-hours";
import { useT } from "@/lib/i18n";

interface OpenStatusBadgeProps {
    availableDates: AvailableDate[];
    timezone?: string;
    showNextOpen?: boolean;
    className?: string;
}

export function OpenStatusBadge({
    availableDates,
    timezone,
    showNextOpen = true,
    className,
}: OpenStatusBadgeProps) {
    const t = useT();
    const status = useMemo<OpenStatus>(() => {
        return calculateOpenStatus(availableDates, timezone);
    }, [availableDates, timezone]);

    if (status.is_open_now) {
        return (
            <div className={cn("inline-flex items-center gap-1.5", className)}>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-emerald-600">{t('shopHome.quickInfo.openNow')}</span>
            </div>
        );
    }

    if (status.is_closed_today) {
        return (
            <div className={cn("inline-flex items-center gap-1.5", className)}>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm font-medium text-rose-600">{t('shopBooking.closedToday')}</span>
            </div>
        );
    }

    if (status.next_open_today && status.next_open_time && showNextOpen) {
        return (
            <div className={cn("inline-flex items-center gap-1.5", className)}>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm font-medium text-rose-600">{t('shopHome.quickInfo.closedNow')}</span>
                <span className="text-sm text-slate-500">
                    · {t('shopHome.quickInfo.opensAt', { time: formatTimeDisplay(status.next_open_time) })}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("inline-flex items-center gap-1.5", className)}>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-sm font-medium text-rose-600">{t('shopHome.quickInfo.closedNow')}</span>
        </div>
    );
}

interface ClosedBannerProps {
    availableDates: AvailableDate[];
    timezone?: string;
    className?: string;
}

export function ClosedBanner({
    availableDates,
    timezone,
    className,
}: ClosedBannerProps) {
    const t = useT();
    const status = useMemo<OpenStatus>(() => {
        return calculateOpenStatus(availableDates, timezone);
    }, [availableDates, timezone]);

    if (status.is_open_now) {
        return null;
    }

    if (status.is_closed_today) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200",
                    className
                )}
            >
                <Clock className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <p className="text-sm text-rose-700">
                    <span className="font-medium">{t('shopBooking.closedToday')}.</span>
                    {" "}{t('shopBooking.closedTodayMessage')}
                </p>
            </div>
        );
    }

    if (status.next_open_today && status.next_open_time) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200",
                    className
                )}
            >
                <Clock className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <p className="text-sm text-rose-700">
                    <span className="font-medium">{t('shopHome.quickInfo.closedNow')}.</span>
                    {" "}{t('shopHome.quickInfo.opensAt', { time: formatTimeDisplay(status.next_open_time) })}
                </p>
            </div>
        );
    }

    return null;
}
