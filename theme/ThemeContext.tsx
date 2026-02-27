"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  type ThemeConfig,
  type ComputedTheme,
  computeTheme,
} from "@/utils/themepicker";
import { mainSiteThemeConfig } from "./mainSiteTheme";
import { getShopSlugFromParams } from "@/app/lib/shop-context";

/**
 * Developer guide for theming:
 * - Wrap every page inside <ThemeProvider> so CSS variables stay in sync.
 * - Consume `useTheme()` anywhere you need live config or to build settings panels.
 * - Favor Tailwind classes that map to our CSS vars (bg-page, text-text-main, bg-brand, etc.)
 *   instead of hard-coded colors to keep tenant themes consistent.
 * 
 * NOTE: The main site uses mainSiteThemeConfig by default.
 * Shop pages override this via ShopContext with their own theme.
 */

// Use main site theme as the app-wide default
export const defaultConfig: ThemeConfig = mainSiteThemeConfig;

type ThemeContextValue = {
  config: ThemeConfig;
  theme: ComputedTheme;
  setThemeConfig: React.Dispatch<React.SetStateAction<ThemeConfig>>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  initialConfig?: Partial<ThemeConfig>;
  children: React.ReactNode;
};

export function ThemeProvider({
  initialConfig,
  children,
}: ThemeProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isShopRoute = pathname?.startsWith("/shop/") ?? false;
  const shopSlug = getShopSlugFromParams(searchParams);
  const isMeRouteWithShopTheme = (pathname?.startsWith("/me") ?? false) && !!shopSlug;

  const [config, setConfig] = useState<ThemeConfig>(() => ({
    ...defaultConfig,
    ...(initialConfig ?? {}),
  }));

  // Re-apply overrides if the initialConfig prop changes at runtime (e.g., per-tenant defaults).
  useEffect(() => {
    if (!initialConfig) return;
    setConfig((prev) => ({ ...prev, ...initialConfig }));
  }, [initialConfig]);

  const theme = useMemo(() => computeTheme(config), [config]);

  useEffect(() => {
    if (isShopRoute || isMeRouteWithShopTheme) return;
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      Object.entries(theme.tokens.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [config, isMeRouteWithShopTheme, isShopRoute, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config,
      theme,
      setThemeConfig: setConfig,
    }),
    [config, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export { ThemeContext };
