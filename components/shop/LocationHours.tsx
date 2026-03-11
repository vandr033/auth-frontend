"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopCompany, ShopHours } from "@/types/shop";
import { useT } from "@/lib/i18n";
import { ShopLocationMap } from "@/components/shop/ShopLocationMap";

const dayKeys = ["adminHours.sunday", "adminHours.monday", "adminHours.tuesday", "adminHours.wednesday", "adminHours.thursday", "adminHours.friday", "adminHours.saturday"];
const orderedDayIndexes = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

const formatTime = (time: string) => {
    const [hourString, minuteString = "00"] = time.split(":");
    let hours = parseInt(hourString, 10);
    const minutes = minuteString.padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
};

interface LocationHoursProps {
    company: ShopCompany;
    hours: ShopHours[];
    className?: string;
}

export function LocationHours({ company, hours, className }: LocationHoursProps) {
    const t = useT();

    const mapQuery = [company.address, company.city, company.state, company.country_code]
        .filter(Boolean)
        .join(", ");
    const hasCoordinates = Number.isFinite(Number(company.latitude)) && Number.isFinite(Number(company.longitude));
    const directionsUrl = hasCoordinates
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${company.latitude},${company.longitude}`)}`
        : mapQuery
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`
            : null;

    const formatHoursForDayLocalized = (dayHours: ShopHours[] | undefined) => {
        if (!dayHours || dayHours.length === 0 || dayHours.every(h => h.is_closed)) return t('shopHome.closed');
        const openSlots = dayHours.filter(h => !h.is_closed && h.open_time && h.close_time);
        if (openSlots.length === 0) return t('shopHome.closed');
        return openSlots
            .sort((a, b) => (a.open_time || "").localeCompare(b.open_time || ""))
            .map(h => `${formatTime(h.open_time!)} - ${formatTime(h.close_time!)}`)
            .join("\n");
    };

    const hoursMap = hours.reduce((acc, h) => {
        const dayKey = Number(h.day_of_week);
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(h);
        return acc;
    }, {} as Record<number, ShopHours[]>);

    const today = new Date().getDay();

    return (
        <section className={cn("py-16 md:py-24", className)}>
            <div className="mx-auto max-w-6xl px-4 md:px-8">
                <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                        {t('sharedUi.visitUs')}
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                        {t('shopHome.locationAndHours')}
                    </h2>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Hours — shown first on mobile */}
                    <div className="order-1 md:order-2">
                        <div className="rounded-lg border border-surface-border bg-surface p-6 shadow-card">
                            <h3 className="mb-4 font-heading text-lg font-semibold text-text-main">
                                {t('sharedUi.openingHours')}
                            </h3>
                            <div className="divide-y divide-surface-border">
                                {orderedDayIndexes.map(dayIndex => {
                                    const dayHours = hoursMap[dayIndex];
                                    const label = t(dayKeys[dayIndex]);
                                    const display = formatHoursForDayLocalized(dayHours);
                                    const isClosed = display === t('shopHome.closed');
                                    const isToday = dayIndex === today;

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={cn(
                                                "flex items-center justify-between py-3 text-sm",
                                                isToday && "rounded px-2 -mx-2 bg-brand-soft-bg"
                                            )}
                                        >
                                            <span className={cn(
                                                "font-semibold",
                                                isToday ? "text-brand" : "text-text-main"
                                            )}>
                                                {label}
                                                {isToday && (
                                                    <span className="ml-2 text-xs font-normal text-brand">{t('shopHome.todayHours')}</span>
                                                )}
                                            </span>
                                            <span className={cn(
                                                "text-right whitespace-pre-line",
                                                isClosed ? "text-text-muted" : "text-text-main"
                                            )}>
                                                {display}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="order-2 md:order-1">
                        <div className="overflow-hidden rounded-lg border border-surface-border bg-surface shadow-card">
                            <ShopLocationMap
                                company={company}
                                className="h-80 w-full md:h-full md:min-h-[400px]"
                                fallback={
                                    company.google_maps_url ? (
                                        <iframe
                                            title={t('sharedUi.shopLocation')}
                                            src={company.google_maps_url}
                                            loading="lazy"
                                            className="h-80 w-full border-0 md:h-full md:min-h-[400px]"
                                        />
                                    ) : (
                                        <div className="flex h-80 w-full items-center justify-center bg-section text-text-muted md:h-full md:min-h-[400px]">
                                            {t('sharedUi.mapNotAvailable')}
                                        </div>
                                    )
                                }
                            />
                        </div>
                        {company.address && (
                            <p className="mt-3 text-sm text-text-muted">
                                {company.address}{company.city ? `, ${company.city}` : ""}
                            </p>
                        )}
                        {directionsUrl && (
                            <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover"
                            >
                                {t('sharedUi.getDirections')}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
