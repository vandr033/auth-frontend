"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { getImageUrl } from "@/utils/image-url";
import type { ShopCompany, ShopReviewStats, SocialLinks, HomeCTAButton } from "@/types/shop";
import { useT } from "@/lib/i18n";
import { HeroCTAButtons } from "./HeroCTAButtons";
import { useShop } from "@/app/shop/contexts/ShopContext";

interface HeroSplitProps {
    company: ShopCompany;
    reviewStats: ShopReviewStats | null;
    socialLinks: SocialLinks;
    slug: string;
    homeCTAButtons?: HomeCTAButton[] | null;
}

export function HeroSplit({ company, reviewStats, slug, homeCTAButtons }: HeroSplitProps) {
    const t = useT();
    const { modules } = useShop();
    return (
        <section className="grid min-h-[60vh] grid-cols-1 md:min-h-[70vh] md:grid-cols-2">
            {/* Left: Text content */}
            <div className="flex flex-col justify-center bg-brand px-6 py-16 text-white md:px-12 lg:px-16 lg:py-24">
                {company.city && (
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 font-body">
                        {company.city}
                    </p>
                )}
                <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                    {company.name}
                </h1>

                {reviewStats && reviewStats.count > 0 && (
                    <div className="mt-6 flex items-center gap-2 text-sm text-white/80">
                        <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < Math.round(reviewStats.average) ? "fill-yellow-400 text-yellow-400" : "fill-none text-white/30"}`}
                                />
                            ))}
                        </div>
                        <span className="font-semibold">{reviewStats.average.toFixed(1)}</span>
                        <span>({reviewStats.count}+ {t('shopHome.reviews')})</span>
                    </div>
                )}

                <HeroCTAButtons
                    slug={slug}
                    buttons={homeCTAButtons}
                    className="mt-8 flex flex-wrap gap-3"
                    defaultContent={
                        modules.reservations ? (
                            <Link href={`/shop/${slug}/book`}>
                                <PrimaryButton className="bg-white px-8 py-4 text-lg font-bold text-brand hover:bg-white/90">
                                    {t('common.bookNow')}
                                </PrimaryButton>
                            </Link>
                        ) : modules.store ? (
                            <Link href={`/shop/${slug}/store`}>
                                <PrimaryButton className="bg-white px-8 py-4 text-lg font-bold text-brand hover:bg-white/90">
                                    {t('shopNav.store')}
                                </PrimaryButton>
                            </Link>
                        ) : null
                    }
                />
            </div>

            {/* Right: Hero image */}
            <div
                className="min-h-[40vh] md:min-h-0"
                style={{
                    backgroundImage: company.home_hero_image_url
                        ? `url('${getImageUrl(company.home_hero_image_url)}')`
                        : "url('/assets/barberShop.png')",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            />
        </section>
    );
}
