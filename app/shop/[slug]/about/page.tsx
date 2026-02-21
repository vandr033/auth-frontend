"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Car, Train } from "lucide-react";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { useShop } from "../../contexts/ShopContext";
import { getImageUrl } from "@/utils/image-url";

export default function AboutPage() {
    const {
        company,
        staff,
        reviewStats,
        loading,
        error,
        slug,
    } = useShop();

    // Loading state
    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">Loading...</p>
                </div>
            </main>
        );
    }

    // Error state
    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
                    <p className="text-text-muted mb-6">{error || "Unable to load company information."}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            Go Home
                        </Button>
                    </Link>
                </div>
            </main>
        );
    }

    // Gallery images
    const galleryImages = [
        company.about_image_1_url,
        company.about_image_2_url,
        company.about_image_3_url,
    ].filter(Boolean).map(url => getImageUrl(url)).filter(Boolean) as string[];

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* Hero Section */}
            <section className="relative isolate overflow-hidden text-white">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: company.hero_about_url
                            ? `url('${getImageUrl(company.hero_about_url)}')`
                            : company.home_hero_image_url
                                ? `url('${getImageUrl(company.home_hero_image_url)}')`
                                : "url('/assets/barberShop.png')",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                    }}
                />
                <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
                <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
                    <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                        About {company.name}
                    </h1>
                    {company.hero_overlay_text && (
                        <p className="max-w-2xl text-lg text-white/90">
                            {company.hero_overlay_text}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href={`/shop/${slug}/book`}>
                            <PrimaryButton>Book Now</PrimaryButton>
                        </Link>
                        <Link href={`/shop/${slug}/services`}>
                            <Button className="min-w-[160px] border border-white/60 bg-white/10 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/25">
                                View Services
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
                {/* Our Story Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-semibold">Our Story</h2>
                    {company.our_story_text ? (
                        <p className="text-lg leading-relaxed text-text-muted whitespace-pre-line">
                            {company.our_story_text}
                        </p>
                    ) : (
                        <p className="text-lg text-text-muted">
                            Our story will be shared here soon. We&apos;re passionate about providing the best experience for our clients.
                        </p>
                    )}

                    {/* Gallery */}
                    {galleryImages.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {galleryImages.map((url, index) => (
                                <div
                                    key={index}
                                    className="aspect-[4/3] overflow-hidden rounded-lg bg-section"
                                >
                                    <img
                                        src={url}
                                        alt={`${company.name} gallery ${index + 1}`}
                                        className="h-full w-full object-cover transition hover:scale-105"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Meet Our Team Section */}
                {staff.length > 0 && (
                    <section className="space-y-6">
                        <h2 className="text-3xl font-semibold">Meet Our Talented Team</h2>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {staff.map((member) => (
                                <Card
                                    key={member.id}
                                    className="rounded-lg border-surface-border bg-surface text-center shadow-card"
                                >
                                    <CardContent className="flex flex-col items-center gap-4 pt-6">
                                        <div className="rounded-full border border-surface-border p-1 shadow-inner">
                                            <div className="h-24 w-24 overflow-hidden rounded-full bg-section">
                                                {member.image_url ? (
                                                    <img
                                                        src={getImageUrl(member.image_url) || undefined}
                                                        alt={member.display_name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-text-muted">
                                                        {member.display_name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold">{member.display_name}</p>
                                            {member.bio && (
                                                <p className="mt-2 text-sm text-text-muted line-clamp-3">
                                                    {member.bio}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        <Link href={`/shop/${slug}/book`} className="w-full">
                                            <Button className="w-full rounded-md border border-transparent bg-brand-soft-bg px-4 py-2 text-brand-soft-text transition hover:border-brand hover:text-brand">
                                                Book with {member.display_name.split(" ")[0]}
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* Where to Find Us Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-semibold">Where to Find Us</h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Map */}
                        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-section lg:aspect-auto lg:h-full lg:min-h-[300px]">
                            {company.google_maps_url ? (
                                <iframe
                                    title="Shop location"
                                    src={company.google_maps_url}
                                    loading="lazy"
                                    className="h-full w-full border-0"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-text-muted">
                                    Map not available
                                </div>
                            )}
                        </div>

                        {/* Address Details */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft-bg text-brand">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-main">Address</h3>
                                    <p className="text-text-muted">
                                        {company.address || "Address not set"}
                                    </p>
                                    {company.city && (
                                        <p className="text-sm text-text-muted">
                                            {company.city}{company.state && `, ${company.state}`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft-bg text-brand">
                                    <Car className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-main">Parking</h3>
                                    <p className="text-text-muted">
                                        Street parking is available nearby.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft-bg text-brand">
                                    <Train className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-main">Public Transport</h3>
                                    <p className="text-text-muted">
                                        We are easily accessible via public transportation.
                                    </p>
                                </div>
                            </div>

                            {company.google_maps_url && (
                                <a
                                    href={company.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                >
                                    <PrimaryButton>Get Directions</PrimaryButton>
                                </a>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
