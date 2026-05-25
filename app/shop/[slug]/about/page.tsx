"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { useShop } from "../../contexts/ShopContext";
import { useT } from "@/lib/i18n";
import { getImageUrl } from "@/utils/image-url";
import { TeamWrapper } from "@/components/shop/team/TeamWrapper";
import { LocationHours } from "@/components/shop/LocationHours";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";

export default function AboutPage() {
    const {
        company,
        hours,
        loading,
        error,
        slug,
        isShopActive,
        publicFeatures,
        canBookOnline,
    } = useShop();
    const t = useT();

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">{t('common.loading')}</p>
                </div>
            </main>
        );
    }

    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">{t('shopHome.pageNotFound')}</h1>
                    <p className="text-text-muted mb-6">{error || t('shopAbout.unableToLoad')}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">{t('shopHome.goHome')}</Button>
                    </Link>
                </div>
            </main>
        );
    }

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    const galleryImages = [
        company.about_image_1_url,
        company.about_image_2_url,
        company.about_image_3_url,
    ].filter(Boolean).map(url => getImageUrl(url)).filter(Boolean) as string[];

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* Hero with parallax-lite */}
            <section className="relative isolate min-h-[50vh] overflow-hidden text-white md:min-h-[60vh]">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: company.about_hero_image_url ?? company.hero_about_url
                            ? `url('${getImageUrl(company.about_hero_image_url ?? company.hero_about_url)}')`
                            : company.home_hero_image_url
                                ? `url('${getImageUrl(company.home_hero_image_url)}')`
                                : "url('/assets/barberShop.png')",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        backgroundAttachment: "fixed",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" aria-hidden />
                <div className="relative z-10 mx-auto flex min-h-[50vh] w-full max-w-5xl flex-col items-center justify-center gap-4 px-4 py-16 text-center md:min-h-[60vh]">
                    <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                        {t('shopAbout.about', { name: company.name })}
                    </h1>
                    {company.hero_overlay_text && (
                        <p className="max-w-2xl text-lg leading-relaxed text-white/80 font-body">
                            {company.hero_overlay_text}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        {canBookOnline ? (
                            <PrimaryButton asChild>
                                <Link href={`/shop/${slug}/book`}>{t('common.bookNow')}</Link>
                            </PrimaryButton>
                        ) : publicFeatures.commerceVisible ? (
                            <PrimaryButton asChild>
                                <Link href={`/shop/${slug}/store`}>{t('shopNav.store')}</Link>
                            </PrimaryButton>
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Our Story */}
            <section className="py-16 md:py-24">
                <div className="mx-auto max-w-3xl px-4 md:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                        {t('shopAbout.ourStory')}
                    </p>
                    {company.our_story_text ? (
                        <div className="mt-6 text-lg leading-[1.8] text-text-main font-body whitespace-pre-line first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-brand first-letter:font-heading">
                            {company.our_story_text}
                        </div>
                    ) : (
                        <p className="mt-6 text-lg text-text-muted font-body">
                            {t('shopAbout.ourStoryPlaceholder')}
                        </p>
                    )}
                </div>
            </section>

            {/* Gallery — asymmetric grid */}
            {galleryImages.length > 0 && (
                <section className="py-8 md:py-16">
                    <div className="mx-auto max-w-6xl px-4 md:px-8">
                        {galleryImages.length >= 3 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
                                <div className="overflow-hidden rounded-lg md:col-span-2 md:row-span-2">
                                    <img
                                        src={galleryImages[0]}
                                        alt={`${company.name} gallery 1`}
                                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                </div>
                                <div className="overflow-hidden rounded-lg">
                                    <img
                                        src={galleryImages[1]}
                                        alt={`${company.name} gallery 2`}
                                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                </div>
                                <div className="overflow-hidden rounded-lg">
                                    <img
                                        src={galleryImages[2]}
                                        alt={`${company.name} gallery 3`}
                                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {galleryImages.map((url, index) => (
                                    <div key={index} className="aspect-[4/3] overflow-hidden rounded-lg">
                                        <img
                                            src={url}
                                            alt={`${company.name} gallery ${index + 1}`}
                                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Team */}
            <section className="bg-section py-16 md:py-24">
                <div className="mx-auto max-w-6xl px-4 md:px-8">
                    <div className="mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                            {t('shopAbout.ourExperts')}
                        </p>
                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                            {t('shopAbout.meetTeam')}
                        </h2>
                    </div>
                    <TeamWrapper />
                </div>
            </section>

            {/* Location & Hours */}
            <LocationHours company={company} hours={hours} />

            <ShopFooter />
        </main>
    );
}
