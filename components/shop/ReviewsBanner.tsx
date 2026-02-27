"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopReviewStats } from "@/types/shop";
import { useT } from "@/lib/i18n";

interface ReviewsBannerProps {
    reviewStats: ShopReviewStats;
    className?: string;
}

export function ReviewsBanner({ reviewStats, className }: ReviewsBannerProps) {
    const t = useT();
    if (!reviewStats || reviewStats.count === 0) return null;

    return (
        <section className={cn("py-16 md:py-24", className)}>
            <div className="mx-auto max-w-6xl px-4 md:px-8">
                <div className="relative overflow-hidden rounded-lg bg-brand-soft-bg px-8 py-12 md:py-16">
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-5" aria-hidden>
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand" />
                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand" />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:justify-center md:gap-12 md:text-left">
                        {/* Rating */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="font-heading text-6xl font-bold text-brand md:text-7xl">
                                {reviewStats.average.toFixed(1)}
                            </span>
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            "h-5 w-5",
                                            i < Math.round(reviewStats.average)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "fill-none text-text-muted/30"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden h-16 w-px bg-brand/20 md:block" />

                        {/* Count */}
                        <div className="flex flex-col gap-1">
                            <span className="font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                {reviewStats.count}+ {t('shopHome.reviews')}
                            </span>
                            <p className="text-sm text-text-muted">
                                {t('shopHome.reviewsSection')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
