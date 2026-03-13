"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Scissors, Sparkles, Droplets, Palette, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShop } from "../../contexts/ShopContext";
import { useT } from "@/lib/i18n";
import { ServicesWrapper } from "@/components/shop/services/ServicesWrapper";
import { FloatingBookCTA } from "@/components/shop/FloatingBookCTA";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
    haircut: <Scissors className="h-4 w-4" />,
    haircuts: <Scissors className="h-4 w-4" />,
    corte: <Scissors className="h-4 w-4" />,
    cortes: <Scissors className="h-4 w-4" />,
    beard: <Sparkles className="h-4 w-4" />,
    barba: <Sparkles className="h-4 w-4" />,
    shave: <Droplets className="h-4 w-4" />,
    afeitado: <Droplets className="h-4 w-4" />,
    color: <Palette className="h-4 w-4" />,
    tinte: <Palette className="h-4 w-4" />,
    treatment: <Leaf className="h-4 w-4" />,
    tratamiento: <Leaf className="h-4 w-4" />,
};

const getCategoryIcon = (categoryName: string) => {
    const key = categoryName.toLowerCase();
    for (const [iconKey, icon] of Object.entries(categoryIcons)) {
        if (key.includes(iconKey)) return icon;
    }
    return <Scissors className="h-4 w-4" />;
};

export default function ServicesPage() {
    const {
        company,
        categories,
        services,
        loading,
        error,
        slug,
        isShopActive,
    } = useShop();
    const t = useT();

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Filter services by category
    const filteredServices = useMemo(() => {
        if (selectedCategoryId === null) return services;
        return services.filter(s => s.category_id === selectedCategoryId);
    }, [services, selectedCategoryId]);

    const filteredCategories = useMemo(() => {
        if (selectedCategoryId === null) return categories;
        return categories.filter(c => c.id === selectedCategoryId);
    }, [categories, selectedCategoryId]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">{t('shopAbout.loadingServices')}</p>
                </div>
            </main>
        );
    }

    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">{t('shopHome.pageNotFound')}</h1>
                    <p className="text-text-muted mb-6">{error || t('shopAbout.unableToLoadServices')}</p>
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

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* Header */}
            <div className="border-b border-surface-border bg-surface py-8">
                <div className="mx-auto max-w-6xl px-4 md:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                        {t('shopServices.fullMenu')}
                    </p>
                    <h1 className="mt-2 font-heading text-3xl font-bold text-text-main md:text-4xl">
                        {t('shopServices.title')}
                    </h1>
                </div>
            </div>

            {/* Mobile: Horizontal pill bar (sticky) */}
            <div className="sticky top-0 z-30 border-b border-surface-border bg-surface/95 backdrop-blur-sm md:hidden">
                <div className="flex gap-2 overflow-x-auto px-4 py-3">
                    <button
                        onClick={() => setSelectedCategoryId(null)}
                        className={cn(
                            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                            selectedCategoryId === null
                                ? "bg-brand text-white"
                                : "bg-section text-text-muted hover:bg-brand-soft-bg hover:text-brand"
                        )}
                    >
                        {t('shopServices.allCategories')}
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                selectedCategoryId === category.id
                                    ? "bg-brand text-white"
                                    : "bg-section text-text-muted hover:bg-brand-soft-bg hover:text-brand"
                            )}
                        >
                            {getCategoryIcon(category.name)}
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
                <div className="flex gap-8">
                    {/* Desktop: Slim sticky sidebar */}
                    <aside className="hidden w-56 shrink-0 md:block">
                        <div className="sticky top-24">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                                {t('shopServices.categories')}
                            </p>
                            <nav className="flex flex-col gap-1">
                                <button
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={cn(
                                        "rounded-md px-3 py-2.5 text-left text-sm font-medium transition-all",
                                        selectedCategoryId === null
                                            ? "bg-brand-soft-bg text-brand border-l-2 border-brand"
                                            : "text-text-muted hover:bg-section hover:text-text-main"
                                    )}
                                >
                                    {t('shopServices.allServices')}
                                </button>
                                {categories.map(category => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategoryId(category.id)}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-all",
                                            selectedCategoryId === category.id
                                                ? "bg-brand-soft-bg text-brand border-l-2 border-brand"
                                                : "text-text-muted hover:bg-section hover:text-text-main"
                                        )}
                                    >
                                        {getCategoryIcon(category.name)}
                                        {category.name}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Services */}
                    <div className="flex-1">
                        {filteredServices.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-text-muted">{t('shopServices.noServices')}</p>
                            </div>
                        ) : (
                            <ServicesWrapper
                                categories={filteredCategories}
                                services={filteredServices}
                            />
                        )}
                    </div>
                </div>
            </div>

            <FloatingBookCTA slug={slug} />
            <ShopFooter />
        </main>
    );
}
