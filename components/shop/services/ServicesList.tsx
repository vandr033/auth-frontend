"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import type { ShopCategory, ShopService } from "@/types/shop";
import { useT } from "@/lib/i18n";
import { formatCurrencyFromCents } from "@/lib/currency";

interface ServicesListProps {
    categories: ShopCategory[];
    services: ShopService[];
    slug: string;
    currency?: string | null;
    maxItems?: number;
}

export function ServicesList({ categories, services, slug, currency, maxItems }: ServicesListProps) {
    const t = useT();
    const displayServices = maxItems ? services.slice(0, maxItems) : services;
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
        new Set(categories.map(c => c.id))
    );
    const [expandedService, setExpandedService] = useState<number | null>(null);

    const toggleCategory = (id: number) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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
        <div className="space-y-4">
            {servicesByCategory.map(({ category, services: catServices }) => (
                <div key={category.id} className="overflow-hidden rounded-lg border border-surface-border bg-surface shadow-card">
                    {/* Category header */}
                    {categories.length > 1 && (
                        <button
                            onClick={() => toggleCategory(category.id)}
                            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-brand-soft-bg/50"
                        >
                            <h3 className="font-heading text-lg font-semibold text-text-main">{category.name}</h3>
                            <ChevronDown
                                className={cn(
                                    "h-5 w-5 text-text-muted transition-transform duration-200",
                                    expandedCategories.has(category.id) && "rotate-180"
                                )}
                            />
                        </button>
                    )}

                    {/* Service rows */}
                    {expandedCategories.has(category.id) && (
                        <div className="divide-y divide-surface-border">
                            {catServices.map(service => (
                                <div key={service.id}>
                                    <button
                                        onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                                        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-section/50"
                                    >
                                        <span className="font-semibold text-text-main font-body">{service.name}</span>
                                        <div className="flex items-center gap-4 text-sm">
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
                                    </button>
                                    {expandedService === service.id && (
                                        <div className="border-t border-surface-border bg-section/30 px-5 py-4">
                                            {service.pricing?.promo_applied ? (
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
                                                    {service.pricing.promo_label || t('shopServices.promo')}
                                                </p>
                                            ) : null}
                                            {service.description && (
                                                <p className="mb-4 text-sm leading-relaxed text-text-muted font-body">
                                                    {service.description}
                                                </p>
                                            )}
                                            <PrimaryButton asChild className="px-6">
                                                <Link href={`/shop/${slug}/book?serviceId=${service.id}`}>{t('shopServices.book')}</Link>
                                            </PrimaryButton>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
