"use client";

import React, { useState, useEffect } from "react";
import {
    Palette,
    Save,
    Loader2,
    LayoutTemplate,
    Image as ImageIcon,
    Columns3,
    Users,
    Type,
    MousePointerClick,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ThemePreview } from "@/components/ThemePreview";
import { VariantSelector } from "@/components/admin/theme/VariantSelector";
import { FontPairingSelector } from "@/components/admin/theme/FontPairingSelector";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { type ThemeConfig, type PageBackgroundPreset } from "@/utils/themepicker";
import { mainSiteThemeConfig } from "@/theme/mainSiteTheme";
import { notify } from "@/lib/notify";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import type { HomeCTAButton, CTADestination } from "@/types/shop";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

// Extended config with variant fields
interface ExtendedThemeConfig extends ThemeConfig {
    heroVariant: string;
    servicesVariant: string;
    teamVariant: string;
    fontPairing: string;
    homeCTAButtons: HomeCTAButton[];
}

const ALL_CTA_DESTINATIONS: CTADestination[] = [
    "booking",
    "services",
    "free-events",
    "events",
    "classes",
];

const DEFAULT_CTA_BUTTONS: HomeCTAButton[] = [
    { destination: "booking", label: "Reservar Ahora", color: "#ffffff", opacity: 100, enabled: true, order: 0 },
    { destination: "services", label: "Servicios", color: "#ffffff", opacity: 20, enabled: true, order: 1 },
    { destination: "free-events", label: "Eventos Gratuitos", color: "#ffffff", opacity: 20, enabled: false, order: 2 },
    { destination: "events", label: "Eventos", color: "#ffffff", opacity: 20, enabled: false, order: 3 },
    { destination: "classes", label: "Clases", color: "#ffffff", opacity: 20, enabled: false, order: 4 },
];

const defaultExtendedConfig: ExtendedThemeConfig = {
    ...mainSiteThemeConfig,
    heroVariant: "hero-cinematic",
    servicesVariant: "services-grid",
    teamVariant: "team-cards",
    fontPairing: "classic",
    homeCTAButtons: DEFAULT_CTA_BUTTONS,
};

