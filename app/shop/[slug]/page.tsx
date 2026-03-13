"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShop } from "../contexts/ShopContext";
import { useT } from "@/lib/i18n";
import { HeroWrapper } from "@/components/shop/heroes/HeroWrapper";
import { QuickInfoBar } from "@/components/shop/QuickInfoBar";
import { ServicesWrapper } from "@/components/shop/services/ServicesWrapper";
import { TeamWrapper } from "@/components/shop/team/TeamWrapper";
import { ReviewsBanner } from "@/components/shop/ReviewsBanner";
import { LocationHours } from "@/components/shop/LocationHours";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { ShopUnavailableState } from "../components/ShopUnavailableState";

export default function ShopPage() {
    const {
        company,
        hours,
        reviewStats,
        loading,
        error,
        slug,
        isShopActive,
    } = useShop();
    const t = useT();

    // Loading state
    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">{t('shopHome.loadingShop')}</p>
                </div>
            </main>
        );
    }

    // Error state
    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">{t('shopHome.shopNotFound')}</h1>
                    <p className="text-text-muted mb-6">{error || t('shopHome.shopNotFoundMessage')}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            {t('shopHome.goHome')}
                        </Button>
                    </Link>
                </div>
            </main>
        );
    }

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* 1. Hero */}
            <HeroWrapper />

            {/* 2. Quick Info Bar */}
            <QuickInfoBar company={company} hours={hours} />

            {/* 3. About Snippet */}
            {company.about_us_text && (
                <section className="py-16 md:py-24">
                    <div className="mx-auto max-w-6xl px-4 md:px-8">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                {t('shopHome.aboutUs')}
                            </p>
                            <p className="mt-4 font-heading text-xl leading-relaxed text-text-main md:text-2xl">
                                {company.about_us_text}
                            </p>
                            <Link href={`/shop/${slug}/about`}>
                                <Button variant="ghost" className="mt-6 text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                    {t('shopHome.learnMore')} →
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* 4. Services Preview */}
            <section className="py-16 md:py-24">
                <div className="mx-auto max-w-6xl px-4 md:px-8">
                    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                {t('shopHome.whatWeOffer')}
                            </p>
                            <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                {t('shopHome.ourServices')}
                            </h2>
                        </div>
                        <Link href={`/shop/${slug}/services`}>
                            <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                {t('shopHome.viewAllServices')} →
                            </Button>
                        </Link>
                    </div>
                    <ServicesWrapper maxItems={6} />
                </div>
            </section>

            {/* 5. Team */}
            <section className="bg-section py-16 md:py-24">
                <div className="mx-auto max-w-6xl px-4 md:px-8">
                    <div className="mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                            {t('shopHome.ourExperts')}
                        </p>
                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                            {t('shopHome.ourTeam')}
                        </h2>
                    </div>
                    <TeamWrapper />
                </div>
            </section>

            {/* 6. Reviews Banner */}
            {reviewStats && reviewStats.count > 0 && (
                <ReviewsBanner reviewStats={reviewStats} />
            )}

            {/* 7. Location & Hours */}
            <LocationHours company={company} hours={hours} />

            {/* 8. Footer */}
            <ShopFooter />
        </main>
    );
}
