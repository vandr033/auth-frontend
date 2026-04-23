"use client";

import Link from "next/link";
import { Check, Eye, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { PageBackgroundPreset, ThemeConfig } from "@/utils/themepicker";

export type StorefrontStylePreset = {
    id: string;
    brandColor: string;
    pageBackgroundColor: string;
    pageBackgroundPreset: PageBackgroundPreset;
    cornerRadius: ThemeConfig["cornerRadius"];
    cardsElevated: boolean;
    fontPairing: string;
    heroVariant: string;
    servicesVariant: string;
    teamVariant: string;
};

export const STOREFRONT_STYLE_PRESETS: StorefrontStylePreset[] = [
    {
        id: "clean",
        brandColor: "#ec4899",
        pageBackgroundColor: "#fff7fb",
        pageBackgroundPreset: "soft",
        cornerRadius: "md",
        cardsElevated: true,
        fontPairing: "classic",
        heroVariant: "hero-cinematic",
        servicesVariant: "services-grid",
        teamVariant: "team-cards",
    },
    {
        id: "editorial",
        brandColor: "#111827",
        pageBackgroundColor: "#f8fafc",
        pageBackgroundPreset: "light",
        cornerRadius: "sm",
        cardsElevated: false,
        fontPairing: "refined",
        heroVariant: "hero-split",
        servicesVariant: "services-list",
        teamVariant: "team-spotlight",
    },
    {
        id: "bold",
        brandColor: "#dc2626",
        pageBackgroundColor: "#fff7ed",
        pageBackgroundPreset: "soft",
        cornerRadius: "lg",
        cardsElevated: true,
        fontPairing: "bold",
        heroVariant: "hero-cinematic",
        servicesVariant: "services-grid",
        teamVariant: "team-cards",
    },
    {
        id: "calm",
        brandColor: "#0f766e",
        pageBackgroundColor: "#f0fdfa",
        pageBackgroundPreset: "soft",
        cornerRadius: "lg",
        cardsElevated: false,
        fontPairing: "friendly",
        heroVariant: "hero-minimal",
        servicesVariant: "services-list",
        teamVariant: "team-cards",
    },
];

type ThemeShape = ThemeConfig & {
    fontPairing?: string;
    heroVariant?: string;
    servicesVariant?: string;
    teamVariant?: string;
};

function presetMatches(config: ThemeShape, preset: StorefrontStylePreset) {
    return (
        config.brandColor?.toLowerCase() === preset.brandColor &&
        config.pageBackgroundColor?.toLowerCase() === preset.pageBackgroundColor &&
        config.pageBackgroundPreset === preset.pageBackgroundPreset &&
        config.cornerRadius === preset.cornerRadius &&
        config.cardsElevated === preset.cardsElevated &&
        config.fontPairing === preset.fontPairing &&
        config.heroVariant === preset.heroVariant &&
        config.servicesVariant === preset.servicesVariant &&
        config.teamVariant === preset.teamVariant
    );
}

export function StylePresetGrid({
    config,
    onApply,
}: {
    config: ThemeShape;
    onApply: (preset: StorefrontStylePreset) => void;
}) {
    const t = useT();
    const copy: Record<string, { name: string; description: string; result: string }> = {
        clean: {
            name: t("adminTheme.presetCleanName"),
            description: t("adminTheme.presetCleanDesc"),
            result: t("adminTheme.presetCleanResult"),
        },
        editorial: {
            name: t("adminTheme.presetEditorialName"),
            description: t("adminTheme.presetEditorialDesc"),
            result: t("adminTheme.presetEditorialResult"),
        },
        bold: {
            name: t("adminTheme.presetBoldName"),
            description: t("adminTheme.presetBoldDesc"),
            result: t("adminTheme.presetBoldResult"),
        },
        calm: {
            name: t("adminTheme.presetCalmName"),
            description: t("adminTheme.presetCalmDesc"),
            result: t("adminTheme.presetCalmResult"),
        },
    };

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {STOREFRONT_STYLE_PRESETS.map((preset) => {
                const isSelected = presetMatches(config, preset);
                const labels = copy[preset.id];
                return (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApply(preset)}
                        className={cn(
                            "relative rounded-lg border p-4 text-left transition",
                            isSelected
                                ? "border-admin-brand bg-admin-brand-soft shadow-sm"
                                : "border-surface-border bg-white hover:border-admin-brand/40",
                        )}
                    >
                        {isSelected ? (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-admin-brand text-white">
                                <Check className="h-3 w-3" />
                            </span>
                        ) : null}
                        <div className="mb-4 flex items-center gap-2">
                            <span className="h-7 w-7 rounded-md border border-black/10" style={{ backgroundColor: preset.brandColor }} />
                            <span className="h-7 w-7 rounded-md border border-black/10" style={{ backgroundColor: preset.pageBackgroundColor }} />
                            <span
                                className={cn(
                                    "h-7 w-12 border border-black/10 bg-white",
                                    preset.cornerRadius === "sm" && "rounded-sm",
                                    preset.cornerRadius === "md" && "rounded-md",
                                    preset.cornerRadius === "lg" && "rounded-xl",
                                    preset.cardsElevated && "shadow-md",
                                )}
                            />
                        </div>
                        <p className="pr-8 text-sm font-semibold text-text-main">{labels.name}</p>
                        <p className="mt-1 text-sm text-text-muted">{labels.description}</p>
                        <p className="mt-3 rounded-md bg-page px-3 py-2 text-xs text-text-muted">{labels.result}</p>
                    </button>
                );
            })}
        </div>
    );
}

export function PreviewAccessCard({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    return (
        <Card className="border-admin-border bg-admin-brand-soft shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4 text-admin-brand" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild variant="outline" className="w-full gap-2 border-admin-border-strong text-admin-brand hover:bg-admin-brand-soft">
                    <Link href={href} target="_blank">
                        <Eye className="h-4 w-4" />
                        {title}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export function OutcomeHint({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 rounded-md border border-surface-border bg-page px-3 py-2 text-sm text-text-muted">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-admin-brand" />
            <span>{children}</span>
        </div>
    );
}
