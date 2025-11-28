"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type ThemeConfig,
  type ComputedTheme,
  computeTheme,
} from "@/utils/themepicker";

/**
 * Developer guide for theming:
 * - Wrap every page inside <ThemeProvider> so CSS variables stay in sync.
 * - Consume `useTheme()` anywhere you need live config or to build settings panels.
 * - Favor Tailwind classes that map to our CSS vars (bg-page, text-text-main, bg-brand, etc.)
 *   instead of hard-coded colors to keep tenant themes consistent.
 */

export const defaultConfig: ThemeConfig = {
  brandColor: "#2563eb",
  pageBackgroundColor: "#f3f4f6",
  pageBackgroundPreset: "auto",
  cardsElevated: true,
  cornerRadius: "md",
  fontPreset: "modern",
};

type ThemeContextValue = {
  config: ThemeConfig;
  theme: ComputedTheme;
  setThemeConfig: React.Dispatch<React.SetStateAction<ThemeConfig>>;
};

const storageKey = "barber-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  initialConfig?: Partial<ThemeConfig>;
  children: React.ReactNode;
};

export function ThemeProvider({
  initialConfig,
  children,
}: ThemeProviderProps) {
  const [config, setConfig] = useState<ThemeConfig>(() => ({
    ...defaultConfig,
    ...(initialConfig ?? {}),
  }));

  // Load user preferences on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ThemeConfig>;
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn("Unable to load saved theme config", error);
    }
  }, []);

  // Re-apply overrides if the initialConfig prop changes at runtime (e.g., per-tenant defaults).
  useEffect(() => {
    if (!initialConfig) return;
    setConfig((prev) => ({ ...prev, ...initialConfig }));
  }, [initialConfig]);

  const theme = useMemo(() => computeTheme(config), [config]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      Object.entries(theme.tokens.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (error) {
        console.warn("Unable to persist theme config", error);
      }
    }
  }, [config, theme]);

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
