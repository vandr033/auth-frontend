"use client";

import React, { useMemo } from "react";
import { computeTheme, type ThemeConfig, fontPairingMap } from "@/utils/themepicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

interface ThemePreviewProps {
    config: ThemeConfig;
    heroVariant?: string;
    fontPairing?: string;
}

export function ThemePreview({ config, heroVariant = "hero-cinematic", fontPairing = "classic" }: ThemePreviewProps) {
    const t = useT();
    const theme = useMemo(() => computeTheme(config), [config]);
    const fonts = fontPairingMap[fontPairing] || fontPairingMap.classic;

    const cssVars = {
        ...theme.tokens.cssVars,
        "--font-heading": fonts.heading,
        "--font-body": fonts.body,
    } as React.CSSProperties;

    return (
        <div
            className="isolate flex h-full min-h-[500px] w-full flex-col overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-200"
            style={cssVars}
        >
            {/* Mock Browser/App Header */}
            <div className="flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-red-400/20" />
                    <div className="size-3 rounded-full bg-yellow-400/20" />
                    <div className="size-3 rounded-full bg-green-400/20" />
                </div>
                <div className="h-2 w-32 rounded-full bg-surface-border/50" />
            </div>

            {/* Preview Content Area */}
            <div className="flex-1 overflow-y-auto bg-page p-6">
                <div className="mx-auto max-w-md space-y-8">

                    {/* Hero Section Mock — varies by heroVariant */}
                    {heroVariant === "hero-split" ? (
                        <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden">
                            <div className="bg-brand p-6 flex flex-col justify-center">
                                <h1 className="text-xl font-bold text-white font-heading" style={{ fontFamily: fonts.heading }}>
                                    {t("themePreview.shopName")}
                                </h1>
                                <p className="text-white/70 text-sm mt-1" style={{ fontFamily: fonts.body }}>
                                    {t("themePreview.heroSubtitle")}
                                </p>
                                <Button className="mt-3 bg-white text-brand hover:bg-white/90 text-xs w-fit" size="sm">
                                    {t("themePreview.bookNow")}
                                </Button>
                            </div>
                            <div className="bg-brand/20 flex items-center justify-center">
                                <div className="text-4xl opacity-30">📷</div>
                            </div>
                        </div>
                    ) : heroVariant === "hero-minimal" ? (
                        <div className="space-y-3 py-6">
                            <h1 className="text-3xl font-bold text-text-main font-heading" style={{ fontFamily: fonts.heading }}>
                                {t("themePreview.shopName")}
                            </h1>
                            <p className="text-text-muted" style={{ fontFamily: fonts.body }}>
                                {t("themePreview.heroDescription")}
                            </p>
                            <Button className="bg-brand text-white hover:bg-brand-hover shadow-card" size="sm">
                                {t("themePreview.bookNow")}
                            </Button>
                        </div>
                    ) : (
                        /* hero-cinematic (default) */
                        <div className="relative rounded-lg overflow-hidden bg-gradient-to-t from-black/80 to-black/30 p-8 text-center">
                            <h1 className="text-2xl font-bold text-white font-heading" style={{ fontFamily: fonts.heading }}>
                                {t("themePreview.shopName")}
                            </h1>
                            <p className="text-white/70 text-sm mt-1" style={{ fontFamily: fonts.body }}>
                                {t("themePreview.heroDescription")}
                            </p>
                            <div className="flex justify-center gap-3 mt-4">
                                <Button className="bg-brand text-white hover:bg-brand-hover shadow-card" size="sm">
                                    {t("themePreview.bookNow")}
                                </Button>
                                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                                    {t("themePreview.learnMore")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Cards Section Mock */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-text-main font-heading" style={{ fontFamily: fonts.heading }}>
                                {t("themePreview.popularServices")}
                            </h3>
                            <span className="text-xs font-medium text-brand">{t("common.viewAll")}</span>
                        </div>

                        <Card className="border-surface-border bg-surface shadow-card transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-text-main" style={{ fontFamily: fonts.heading }}>
                                    {t("themePreview.featuredServiceTitle")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-sm text-text-muted" style={{ fontFamily: fonts.body }}>
                                    {t("themePreview.featuredServiceDescription")}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-brand">
                                    <span className="rounded-full bg-brand-soft-bg px-2.5 py-0.5 text-brand-soft-text">
                                        $45
                                    </span>
                                    <span className="text-text-muted font-normal text-xs">• 60 min</span>
                                </div>
                            </CardFooter>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-surface-border bg-surface shadow-card">
                                <CardHeader className="p-4">
                                    <div className="mb-2 size-8 rounded-full bg-brand/10" />
                                    <CardTitle className="text-sm font-medium text-text-main">{t("themePreview.expertStaff")}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-surface-border bg-surface shadow-card">
                                <CardHeader className="p-4">
                                    <div className="mb-2 size-8 rounded-full bg-brand/10" />
                                    <CardTitle className="text-sm font-medium text-text-main">{t("themePreview.bestProducts")}</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    {/* Reviews/Brand Area Mock */}
                    <div className="rounded-lg bg-brand-soft-bg p-6 text-center text-brand-soft-text">
                        <p className="font-semibold" style={{ fontFamily: fonts.heading }}>
                            {t("themePreview.reviewQuote")}
                        </p>
                        <div className="mt-2 flex justify-center gap-1 text-brand">
                            <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
