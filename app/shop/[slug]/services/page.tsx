"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Scissors, Sparkles, Droplets, Palette, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { useShop } from "../../contexts/ShopContext";

// Icon mapping for categories (can be extended)
const categoryIcons: Record<string, React.ReactNode> = {
    haircut: <Scissors className="h-5 w-5" />,
    haircuts: <Scissors className="h-5 w-5" />,
    corte: <Scissors className="h-5 w-5" />,
    cortes: <Scissors className="h-5 w-5" />,
    beard: <Sparkles className="h-5 w-5" />,
    barba: <Sparkles className="h-5 w-5" />,
    shave: <Droplets className="h-5 w-5" />,
    afeitado: <Droplets className="h-5 w-5" />,
    color: <Palette className="h-5 w-5" />,
    tinte: <Palette className="h-5 w-5" />,
    treatment: <Leaf className="h-5 w-5" />,
    tratamiento: <Leaf className="h-5 w-5" />,
};

const getCategoryIcon = (categoryName: string) => {
    const key = categoryName.toLowerCase();
    for (const [iconKey, icon] of Object.entries(categoryIcons)) {
        if (key.includes(iconKey)) {
            return icon;
        }
    }
    return <Scissors className="h-5 w-5" />;
};

const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
};

export default function ServicesPage() {
    const {
        company,
        categories,
        services,
        loading,
        error,
        slug,
    } = useShop();

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Group services by category
    const servicesByCategory = useMemo(() => {
        return categories.map((category) => ({
            category,
            services: services
                .filter((s) => s.category_id === category.id)
                .sort((a, b) => a.position - b.position),
        })).filter(group => group.services.length > 0);
    }, [categories, services]);

    // Filtered services based on selected category
    const filteredGroups = useMemo(() => {
        if (selectedCategoryId === null) {
            return servicesByCategory;
        }
        return servicesByCategory.filter(
            (group) => group.category.id === selectedCategoryId
        );
    }, [servicesByCategory, selectedCategoryId]);

    // Loading state
    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">Loading services...</p>
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
                    <p className="text-text-muted mb-6">{error || "Unable to load services."}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            Go Home
                        </Button>
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-page text-text-main">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold sm:text-4xl">Services & Pricing</h1>
                </div>

                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Category Sidebar */}
                    <aside className="w-full lg:w-64 shrink-0">
                        <div className="sticky top-24">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                Categories
                            </p>
                            <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
                                {/* All Categories Option */}
                                <button
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition whitespace-nowrap",
                                        selectedCategoryId === null
                                            ? "bg-brand-soft-bg text-brand"
                                            : "text-text-muted hover:bg-section hover:text-text-main"
                                    )}
                                >
                                    <Sparkles className="h-5 w-5 shrink-0" />
                                    <span>All Services</span>
                                </button>

                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategoryId(category.id)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition whitespace-nowrap",
                                            selectedCategoryId === category.id
                                                ? "bg-brand-soft-bg text-brand"
                                                : "text-text-muted hover:bg-section hover:text-text-main"
                                        )}
                                    >
                                        <span className="shrink-0">{getCategoryIcon(category.name)}</span>
                                        <span>{category.name}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Services List */}
                    <div className="flex-1 space-y-10">
                        {filteredGroups.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-muted">No services available in this category.</p>
                            </div>
                        ) : (
                            filteredGroups.map(({ category, services: categoryServices }) => (
                                <section key={category.id} className="space-y-4">
                                    <h2 className="text-2xl font-semibold">{category.name}</h2>

                                    <div className="space-y-3">
                                        {categoryServices.map((service) => (
                                            <Card
                                                key={service.id}
                                                className="rounded-lg border-surface-border bg-surface shadow-sm transition hover:shadow-card"
                                            >
                                                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex-1 space-y-1">
                                                        <h3 className="text-lg font-semibold text-text-main">
                                                            {service.name}
                                                        </h3>
                                                        {service.description && (
                                                            <p className="text-sm text-text-muted line-clamp-2">
                                                                {service.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-text-main">
                                                                {formatPrice(service.price_cents)}
                                                            </p>
                                                            <p className="text-sm text-text-muted">
                                                                {service.duration_minutes} min
                                                            </p>
                                                        </div>
                                                        <Link href={`/shop/${slug}/book?serviceId=${service.id}`}>
                                                            <PrimaryButton className="text-sm px-6">
                                                                Book
                                                            </PrimaryButton>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
