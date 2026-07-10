"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import React from "react";
import en from "./locales/en";
import es from "./locales/es";
import type { TranslationKeys } from "./locales/en";

// ─── Supported Locales ───
export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

// ─── Locale Map ───
const locales: Record<Locale, TranslationKeys> = { en, es };

// ─── Adding a new language ───
// 1. Create lib/i18n/locales/pt.ts (copy en.ts, translate values)
// 2. Import it here and add to the locales map
// 3. Add 'pt' to SUPPORTED_LOCALES
// 4. Add the label to language.pt in each locale file
// That's it. No other code changes needed.

// ─── Helper: resolve nested key like "shopHome.quickInfo.openNow" ───
function getNestedValue(obj: unknown, path: string): string | undefined {
  return path
    .split(".")
    .reduce(
      (current, key) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      obj,
    ) as string | undefined;
}

// ─── Helper: interpolate {{variable}} placeholders ───
function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value)),
    template,
  );
}

// ─── Core translate function ───
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const value =
    getNestedValue(locales[locale], key) ??
    getNestedValue(locales[DEFAULT_LOCALE], key) ??
    key; // Fallback: show the key itself (makes missing translations easy to spot)
  return interpolate(value, vars);
}

// ─── Cookie utilities ───
export const LOCALE_COOKIE = "locale";

export function getLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const value = match?.[1];
  return value && SUPPORTED_LOCALES.includes(value as Locale)
    ? (value as Locale)
    : null;
}

export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

// ─── React Context ───
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale | string;
}

export function I18nProvider({
  children,
  defaultLocale = DEFAULT_LOCALE,
}: I18nProviderProps) {
  // Validate the defaultLocale prop
  const validDefault = SUPPORTED_LOCALES.includes(defaultLocale as Locale)
    ? (defaultLocale as Locale)
    : DEFAULT_LOCALE;

  // Start from the server-safe default. The cookie is applied after hydration so
  // a saved client preference cannot make the first client render differ from SSR.
  const [locale, setLocaleState] = useState<Locale>(validDefault);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocaleCookie(newLocale);
    // Update <html lang=""> for accessibility & SEO
    document.documentElement.lang = newLocale;
  }, []);

  // Apply a saved language preference after hydration, then keep <html lang>
  // synchronized with the active locale.
  useEffect(() => {
    const savedLocale = getLocaleCookie();
    if (savedLocale) setLocaleState(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children,
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

// Shorthand hook for just the translate function
export function useT() {
  return useI18n().t;
}
