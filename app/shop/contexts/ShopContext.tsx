"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import type {
    ShopData,
    ShopCompany,
    ShopCategory,
    ShopService,
    ShopStaff,
    ShopHours,
    ShopTheme,
    ShopSettings,
    ShopReviewStats,
    HeroVariant,
    ServicesVariant,
    TeamVariant,
    FontPairing,
    SocialLinks,
} from "@/types/shop";
import { computeTheme, type ThemeConfig } from "@/utils/themepicker";
import { DEFAULT_LOCALE, getLocaleCookie, I18nProvider, translate } from "@/lib/i18n";
import { applyMainSiteTheme } from "@/theme/mainSiteTheme";
import { getShopSlugFromParams } from "@/app/lib/shop-context";
import {
    normalizeShopData,
    resolvePublicApiUrl,
    type ShopApiResponse,
} from "../lib/shopData";

type ShopContextValue = {
    company: ShopCompany | null;
    categories: ShopCategory[];
    services: ShopService[];
    staff: ShopStaff[];
    hours: ShopHours[];
    settings: ShopSettings | null;
    theme: ShopTheme | null;
    reviewStats: ShopReviewStats | null;
    heroVariant: HeroVariant;
    servicesVariant: ServicesVariant;
    teamVariant: TeamVariant;
    fontPairing: FontPairing;
    socialLinks: SocialLinks;
    loading: boolean;
    error: string | null;
    slug: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const shopDataCache = new Map<string, ShopData>();

const defaultTheme: ShopTheme = {
    brand_color: "#2563eb",
    page_background_color: "#f3f4f6",
    page_background_preset: "auto",
    cards_elevated: true,
    corner_radius: "md",
    font_pairing: "classic",
    hero_variant: "hero-cinematic",
    services_variant: "services-grid",
    team_variant: "team-cards",
};

const shopT = (key: string, vars?: Record<string, string | number>) =>
    translate(getLocaleCookie() ?? DEFAULT_LOCALE, key, vars);

const toThemeConfig = (theme: ShopTheme | null | undefined): ThemeConfig => ({
    brandColor: theme?.brand_color || defaultTheme.brand_color,
    pageBackgroundColor: theme?.page_background_color || defaultTheme.page_background_color,
    pageBackgroundPreset: theme?.page_background_preset || defaultTheme.page_background_preset,
    cardsElevated: theme?.cards_elevated ?? defaultTheme.cards_elevated,
    cornerRadius: theme?.corner_radius || defaultTheme.corner_radius,
    fontPreset: "modern",
    fontPairing: theme?.font_pairing || defaultTheme.font_pairing,
});

type ShopProviderProps = {
    slug: string;
    children: React.ReactNode;
    initialData?: ShopData | null;
    initialError?: string | null;
};

export function ShopProvider({
    slug,
    children,
    initialData = null,
    initialError = null,
}: ShopProviderProps) {
    const cachedData = initialData ?? shopDataCache.get(slug) ?? null;
    const hasWarmData = !!cachedData;

    const [data, setData] = useState<ShopData | null>(() => cachedData);
    const [loading, setLoading] = useState<boolean>(() => !hasWarmData);
    const [error, setError] = useState<string | null>(() =>
        hasWarmData ? null : initialError,
    );

    useEffect(() => {
        if (initialData) {
            shopDataCache.set(slug, initialData);
        }
    }, [initialData, slug]);

    useEffect(() => {
        if (!slug || initialData) {
            return;
        }

        const controller = new AbortController();

        const fetchShopData = async () => {
            if (!hasWarmData) {
                setLoading(true);
            }
            setError(null);

            try {
                const response = await fetch(resolvePublicApiUrl(`/company/${slug}`), {
                    credentials: "include",
                    signal: controller.signal,
                });
                const result = (await response.json()) as ShopApiResponse;

                if (!response.ok || result.error || !result.data) {
                    throw new Error(result.message || shopT("shopHome.loadShopDataError"));
                }

                const normalized = normalizeShopData(result.data);
                setData(normalized);
                shopDataCache.set(slug, normalized);
            } catch (err) {
                if (controller.signal.aborted) return;
                const message = err instanceof Error ? err.message : shopT("common.error");
                setError(message);
                if (!hasWarmData) {
                    setData(null);
                }
            } finally {
                if (controller.signal.aborted) return;
                setLoading(false);
            }
        };

        void fetchShopData();

        return () => {
            controller.abort();
        };
    }, [slug, initialData, hasWarmData]);

    // Apply theme CSS variables when data loads
    useLayoutEffect(() => {
        if (!data?.theme || typeof document === "undefined") return;

        const computed = computeTheme(toThemeConfig(data.theme));
        const root = document.documentElement;

        Object.entries(computed.tokens.cssVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Cleanup: Reset to main site theme when leaving shop pages
        return () => {
            root.style.removeProperty("--font-heading");
            root.style.removeProperty("--font-body");

            if (typeof window !== "undefined" && window.location.pathname.startsWith("/me")) {
                const nextShopSlug = getShopSlugFromParams(
                    new URLSearchParams(window.location.search),
                );
                if (nextShopSlug === slug) return;
            }

            applyMainSiteTheme();
        };
    }, [data?.theme, slug]);

    const value = useMemo<ShopContextValue>(
        () => ({
            company: data?.company ?? null,
            categories: data?.categories ?? [],
            services: data?.services ?? [],
            staff: data?.staff ?? [],
            hours: data?.hours ?? [],
            settings: data?.settings ?? null,
            theme: data?.theme ?? defaultTheme,
            reviewStats: data?.reviewStats ?? null,
            heroVariant: data?.theme?.hero_variant ?? "hero-cinematic",
            servicesVariant: data?.theme?.services_variant ?? "services-grid",
            teamVariant: data?.theme?.team_variant ?? "team-cards",
            fontPairing: data?.theme?.font_pairing ?? "classic",
            socialLinks: data?.settings?.social_links ?? {},
            loading,
            error,
            slug,
        }),
        [data, loading, error, slug],
    );

    return (
        <ShopContext.Provider value={value}>
            <I18nProvider defaultLocale={data?.settings?.default_language}>
                {children}
            </I18nProvider>
        </ShopContext.Provider>
    );
}

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error("useShop must be used within a ShopProvider");
    }
    return context;
}

export { ShopContext };
