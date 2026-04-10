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
    GripVertical,
    PanelBottom,
    Megaphone,
    Plus,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemePreview } from "@/components/ThemePreview";
import { VariantSelector } from "@/components/admin/theme/VariantSelector";
import { FontPairingSelector } from "@/components/admin/theme/FontPairingSelector";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { AdminStatCard } from "@/app/admin/dashboard/components/AdminStatCard";
import { useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { type ThemeConfig, type PageBackgroundPreset } from "@/utils/themepicker";
import { mainSiteThemeConfig } from "@/theme/mainSiteTheme";
import { notify } from "@/lib/notify";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import type { HomeCTAButton, CTADestination, HomeSectionKey, FooterConfig, AnnouncementBanner } from "@/types/shop";
import { DEFAULT_SECTION_ORDER, DEFAULT_FOOTER_CONFIG } from "@/types/shop";

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
    homeSectionOrder: HomeSectionKey[];
    footerConfig: FooterConfig;
    announcementBanners: AnnouncementBanner[];
}

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
    homeSectionOrder: DEFAULT_SECTION_ORDER,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    announcementBanners: [],
};

export default function ThemePage() {
    const { isAuthenticated, loading: authLoading, companyUser } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canCTACustomize = canUsePlanFeature(plan, "HOME_CTA_CUSTOMIZATION");
    const canSectionOrder = canUsePlanFeature(plan, "HOME_SECTION_ORDER");
    const canFooterCustomize = canUsePlanFeature(plan, "FOOTER_CUSTOMIZATION");
    const canBanners = canUsePlanFeature(plan, "ANNOUNCEMENT_BANNERS");

    const [config, setConfig] = useState<ExtendedThemeConfig>(defaultExtendedConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const enabledCTAButtons = config.homeCTAButtons.filter((button) => button.enabled).length;
    const activeBanners = config.announcementBanners.filter((banner) => banner.enabled).length;

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
                            homeSectionOrder: json.data.home_section_order ?? DEFAULT_SECTION_ORDER,
                            footerConfig: json.data.footer_config ?? DEFAULT_FOOTER_CONFIG,
                            announcementBanners: Array.isArray(json.data.announcement_banners)
                                ? json.data.announcement_banners.map(normalizeAnnouncementBanner)
                                : [],
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
                ...(canSectionOrder && { home_section_order: config.homeSectionOrder }),
                ...(canFooterCustomize && { footer_config: config.footerConfig }),
                ...(canBanners && { announcement_banners: config.announcementBanners }),
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

    const normalizeAnnouncementBanner = (banner: AnnouncementBanner): AnnouncementBanner => ({
        ...banner,
        sticky: banner.sticky === true,
    });

    if (authLoading || loading) {
        return (
            <div className="flex bg-page h-[50vh] flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="text-text-muted">{t('adminTheme.loading')}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6 lg:p-8">
            <AdminPageHeader
                title={t('adminTheme.title')}
                subtitle={t('adminTheme.subtitle')}
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    label={t('adminTheme.brandColor')}
                    value={
                        <div className="flex items-center gap-2">
                            <span
                                className="h-4 w-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: config.brandColor }}
                            />
                            <span className="font-mono text-base">{config.brandColor}</span>
                        </div>
                    }
                    hint={t('adminTheme.appearance')}
                    icon={<Palette className="h-5 w-5" />}
                    iconClassName="bg-rose-50 text-rose-700"
                />
                <AdminStatCard
                    label={t('adminTheme.heroStyle')}
                    value={config.heroVariant}
                    hint={t('adminTheme.fontPairing')}
                    icon={<ImageIcon className="h-5 w-5" />}
                    iconClassName="bg-blue-50 text-blue-700"
                />
                <AdminStatCard
                    label={t('adminTheme.ctaButtons')}
                    value={enabledCTAButtons}
                    hint={t('adminTheme.sectionOrder')}
                    icon={<MousePointerClick className="h-5 w-5" />}
                    iconClassName="bg-amber-50 text-amber-700"
                />
                <AdminStatCard
                    label={t('adminTheme.announcementBanners')}
                    value={activeBanners}
                    hint={t('adminTheme.footerCustomization')}
                    icon={<Megaphone className="h-5 w-5" />}
                    iconClassName="bg-violet-50 text-violet-700"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                <Tabs defaultValue="appearance" className="gap-4">
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardContent className="p-2">
                            <TabsList className="h-auto w-full justify-start overflow-x-auto bg-transparent shadow-none">
                                <TabsTrigger value="appearance" className="flex-none">
                                    {t('adminTheme.appearance')}
                                </TabsTrigger>
                                <TabsTrigger value="home" className="flex-none">
                                    {t('adminTheme.ctaButtons')}
                                </TabsTrigger>
                                <TabsTrigger value="footer" className="flex-none">
                                    {t('adminTheme.footerCustomization')}
                                </TabsTrigger>
                                <TabsTrigger value="banners" className="flex-none">
                                    {t('adminTheme.announcementBanners')}
                                </TabsTrigger>
                            </TabsList>
                        </CardContent>
                    </Card>

                    <TabsContent value="appearance" className="space-y-4">
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

                                <div className="flex flex-col justify-center gap-3 rounded-md border border-surface-border p-3">
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
                    </TabsContent>

                    <TabsContent value="home" className="space-y-4">
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
                                                    className="space-y-3 rounded-lg border border-surface-border bg-page p-4"
                                                >
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

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <GripVertical className="h-5 w-5 text-brand" />
                                    {t("adminTheme.sectionOrder")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.sectionOrderDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canSectionOrder ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.homeSectionOrder")}
                                        feature="HOME_SECTION_ORDER"
                                        currentPlan={plan}
                                        requiredPlan="BUSINESS"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {config.homeSectionOrder.map((key, idx) => {
                                            const labels: Record<HomeSectionKey, string> = {
                                                about: t("adminTheme.sectionAbout"),
                                                services: t("adminTheme.sectionServices"),
                                                events: t("adminTheme.sectionEvents"),
                                                classes: t("adminTheme.sectionClasses"),
                                                team: t("adminTheme.sectionTeam"),
                                            };
                                            return (
                                                <div key={key} className="flex items-center gap-3 rounded-lg border border-surface-border bg-page px-4 py-3">
                                                    <GripVertical className="h-4 w-4 shrink-0 text-text-muted" />
                                                    <span className="flex-1 text-sm font-medium text-text-main">{labels[key]}</span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={idx === 0}
                                                            onClick={() => {
                                                                setConfig(prev => {
                                                                    const arr = [...prev.homeSectionOrder];
                                                                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                                                    return { ...prev, homeSectionOrder: arr };
                                                                });
                                                            }}
                                                        >
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={idx === config.homeSectionOrder.length - 1}
                                                            onClick={() => {
                                                                setConfig(prev => {
                                                                    const arr = [...prev.homeSectionOrder];
                                                                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                                                    return { ...prev, homeSectionOrder: arr };
                                                                });
                                                            }}
                                                        >
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="footer" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <PanelBottom className="h-5 w-5 text-brand" />
                                    {t("adminTheme.footerCustomization")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.footerCustomizationDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canFooterCustomize ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.footerCustomization")}
                                        feature="FOOTER_CUSTOMIZATION"
                                        currentPlan={plan}
                                        requiredPlan="BUSINESS"
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>{t("adminTheme.footerTagline")}</Label>
                                            <Input
                                                value={config.footerConfig.tagline ?? ""}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    footerConfig: { ...prev.footerConfig, tagline: e.target.value || null },
                                                }))}
                                                placeholder={t("adminTheme.footerTaglinePlaceholder")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Contact Info</Label>
                                            <div className="space-y-2">
                                                {(["show_address", "show_phone", "show_email"] as const).map((field) => {
                                                    const labels = {
                                                        show_address: t("adminTheme.footerShowAddress"),
                                                        show_phone: t("adminTheme.footerShowPhone"),
                                                        show_email: t("adminTheme.footerShowEmail"),
                                                    };
                                                    return (
                                                        <div key={field} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                                                            <span className="text-sm text-text-main">{labels[field]}</span>
                                                            <Switch
                                                                checked={config.footerConfig[field]}
                                                                onCheckedChange={(v) => setConfig(prev => ({
                                                                    ...prev,
                                                                    footerConfig: { ...prev.footerConfig, [field]: v },
                                                                }))}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t("adminTheme.footerNavLinks")}</Label>
                                            <div className="space-y-2">
                                                {config.footerConfig.nav_links.map((link) => {
                                                    const navLabels: Record<string, string> = {
                                                        home: t("adminTheme.footerNavHome"),
                                                        services: t("adminTheme.footerNavServices"),
                                                        events: t("adminTheme.footerNavEvents"),
                                                        classes: t("adminTheme.footerNavClasses"),
                                                        about: t("adminTheme.footerNavAbout"),
                                                        book: t("adminTheme.footerNavBook"),
                                                    };
                                                    return (
                                                        <div key={link.key} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                                                            <span className="text-sm text-text-main">{navLabels[link.key] ?? link.key}</span>
                                                            <Switch
                                                                checked={link.enabled}
                                                                onCheckedChange={(v) => setConfig(prev => ({
                                                                    ...prev,
                                                                    footerConfig: {
                                                                        ...prev.footerConfig,
                                                                        nav_links: prev.footerConfig.nav_links.map((l) =>
                                                                            l.key === link.key ? { ...l, enabled: v } : l
                                                                        ),
                                                                    },
                                                                }))}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="banners" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Megaphone className="h-5 w-5 text-brand" />
                                    {t("adminTheme.announcementBanners")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.announcementBannersDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canBanners ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.announcementBanners")}
                                        feature="ANNOUNCEMENT_BANNERS"
                                        currentPlan={plan}
                                        requiredPlan="PRO"
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {config.announcementBanners.map((banner, idx) => (
                                            <div key={banner.id} className="space-y-4 rounded-lg border border-surface-border bg-page p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={banner.enabled}
                                                            onCheckedChange={(v) => setConfig(prev => ({
                                                                ...prev,
                                                                announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                    i === idx ? { ...b, enabled: v } : b
                                                                ),
                                                            }))}
                                                        />
                                                        <span className="text-sm font-semibold text-text-main">
                                                            {t("adminTheme.announcementBannerEnabled")}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-text-muted">
                                                                {t("adminTheme.announcementBannerSticky")}
                                                            </span>
                                                            <Switch
                                                                checked={banner.sticky === true}
                                                                onCheckedChange={(v) => setConfig(prev => ({
                                                                    ...prev,
                                                                    announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                        i === idx ? { ...b, sticky: v } : b
                                                                    ),
                                                                }))}
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            onClick={() => setConfig(prev => ({
                                                                ...prev,
                                                                announcementBanners: prev.announcementBanners.filter((_, i) => i !== idx),
                                                            }))}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">{t("adminTheme.announcementBannerMessage")}</Label>
                                                    <Input
                                                        value={banner.message}
                                                        onChange={(e) => setConfig(prev => ({
                                                            ...prev,
                                                            announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                i === idx ? { ...b, message: e.target.value } : b
                                                            ),
                                                        }))}
                                                        placeholder={t("adminTheme.announcementBannerMessagePlaceholder")}
                                                    />
                                                    <p className="text-xs text-text-muted">
                                                        {t("adminTheme.announcementBannerStickyDesc")}
                                                    </p>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.announcementBannerLinkUrl")}</Label>
                                                        <Input
                                                            value={banner.link_url ?? ""}
                                                            onChange={(e) => setConfig(prev => ({
                                                                ...prev,
                                                                announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                    i === idx ? { ...b, link_url: e.target.value || null } : b
                                                                ),
                                                            }))}
                                                            placeholder="https://..."
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.announcementBannerLinkLabel")}</Label>
                                                        <Input
                                                            value={banner.link_label ?? ""}
                                                            onChange={(e) => setConfig(prev => ({
                                                                ...prev,
                                                                announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                    i === idx ? { ...b, link_label: e.target.value || null } : b
                                                                ),
                                                            }))}
                                                            placeholder={t("adminTheme.announcementBannerLinkLabelPlaceholder")}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.announcementBannerBgColor")}</Label>
                                                        <div className="flex gap-2">
                                                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-surface-border">
                                                                <input
                                                                    type="color"
                                                                    value={banner.background_color}
                                                                    onChange={(e) => setConfig(prev => ({
                                                                        ...prev,
                                                                        announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                            i === idx ? { ...b, background_color: e.target.value } : b
                                                                        ),
                                                                    }))}
                                                                    className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                                                />
                                                            </div>
                                                            <Input
                                                                value={banner.background_color}
                                                                onChange={(e) => setConfig(prev => ({
                                                                    ...prev,
                                                                    announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                        i === idx ? { ...b, background_color: e.target.value } : b
                                                                    ),
                                                                }))}
                                                                className="h-8 font-mono uppercase text-sm"
                                                                maxLength={7}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.announcementBannerTextColor")}</Label>
                                                        <div className="flex gap-2">
                                                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-surface-border">
                                                                <input
                                                                    type="color"
                                                                    value={banner.text_color}
                                                                    onChange={(e) => setConfig(prev => ({
                                                                        ...prev,
                                                                        announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                            i === idx ? { ...b, text_color: e.target.value } : b
                                                                        ),
                                                                    }))}
                                                                    className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                                                />
                                                            </div>
                                                            <Input
                                                                value={banner.text_color}
                                                                onChange={(e) => setConfig(prev => ({
                                                                    ...prev,
                                                                    announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                        i === idx ? { ...b, text_color: e.target.value } : b
                                                                    ),
                                                                }))}
                                                                className="h-8 font-mono uppercase text-sm"
                                                                maxLength={7}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t("adminTheme.announcementBannerExpiresAt")}</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={banner.expires_at ? banner.expires_at.slice(0, 16) : ""}
                                                            onChange={(e) => setConfig(prev => ({
                                                                ...prev,
                                                                announcementBanners: prev.announcementBanners.map((b, i) =>
                                                                    i === idx ? { ...b, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null } : b
                                                                ),
                                                            }))}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex items-center justify-center gap-3 rounded-md px-4 py-2 text-sm font-medium"
                                                    style={{ backgroundColor: banner.background_color, color: banner.text_color }}
                                                >
                                                    {banner.message || "…"}
                                                    {banner.link_url && (
                                                        <span className="underline underline-offset-2">{banner.link_label || "Ver más"}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {config.announcementBanners.length < 3 && (
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2"
                                                onClick={() => setConfig(prev => ({
                                                    ...prev,
                                                    announcementBanners: [
                                                        ...prev.announcementBanners,
                                                        {
                                                            id: crypto.randomUUID(),
                                                            message: "",
                                                            link_url: null,
                                                            link_label: null,
                                                            background_color: "#1d4ed8",
                                                            text_color: "#ffffff",
                                                            enabled: true,
                                                            sticky: false,
                                                            expires_at: null,
                                                        },
                                                    ],
                                                }))}
                                            >
                                                <Plus className="h-4 w-4" />
                                                {t("adminTheme.announcementBannersAddBanner")}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutTemplate className="h-5 w-5 text-brand" />
                                {t('adminTheme.preview')}
                            </CardTitle>
                            <CardDescription>{t('adminTheme.savedLive')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border-2 border-dashed border-surface-border bg-page p-3 lg:p-4">
                                <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5">
                                    <ThemePreview
                                        config={config}
                                        heroVariant={config.heroVariant}
                                        fontPairing={config.fontPairing}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
