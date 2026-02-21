/**
 * Main Site Theme Configuration
 * 
 * This defines the sleek, professional, modern theme used for the main site
 * (landing page, auth pages, etc.) - separate from individual shop themes.
 */

import { computeTheme, type ThemeConfig, type ComputedTheme } from "@/utils/themepicker";

/**
 * Main site brand colors and styling
 * - Sleek blue brand color for a professional look
 * - Light, clean background
 * - Modern font and elevated cards
 */
export const mainSiteThemeConfig: ThemeConfig = {
    // Sleek professional blue
    brandColor: "#2563eb",
    // Clean light gray background
    pageBackgroundColor: "#f8fafc",
    pageBackgroundPreset: "light",
    // Elevated cards for depth
    cardsElevated: true,
    // Medium rounded corners for modern feel
    cornerRadius: "md",
    // Modern sans-serif font
    fontPreset: "modern",
};

// Pre-computed theme for performance
let cachedMainSiteTheme: ComputedTheme | null = null;

export function getMainSiteTheme(): ComputedTheme {
    if (!cachedMainSiteTheme) {
        cachedMainSiteTheme = computeTheme(mainSiteThemeConfig);
    }
    return cachedMainSiteTheme;
}

/**
 * Apply the main site theme to the document root
 * Call this when navigating to non-shop pages to reset any shop theme overrides
 */
export function applyMainSiteTheme(): void {
    if (typeof document === "undefined") return;

    const theme = getMainSiteTheme();
    const root = document.documentElement;

    Object.entries(theme.tokens.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
}