export default function ThemePage() {
    const { isAuthenticated, loading: authLoading, companyUser } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canCTACustomize = canUsePlanFeature(plan, "HOME_CTA_CUSTOMIZATION");

    const [config, setConfig] = useState<ExtendedThemeConfig>(defaultExtendedConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const updateCTAButton = (index: number, field: keyof HomeCTAButton, value: unknown) => {
        setConfig(prev => {
            const updated = [...prev.homeCTAButtons];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, homeCTAButtons: updated };
        });
    };

    const moveCTAButton = (index: number, direction: -1 | 1) => {
        setConfig(prev => {
            const updated = [...prev.homeCTAButtons];
            const target = index + direction;
            if (target < 0 || target >= updated.length) return prev;
            [updated[index], updated[target]] = [updated[target], updated[index]];
            return {
                ...prev,
                homeCTAButtons: updated.map((btn, i) => ({ ...btn, order: i })),
            };
        });
    };

    const getDestinationLabel = (dest: CTADestination): string => {
        const map: Record<CTADestination, string> = {
            booking: t("adminTheme.ctaDestinationBooking"),
            services: t("adminTheme.ctaDestinationServices"),
            "free-events": t("adminTheme.ctaDestinationFreeEvents"),
            events: t("adminTheme.ctaDestinationEvents"),
            classes: t("adminTheme.ctaDestinationClasses"),
        };
        return map[dest];
    };

    // Fetch theme
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchTheme = async () => {
            try {
                const response = await fetch(getApiUrl("/admin/theme"), {
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json.data) {
                        const mappedConfig: Partial<ExtendedThemeConfig> = {
                            brandColor: json.data.brand_color,
                            pageBackgroundColor: json.data.page_background_color,
                            pageBackgroundPreset: json.data.page_background_preset,
                            cardsElevated: json.data.cards_elevated,
                            cornerRadius: json.data.corner_radius,
                            fontPreset: json.data.font_preset || "modern",
                            heroVariant: json.data.hero_variant || "hero-cinematic",
                            servicesVariant: json.data.services_variant || "services-grid",
                            teamVariant: json.data.team_variant || "team-cards",
                            fontPairing: json.data.font_pairing || "classic",
                            homeCTAButtons: json.data.home_cta_buttons ?? DEFAULT_CTA_BUTTONS,
                        };
                        setConfig(prev => ({ ...prev, ...mappedConfig }));
                    }
                } else if (response.status !== 404) {
                    console.error("Failed to fetch theme:", response.statusText);
                }
            } catch (err) {
                console.error("Error fetching theme:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTheme();
    }, [isAuthenticated]);

    const handleSave = async () => {
        setSaving(true);

        try {
            const payload = {
                brand_color: config.brandColor,
                page_background_color: config.pageBackgroundColor,
                page_background_preset: config.pageBackgroundPreset,
                cards_elevated: config.cardsElevated,
                corner_radius: config.cornerRadius,
                font_preset: config.fontPreset,
                hero_variant: config.heroVariant,
                services_variant: config.servicesVariant,
                team_variant: config.teamVariant,
                font_pairing: config.fontPairing,
                ...(canCTACustomize && { home_cta_buttons: config.homeCTAButtons }),
            };

            const response = await fetch(getApiUrl("/admin/theme"), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('adminTheme.updateError'));
            }

            await notify.success(t('adminTheme.savedShort'), t('adminTheme.savedLive'));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t('adminTheme.genericError'));
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = <K extends keyof ExtendedThemeConfig>(key: K, value: ExtendedThemeConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (authLoading || loading) {
        return (
            <div className="flex bg-page h-[50vh] flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="text-text-muted">{t('adminTheme.loading')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">{t('adminTheme.title')}</h1>
                    <p className="text-text-muted">{t('adminTheme.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="hidden md:inline-flex bg-brand text-white hover:bg-brand-hover min-w-[120px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('adminTheme.saving')}
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {t('common.save')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-10">
                {/* Editor Section */}
                <div className="space-y-6">
                    {/* Appearance Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Palette className="h-5 w-5 text-brand" />
                                {t('adminTheme.appearance')}
                            </CardTitle>
                            <CardDescription>
                                {t('adminTheme.appearanceDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {/* Brand Color */}
                            <div className="space-y-3">
                                <Label htmlFor="brandColor">{t('adminTheme.brandColor')}</Label>
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-surface-border shadow-sm">
                                        <input
                                            type="color"
                                            id="brandColor"
                                            value={config.brandColor}
                                            onChange={(e) => updateConfig("brandColor", e.target.value)}
                                            className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                        />
                                    </div>
                                    <Input
                                        value={config.brandColor}
                                        onChange={(e) => updateConfig("brandColor", e.target.value)}
                                        className="font-mono uppercase"
                                        placeholder="#000000"
                                        maxLength={9}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">{t('adminTheme.brandColorHint')}</p>
                            </div>

                            {/* Background Color */}
                            <div className="space-y-3">
                                <Label htmlFor="pageBackgroundColor">{t('adminTheme.pageBackground')}</Label>
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-surface-border shadow-sm">
                                        <input
                                            type="color"
                                            id="pageBackgroundColor"
                                            value={config.pageBackgroundColor}
                                            onChange={(e) => updateConfig("pageBackgroundColor", e.target.value)}
                                            className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                        />
                                    </div>
                                    <Input
                                        value={config.pageBackgroundColor}
                                        onChange={(e) => updateConfig("pageBackgroundColor", e.target.value)}
                                        className="font-mono uppercase"
                                        placeholder="#000000"
                                        maxLength={9}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">{t('adminTheme.pageBackgroundHint')}</p>
                            </div>

                            {/* Background Preset */}
                            <div className="space-y-3">
                                <Label htmlFor="preset">{t('adminTheme.backgroundPreset')}</Label>
                                <Select
                                    value={config.pageBackgroundPreset}
                                    onValueChange={(v) => updateConfig("pageBackgroundPreset", v as PageBackgroundPreset)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('adminTheme.selectPreset')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">{t('adminTheme.presetAuto')}</SelectItem>
                                        <SelectItem value="light">{t('adminTheme.presetLight')}</SelectItem>
                                        <SelectItem value="soft">{t('adminTheme.presetSoft')}</SelectItem>
                                        <SelectItem value="dark">{t('adminTheme.presetDark')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-muted">{t('adminTheme.backgroundPresetHint')}</p>
                            </div>

                            {/* Corner Radius */}
                            <div className="space-y-3">
                                <Label htmlFor="radius">{t('adminTheme.cornerRadius')}</Label>
                                <Select
                                    value={config.cornerRadius}
                                    onValueChange={(v) => updateConfig("cornerRadius", v as ThemeConfig["cornerRadius"])}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('adminTheme.selectRadius')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sm">{t('adminTheme.radiusSmall')}</SelectItem>
                                        <SelectItem value="md">{t('adminTheme.radiusMedium')}</SelectItem>
                                        <SelectItem value="lg">{t('adminTheme.radiusLarge')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-muted">{t('adminTheme.radiusHint')}</p>
                            </div>

                            {/* Card Elevation */}
                            <div className="flex flex-col gap-3 rounded-md border border-surface-border p-3 justify-center">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base cursor-pointer" htmlFor="cardsElevated">{t('adminTheme.cardsElevated')}</Label>
                                    <Switch
                                        id="cardsElevated"
                                        checked={config.cardsElevated}
                                        onCheckedChange={(c) => updateConfig("cardsElevated", c)}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">{t('adminTheme.cardsElevatedHint')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Font Pairing Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Type className="h-5 w-5 text-brand" />
                                {t('adminTheme.fontPairing')}
                            </CardTitle>
                            <CardDescription>
                                {t('adminTheme.fontPairingLongDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FontPairingSelector
                                selected={config.fontPairing}
                                onChange={(v) => updateConfig("fontPairing", v)}
                            />
                        </CardContent>
                    </Card>

                    {/* Hero Style Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-brand" />
                                {t('adminTheme.heroStyle')}
                            </CardTitle>
                            <CardDescription>
                                {t('adminTheme.heroStyleDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VariantSelector
                                options={[
                                    {
                                        value: "hero-cinematic",
                                        label: t('adminTheme.heroCinematic'),
                                        description: t('adminTheme.heroCinematicLongDesc'),
                                    },
                                    {
                                        value: "hero-split",
                                        label: t('adminTheme.heroSplit'),
                                        description: t('adminTheme.heroSplitLongDesc'),
                                    },
                                    {
                                        value: "hero-minimal",
                                        label: t('adminTheme.heroMinimal'),
                                        description: t('adminTheme.heroMinimalLongDesc'),
                                    },
                                ]}
                                selected={config.heroVariant}
                                onChange={(v) => updateConfig("heroVariant", v)}
                            />
                        </CardContent>
                    </Card>

                    {/* Services Layout Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Columns3 className="h-5 w-5 text-brand" />
                                {t('adminTheme.servicesLayout')}
                            </CardTitle>
                            <CardDescription>
                                {t('adminTheme.servicesLayoutDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VariantSelector
                                options={[
                                    {
                                        value: "services-grid",
                                        label: t('adminTheme.servicesGridLabel'),
                                        description: t('adminTheme.servicesGridLongDesc'),
                                    },
                                    {
                                        value: "services-list",
                                        label: t('adminTheme.servicesListLabel'),
                                        description: t('adminTheme.servicesListLongDesc'),
                                    },
                                ]}
                                selected={config.servicesVariant}
                                onChange={(v) => updateConfig("servicesVariant", v)}
                            />
                        </CardContent>
                    </Card>

                    {/* Team Layout Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-brand" />
                                {t('adminTheme.teamLayout')}
                            </CardTitle>
                            <CardDescription>
                                {t('adminTheme.teamLayoutDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VariantSelector
                                options={[
                                    {
                                        value: "team-cards",
                                        label: t('adminTheme.teamCardsLabel'),
                                        description: t('adminTheme.teamCardsLongDesc'),
                                    },
                                    {
                                        value: "team-spotlight",
                                        label: t('adminTheme.teamSpotlight'),
                                        description: t('adminTheme.teamSpotlightLongDesc'),
                                    },
                                ]}
                                selected={config.teamVariant}
                                onChange={(v) => updateConfig("teamVariant", v)}
                            />
                        </CardContent>
                    </Card>
                    {/* CTA Buttons Card */}
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MousePointerClick className="h-5 w-5 text-brand" />
                                {t("adminTheme.ctaButtons")}
                            </CardTitle>
                            <CardDescription>{t("adminTheme.ctaButtonsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!canCTACustomize ? (
                                <PlanUpgradeNotice
                                    title={t("planEnforcement.featureLockedTitle")}
                                    message={t("planEnforcement.desc.homeCTACustomization")}
                                    feature="HOME_CTA_CUSTOMIZATION"
                                    currentPlan={plan}
                                    requiredPlan="PRO"
                                />
                            ) : (
                                <div className="space-y-3">
                                    {config.homeCTAButtons.map((btn, idx) => {
                                        const needsEventsWarn = (btn.destination === "events" || btn.destination === "free-events") && !canUsePlanFeature(plan, "GROUP_EVENTS");
                                        const needsClassesWarn = btn.destination === "classes" && !canUsePlanFeature(plan, "GROUP_CLASSES");

                                        return (
                                            <div
                                                key={btn.destination}
                                                className="rounded-lg border border-surface-border bg-page p-4 space-y-3"
                                            >
                                                {/* Row 1: enable toggle + destination label + move buttons */}
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={btn.enabled}
                                                        onCheckedChange={(v) => updateCTAButton(idx, "enabled", v)}
                                                    />
                                                    <span className="flex-1 text-sm font-semibold text-text-main">
                                                        {getDestinationLabel(btn.destination)}
                                                        {idx === 0 && (
                                                            <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                                                                primario
                                                            </span>
                                                        )}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={idx === 0}
                                                            onClick={() => moveCTAButton(idx, -1)}
                                                            title={t("adminTheme.ctaMoveUp")}
                                                        >
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={idx === config.homeCTAButtons.length - 1}
                                                            onClick={() => moveCTAButton(idx, 1)}
                                                            title={t("adminTheme.ctaMoveDown")}
                                                        >
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Row 2: label + color + opacity */}
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.ctaLabel")}</Label>
                                                        <Input
                                                            value={btn.label}
                                                            onChange={(e) => updateCTAButton(idx, "label", e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Texto del botón"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.ctaColor")}</Label>
                                                        <div className="flex gap-2">
                                                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-surface-border">
                                                                <input
                                                                    type="color"
                                                                    value={btn.color}
                                                                    onChange={(e) => updateCTAButton(idx, "color", e.target.value)}
                                                                    className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                                                />
                                                            </div>
                                                            <Input
                                                                value={btn.color}
                                                                onChange={(e) => updateCTAButton(idx, "color", e.target.value)}
                                                                className="h-8 font-mono uppercase text-sm"
                                                                maxLength={7}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">
                                                            {t("adminTheme.ctaOpacity")} — {btn.opacity}%
                                                        </Label>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={100}
                                                            value={btn.opacity}
                                                            onChange={(e) => updateCTAButton(idx, "opacity", Number(e.target.value))}
                                                            className="w-full accent-brand"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Warnings for plan-gated destinations */}
                                                {btn.enabled && (needsEventsWarn || needsClassesWarn) && (
                                                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                        <span>
                                                            {needsClassesWarn
                                                                ? t("adminTheme.ctaDestinationClassesWarning")
                                                                : t("adminTheme.ctaDestinationEventsWarning")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-text-muted">
                        <LayoutTemplate className="h-4 w-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">{t('adminTheme.preview')}</span>
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-surface-border bg-page p-4 lg:p-10 flex items-center justify-center">
                        <div className="w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                            <ThemePreview
                                config={config}
                                heroVariant={config.heroVariant}
                                fontPairing={config.fontPairing}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <StickyFormActions
                onSave={handleSave}
                loading={saving}
                saveLabel={t('common.save')}
                loadingLabel={t('adminTheme.saving')}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-brand text-white hover:bg-brand-hover"
            />
        </div>
    );
}
