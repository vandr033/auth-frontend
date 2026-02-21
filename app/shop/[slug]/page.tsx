"use client";

import React from "react";
import Link from "next/link";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { useShop } from "../contexts/ShopContext";
import type { ShopHours } from "@/types/shop";
import { getImageUrl } from "@/utils/image-url";

// Day mapping: API uses 0=Sunday, we want to display Monday first
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const orderedDayIndexes = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun order

const formatTime = (time: string) => {
    const [hourString, minuteString = "00"] = time.split(":");
    let hours = parseInt(hourString, 10);
    const minutes = minuteString.padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
};

const formatHoursForDay = (dayHours: ShopHours[] | undefined) => {
    if (!dayHours || dayHours.length === 0 || dayHours.every(h => h.is_closed)) return "Closed";

    const openSlots = dayHours.filter(h => !h.is_closed && h.open_time && h.close_time);
    if (openSlots.length === 0) return "Closed";

    return openSlots
        .sort((a, b) => (a.open_time || "").localeCompare(b.open_time || ""))
        .map(h => `${formatTime(h.open_time!)} - ${formatTime(h.close_time!)}`)
        .join("\n");
};

const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
};

export default function ShopPage() {
    const {
        company,
        categories,
        services,
        staff,
        hours,
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
                    <p className="text-text-muted">Loading shop...</p>
                </div>
            </main>
        );
    }

    // Error state
    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Shop Not Found</h1>
                    <p className="text-text-muted mb-6">{error || "This shop doesn't exist or is no longer active."}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            Go Home
                        </Button>
                    </Link>
                </div>
            </main>
        );
    }

    // Group services by category
    const servicesByCategory = categories.map((category) => ({
        category,
        services: services.filter((s) => s.category_id === category.id),
    }));

    // Create hours lookup - group by day of week
    // Force day_of_week to number to ensure consistent lookup (API may return strings)
    const hoursMap = hours.reduce((acc, h) => {
        const dayKey = Number(h.day_of_week);
        if (!acc[dayKey]) {
            acc[dayKey] = [];
        }
        acc[dayKey].push(h);
        return acc;
    }, {} as Record<number, ShopHours[]>);

    // Check if currently open (simplified)
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const todayHours = hoursMap[currentDay] || [];
    const isOpen = todayHours.some(slot =>
        !slot.is_closed &&
        slot.open_time &&
        slot.close_time &&
        currentTime >= slot.open_time &&
        currentTime <= slot.close_time
    );

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* Hero Section */}
            <section id="home" className="relative isolate overflow-hidden text-white">
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
                <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
                <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                        Premium Barbershop
                    </p>
                    <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                        {company.name}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
                        {reviewStats && (
                            <>
                                <Rating value={reviewStats.average} readOnly>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <RatingButton key={index} className="text-yellow-400" />
                                    ))}
                                </Rating>
                                <span>{reviewStats.average.toFixed(1)}</span>
                                <span className="text-white/80">
                                    {reviewStats.count}+ reviews
                                </span>
                                <span aria-hidden>•</span>
                            </>
                        )}
                        <span>{company.city}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href={`/shop/${slug}/book`}>
                            <PrimaryButton>Book Now</PrimaryButton>
                        </Link>
                        <Button className="min-w-[160px] border border-white/60 bg-white/10 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/25">
                            Contact Us
                        </Button>
                    </div>
                </div>
            </section>

            {/* How it works Section */}
            <section id="how-it-works" className="bg-section py-12 shadow-inner sm:py-16">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-muted">
                            How it works
                        </p>
                        <h2 className="text-3xl font-semibold text-text-main sm:text-4xl">
                            Booking made simple
                        </h2>
                        <p className="mt-2 text-text-muted">
                            Choose your service, pick your barber, and confirm your time in just a few taps.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                title: "Pick a service",
                                description: "Browse our most popular cuts, shaves, and treatments with clear pricing.",
                            },
                            {
                                title: "Choose your time",
                                description: "See real-time availability and select the slot that fits your schedule.",
                            },
                            {
                                title: "Confirm & show up",
                                description: "Get reminders automatically and arrive to a chair ready for you.",
                            },
                        ].map((step, index) => (
                            <Card
                                key={step.title}
                                className="h-full rounded-lg border-surface-border bg-surface shadow-card"
                            >
                                <CardHeader className="flex flex-row items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft-bg text-brand-soft-text">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-semibold text-text-main">
                                            {step.title}
                                        </CardTitle>
                                        <p className="text-sm text-text-muted">{step.description}</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
                {/* Quick Info Cards */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                        <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Status
                        </CardHeader>
                        <CardContent
                            className={cn(
                                "text-2xl font-bold",
                                isOpen ? "text-emerald-600" : "text-rose-600",
                            )}
                        >
                            {isOpen ? "Open" : "Closed"}
                        </CardContent>
                    </Card>
                    <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                        <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Address
                        </CardHeader>
                        <CardContent className="text-lg font-semibold text-text-main">
                            {company.address || "Address not set"}
                        </CardContent>
                    </Card>
                    <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                        <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Phone
                        </CardHeader>
                        <CardContent className="text-lg font-semibold text-text-main">
                            +{company.phone_prefix} {company.phone}
                        </CardContent>
                    </Card>
                    <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                        <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Email
                        </CardHeader>
                        <CardContent className="text-lg font-semibold text-text-main">
                            {company.email || "Email not set"}
                        </CardContent>
                    </Card>
                </section>

                {/* About Us Section */}
                {company.about_us_text && (
                    <section className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-3xl font-semibold">About Us</h2>
                            <Link href={`/shop/${slug}/about`}>
                                <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                    Learn more →
                                </Button>
                            </Link>
                        </div>
                        <p className="text-lg leading-relaxed text-text-muted whitespace-pre-line">
                            {company.about_us_text}
                        </p>
                    </section>
                )}

                {/* Location & Hours */}
                <section className="space-y-6">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-3xl font-semibold">Location & Hours</h2>
                            <p className="text-text-muted">
                                Find us easily or check our hours before booking.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-text-main">
                                    Google Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {company.google_maps_url ? (
                                    <iframe
                                        title="Shop location"
                                        src={company.google_maps_url}
                                        loading="lazy"
                                        className="h-80 w-full rounded-lg border-0 shadow-inner sm:h-96"
                                    />
                                ) : (
                                    <div className="h-80 w-full rounded-lg bg-section flex items-center justify-center text-text-muted">
                                        Map not available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col rounded-lg border-surface-border bg-surface shadow-card">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-lg font-semibold text-text-main">
                                    Opening hours
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-surface-border pt-4">
                                {orderedDayIndexes.map((dayIndex) => {
                                    const dayHours = hoursMap[dayIndex];
                                    const label = dayNames[dayIndex];
                                    const display = formatHoursForDay(dayHours);
                                    const isClosed = !dayHours || dayHours.length === 0 || dayHours.every(h => h.is_closed);

                                    return (
                                        <div
                                            key={dayIndex}
                                            className="flex items-center justify-between py-2 text-sm sm:text-base"
                                        >
                                            <span className="font-semibold text-text-main">{label}</span>
                                            <span className={cn(
                                                "text-right",
                                                isClosed ? "text-text-muted" : "text-text-main whitespace-pre-line"
                                            )}>
                                                {display}
                                            </span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                            <CardFooter>
                                {company.google_maps_url && (
                                    <a href={company.google_maps_url} target="_blank" rel="noopener noreferrer" className="w-full">
                                        <PrimaryButton className="w-full">Get Directions</PrimaryButton>
                                    </a>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* Services Section */}
                <section className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-3xl font-semibold">Our Services</h2>
                        <span className="text-sm uppercase tracking-[0.3em] text-text-muted">
                            Price list
                        </span>
                    </div>
                    {servicesByCategory.length > 0 ? (
                        servicesByCategory.map(({ category, services: categoryServices }) => (
                            <div key={category.id} className="space-y-4">
                                {categories.length > 1 && (
                                    <h3 className="text-xl font-semibold text-text-main">{category.name}</h3>
                                )}
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {categoryServices.map((service) => (
                                        <Card
                                            key={service.id}
                                            className="h-full rounded-lg border-surface-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                                        >
                                            <CardHeader>
                                                <CardTitle className="text-xl font-semibold text-text-main">
                                                    {service.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-text-muted">
                                                <p>{service.description || "No description"}</p>
                                            </CardContent>
                                            <CardFooter className="mt-auto flex flex-col gap-4 pt-0">
                                                <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand">
                                                    <span className="rounded-full bg-brand-soft-bg px-3 py-1 text-brand-soft-text">
                                                        {formatPrice(service.price_cents)}
                                                    </span>
                                                    <span className="rounded-full bg-brand-soft-bg px-3 py-1 text-brand-soft-text">
                                                        {service.duration_minutes} min
                                                    </span>
                                                </div>
                                                <Link href={`/shop/${slug}/book?serviceId=${service.id}`} className="w-full">
                                                    <PrimaryButton className="w-full">Book now</PrimaryButton>
                                                </Link>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-text-muted">No services available yet.</p>
                    )}
                </section>

                {/* Team Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-semibold">Meet our team</h2>
                    {staff.length > 0 ? (
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
                                                <p className="text-sm text-text-muted line-clamp-2">{member.bio}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Link href={`/shop/${slug}/book?staffId=${member.id}`} className="w-full">
                                            <Button className="w-full rounded-md border border-transparent bg-brand-soft-bg px-4 py-2 text-brand-soft-text transition hover:border-brand hover:text-brand">
                                                Book with {member.display_name.split(" ")[0]}
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-muted">Team information coming soon.</p>
                    )}
                </section>

                {/* Reviews Section */}
                {reviewStats && reviewStats.count > 0 && (
                    <section className="space-y-6">
                        <h2 className="text-3xl font-semibold">What our clients say</h2>
                        <div className="grid gap-6 lg:grid-cols-[0.45fr,0.55fr]">
                            <Card className="items-center rounded-lg border-surface-border bg-brand-soft-bg py-10 text-center text-brand-soft-text shadow-inner">
                                <h3 className="text-5xl font-bold text-brand">
                                    {reviewStats.average.toFixed(1)}
                                </h3>
                                <Rating value={reviewStats.average} readOnly>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <RatingButton key={index} className="text-yellow-500" />
                                    ))}
                                </Rating>
                                <p className="mt-2 text-text-muted">
                                    Based on {reviewStats.count}+ verified reviews
                                </p>
                            </Card>
                            <Card className="rounded-lg border-surface-border bg-surface shadow-card">
                                <CardContent className="p-6">
                                    <p className="text-text-muted text-center">
                                        Full reviews coming soon...
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* For Businesses CTA */}
                <section
                    id="for-businesses"
                    className="rounded-lg border border-surface-border bg-brand-soft-bg p-6 text-brand-soft-text shadow-card"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">
                                For businesses
                            </p>
                            <h3 className="text-2xl font-semibold text-text-main">
                                Want a booking page like this for your shop?
                            </h3>
                            <p className="text-sm text-text-muted">
                                Create your account, publish services, and start accepting appointments online in minutes.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link href="/auth/register">
                                <PrimaryButton className="w-full sm:w-auto">Create an account</PrimaryButton>
                            </Link>
                            <Link href="/auth/sign-in">
                                <Button
                                    variant="outline"
                                    className="w-full border-brand/30 bg-white px-4 py-2 text-brand hover:border-brand hover:text-brand sm:w-auto"
                                >
                                    Sign in instead
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
