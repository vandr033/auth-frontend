"use client";

import React, {
    createContext,
    useContext,
    useEffect,
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
} from "@/types/shop";
import { computeTheme, type ThemeConfig } from "@/utils/themepicker";

type ShopContextValue = {
    company: ShopCompany | null;
    categories: ShopCategory[];
    services: ShopService[];
    staff: ShopStaff[];
    hours: ShopHours[];
    settings: ShopSettings | null;
    theme: ShopTheme | null;
    reviewStats: ShopReviewStats | null;
    loading: boolean;
    error: string | null;
    slug: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);

const defaultTheme: ShopTheme = {
    brand_color: "#2563eb",
    page_background_color: "#f3f4f6",
    page_background_preset: "auto",
    cards_elevated: true,
    corner_radius: "md",
};

const resolveApiUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "";
    return `${base}${url}`;
};

type ShopProviderProps = {
    slug: string;
    children: React.ReactNode;
};

export function ShopProvider({ slug, children }: ShopProviderProps) {
    const [data, setData] = useState<ShopData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchShopData = async () => {
            setLoading(true);
            setError(null);
            // Clear stale data immediately so old theme is removed
            setData(null);
            try {
                const response = await fetch(resolveApiUrl(`/company/${slug}`), {
                    credentials: "include",
                });
                const result = await response.json();

                if (!response.ok || result.error) {
                    throw new Error(result.message || "Failed to load shop data");
                }

                // Transform the data to match our frontend interfaces
                const rawData = result.data;
                const transformedData: ShopData = {
                    ...rawData,
                    // Hours are nested inside company object from the API
                    hours: rawData.company?.hours || [],
                    staff: rawData.staff.map((s: any) => ({
                        ...s,
                        // Map the nested staff_services array to a simple array of service IDs
                        services: s.staff_services?.map((ss: any) => ss.service_id) || [],
                    })),
                };

                setData(transformedData);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            void fetchShopData();
        }
    }, [slug]);

    // Apply theme CSS variables when data loads
    useEffect(() => {
        if (!data?.theme || typeof document === "undefined") return;

        const themeConfig: ThemeConfig = {
            brandColor: data.theme.brand_color,
            pageBackgroundColor: data.theme.page_background_color,
            pageBackgroundPreset: data.theme.page_background_preset,
            cardsElevated: data.theme.cards_elevated,
            cornerRadius: data.theme.corner_radius,
            fontPreset: "modern", // Default, could be extended
        };

        const computed = computeTheme(themeConfig);
        const root = document.documentElement;

        Object.entries(computed.tokens.cssVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Cleanup: Reset to main site theme when leaving shop pages
        return () => {
            // Import dynamically to avoid circular dependency
            import("@/theme/mainSiteTheme").then(({ applyMainSiteTheme }) => {
                applyMainSiteTheme();
            });
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
            loading,
            error,
            slug,
        }),
        [data, loading, error, slug],
    );

    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error("useShop must be used within a ShopProvider");
    }
    return context;
}

export { ShopContext };
