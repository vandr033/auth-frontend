"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import type { ShopCompany, ShopReviewStats, SocialLinks } from "@/types/shop";
import { useT } from "@/lib/i18n";

interface HeroMinimalProps {
    company: ShopCompany;
    reviewStats: ShopReviewStats | null;
    socialLinks: SocialLinks;
    slug: string;
}

export function HeroMinimal({ company, reviewStats, slug }: HeroMinimalProps) {
    const t = useT();
    return (
        <section className="bg-page py-20 md:py-32">
            <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
                {company.city && (
                    <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-text-muted font-body">
                        {company.city}
                    </p>
                )}
                <h1 className="font-heading text-5xl font-bold leading-tight text-text-main md:text-7xl lg:text-8xl">
                    {company.name}
                </h1>

                {company.about_us_text && (
                    <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-muted font-body">
                        {company.about_us_text.length > 120
                            ? `${company.about_us_text.slice(0, 120)}...`
                            : company.about_us_text}
                    </p>
                )}

                {reviewStats && reviewStats.count > 0 && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-text-muted">
                        <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < Math.round(reviewStats.average) ? "fill-yellow-400 text-yellow-400" : "fill-none text-text-muted/30"}`}
                                />
                            ))}
                        </div>
                        <span className="font-semibold text-text-main">{reviewStats.average.toFixed(1)}</span>
                        <span>({reviewStats.count}+ {t('shopHome.reviews')})</span>
                    </div>
                )}

                <div className="mt-10">
                    <Link href={`/shop/${slug}/book`}>
                        <PrimaryButton className="px-10 py-4 text-lg">
                            {t('common.bookNow')}
                        </PrimaryButton>
                    </Link>
                </div>
            </div>
        </section>
    );
}
