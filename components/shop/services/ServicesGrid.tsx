"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import type { ShopCategory, ShopService } from "@/types/shop";
import { useT } from "@/lib/i18n";
import { formatCurrencyFromCents } from "@/lib/currency";

interface ServicesGridProps {
    categories: ShopCategory[];
    services: ShopService[];
    slug: string;
    currency?: string | null;
    maxItems?: number;
    canBookOnline: boolean;
}

export function ServicesGrid({ categories, services, slug, currency, maxItems, canBookOnline }: ServicesGridProps) {
    const t = useT();
    const displayServices = maxItems ? services.slice(0, maxItems) : services;

    const servicesByCategory = categories
        .map(category => ({
            category,
            services: displayServices.filter(s => s.category_id === category.id),
        }))
        .filter(group => group.services.length > 0);

    if (servicesByCategory.length === 0) {
        return <p className="text-text-muted">{t('shopServices.noServices')}</p>;
    }

    return (
        <div className="space-y-8">
            {servicesByCategory.map(({ category, services: catServices }) => (
                <div key={category.id} className="space-y-4">
                    {categories.length > 1 && (
                        <h3 className="font-heading text-xl font-semibold text-text-main">{category.name}</h3>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {catServices.map(service => (
                            <div
                                key={service.id}
                                className="group relative flex flex-col rounded-lg border border-surface-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <h4 className="font-heading text-lg font-semibold text-text-main">
                                    {service.name}
                                </h4>
                                <div className="mt-2 flex items-center gap-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-brand">
                                            {formatCurrencyFromCents(
                                                service.pricing?.final_price_cents ?? service.price_cents,
                                                currency,
                                            )}
                                        </span>
                                        {service.pricing?.promo_applied && service.pricing.regular_price_cents ? (
                                            <span className="text-text-muted line-through">
                                                {formatCurrencyFromCents(service.pricing.regular_price_cents, currency)}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className="flex items-center gap-1 text-text-muted">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        {t('shopServices.duration', { minutes: service.duration_minutes })}
                                    </span>
                                </div>
                                {service.pricing?.promo_applied ? (
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
                                        {service.pricing.promo_label || t('shopServices.promo')}
                                    </p>
                                ) : null}
                                {service.description && (
                                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-muted font-body">
                                        {service.description}
                                    </p>
                                )}
                                {canBookOnline ? (
                                    <div className="mt-4 pt-2">
                                        <PrimaryButton asChild className="w-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Link href={`/shop/${slug}/book?serviceId=${service.id}`} className="block">
                                                {t('shopServices.book')}
                                            </Link>
                                        </PrimaryButton>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
