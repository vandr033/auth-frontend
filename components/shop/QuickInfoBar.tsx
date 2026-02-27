"use client";

import { MapPin, Phone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopCompany, ShopHours } from "@/types/shop";
import { useT } from "@/lib/i18n";

interface QuickInfoBarProps {
    company: ShopCompany;
    hours: ShopHours[];
    className?: string;
}

export function QuickInfoBar({ company, hours, className }: QuickInfoBarProps) {
    const t = useT();
    // Calculate open/closed status
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const todayHours = hours.filter(h => Number(h.day_of_week) === currentDay);
    const isOpen = todayHours.some(
        slot =>
            !slot.is_closed &&
            slot.open_time &&
            slot.close_time &&
            currentTime >= slot.open_time &&
            currentTime <= slot.close_time
    );

    // Find next open time today
    const nextOpenSlot = todayHours.find(
        slot =>
            !slot.is_closed &&
            slot.open_time &&
            currentTime < slot.open_time
    );

    const formatTime = (time: string) => {
        const [hourStr, minuteStr = "00"] = time.split(":");
        let h = parseInt(hourStr, 10);
        const period = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${minuteStr} ${period}`;
    };

    return (
        <section className={cn("bg-surface border-y border-surface-border", className)}>
            <div className="mx-auto flex w-full max-w-6xl items-center gap-6 overflow-x-auto px-4 py-3 text-sm md:px-8 md:justify-center">
                {/* Open/Closed Status */}
                <div className="flex shrink-0 items-center gap-2">
                    <Clock className="h-4 w-4 text-text-muted" />
                    <span
                        className={cn(
                            "font-semibold",
                            isOpen ? "text-emerald-600" : "text-rose-600"
                        )}
                    >
                        {isOpen ? t('shopHome.quickInfo.openNow') : t('shopHome.quickInfo.closedNow')}
                    </span>
                    {!isOpen && nextOpenSlot?.open_time && (
                        <span className="text-text-muted">
                            · {t('shopHome.quickInfo.opensAt', { time: formatTime(nextOpenSlot.open_time) })}
                        </span>
                    )}
                </div>

                <span className="hidden text-surface-border md:inline" aria-hidden>|</span>

                {/* Address */}
                {company.address && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address + (company.city ? `, ${company.city}` : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-2 text-text-main transition-colors hover:text-brand"
                    >
                        <MapPin className="h-4 w-4 text-text-muted" />
                        <span className="truncate max-w-[200px] md:max-w-none">{company.address}</span>
                    </a>
                )}

                <span className="hidden text-surface-border md:inline" aria-hidden>|</span>

                {/* Phone */}
                {company.phone && (
                    <a
                        href={`tel:+${company.phone_prefix}${company.phone}`}
                        className="flex shrink-0 items-center gap-2 text-text-main transition-colors hover:text-brand"
                    >
                        <Phone className="h-4 w-4 text-text-muted" />
                        <span>+{company.phone_prefix} {company.phone}</span>
                    </a>
                )}
            </div>
        </section>
    );
}
