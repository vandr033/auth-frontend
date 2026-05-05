"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { Button } from "@/components/ui/button";
import { SocialIcons } from "@/components/shop/SocialIcons";
import { getShopPublicFeatures } from "@/lib/storefront/public-features";
import { getImageUrl } from "@/utils/image-url";
import type {
    ShopCompany,
    ShopReviewStats,
    SocialLinks,
    HomeCTAButton,
    ShopPublicFeatureVisibility,
} from "@/types/shop";
import { useT } from "@/lib/i18n";
import { HeroCTAButtons } from "./HeroCTAButtons";

interface HeroCinematicProps {
    company: ShopCompany;
    reviewStats: ShopReviewStats | null;
    socialLinks: SocialLinks;
    slug: string;
    homeCTAButtons?: HomeCTAButton[] | null;
    publicFeatures?: ShopPublicFeatureVisibility;
}

export function HeroCinematic({ company, reviewStats, socialLinks, slug, homeCTAButtons, publicFeatures }: HeroCinematicProps) {
    const t = useT();
    const resolvedPublicFeatures = publicFeatures ?? getShopPublicFeatures(company);
    return (
        <section className="relative isolate min-h-[80vh] overflow-hidden text-white md:min-h-screen">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: company.home_hero_image_url
                        ? `url('${getImageUrl(company.home_hero_image_url)}')`
                        : "url('/assets/barberShop.png')",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" aria-hidden />

            {/* Floating social icons on the side */}
            <div className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
                <SocialIcons
                    socialLinks={socialLinks}
                    className="flex-col gap-4"
                    iconSize={18}
                />
            </div>

            <div className="relative z-10 mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-20 text-center md:min-h-screen">
                {company.city && (
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60 font-body">
                        {company.city}
                    </p>
                )}
                <h1 className="font-heading text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
                    {company.name}
                </h1>

                {reviewStats && reviewStats.count > 0 && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
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
                    publicFeatures={resolvedPublicFeatures}
                    className="mt-4 flex flex-wrap items-center justify-center gap-4"
                    defaultContent={
                        <>
                            {resolvedPublicFeatures.bookingsEnabled ? (
                                <Link href={`/shop/${slug}/book`}>
                                    <PrimaryButton className="min-w-[180px] px-8 py-4 text-lg">
                                        {t('common.bookNow')}
                                    </PrimaryButton>
                                </Link>
                            ) : null}
                            {resolvedPublicFeatures.servicesVisible ? (
                                <Link href={`/shop/${slug}/services`}>
                                    <Button className="min-w-[160px] border border-white/40 bg-white/10 px-6 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                                        {t('shopNav.services')}
                                    </Button>
                                </Link>
                            ) : resolvedPublicFeatures.commerceVisible ? (
                                <Link href={`/shop/${slug}/store`}>
                                    <Button className="min-w-[160px] border border-white/40 bg-white/10 px-6 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                                        {t('shopNav.store')}
                                    </Button>
                                </Link>
                            ) : null}
                        </>
                    }
                />
            </div>
        </section>
    );
}
