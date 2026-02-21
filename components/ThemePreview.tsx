"use client";

import React, { useMemo } from "react";
import { computeTheme, type ThemeConfig } from "@/utils/themepicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ThemePreviewProps {
    config: ThemeConfig;
}

export function ThemePreview({ config }: ThemePreviewProps) {
    const theme = useMemo(() => computeTheme(config), [config]);

    return (
        <div
            className="isolate flex h-full min-h-[500px] w-full flex-col overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-200"
            style={theme.tokens.cssVars as React.CSSProperties}
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
            <div className="flex-1 overflow-y-auto bg-page p-6 font-sans">
                <div className="mx-auto max-w-md space-y-8">

                    {/* Hero Section Mock */}
                    <div className="space-y-4 text-center">
                        <h1 className="text-3xl font-bold text-text-main">
                            Barber Shop
                        </h1>
                        <p className="text-text-muted">
                            Experience the best cut in town. Book your appointment today.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button className="bg-brand text-white hover:bg-brand-hover shadow-card">
                                Book Now
                            </Button>
                            <Button variant="outline" className="border-surface-border bg-surface text-text-main hover:bg-surface-border/50">
                                Learn More
                            </Button>
                        </div>
                    </div>

                    {/* Cards Section Mock */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-text-main">Popular Services</h3>
                            <span className="text-xs font-medium text-brand">View All</span>
                        </div>

                        <Card className="border-surface-border bg-surface shadow-card transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-text-main">Haircut & Beard</CardTitle>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-sm text-text-muted">Complete grooming package with hot towel service.</p>
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
                                    <CardTitle className="text-sm font-medium text-text-main">Expert Staff</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="border-surface-border bg-surface shadow-card">
                                <CardHeader className="p-4">
                                    <div className="mb-2 size-8 rounded-full bg-brand/10" />
                                    <CardTitle className="text-sm font-medium text-text-main">Best Products</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    {/* Reviews/Brand Area Mock */}
                    <div className="rounded-lg bg-brand-soft-bg p-6 text-center text-brand-soft-text">
                        <p className="font-semibold">"Best service I've ever had!"</p>
                        <div className="mt-2 flex justify-center gap-1 text-brand">
                            <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
