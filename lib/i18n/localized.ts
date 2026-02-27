import type { Locale } from "./index";

export type LocalizedTextMap = Record<string, string | null | undefined> | null | undefined;

function normalizeTranslations(translations: LocalizedTextMap): Record<string, string> {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(translations)) {
    const key = rawKey.trim().toLowerCase();
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (key && value) normalized[key] = value;
  }

  return normalized;
}

export function getLocalizedText(options: {
  text?: string | null;
  translations?: LocalizedTextMap;
  locale: Locale;
  fallbackLocales?: string[];
}): string {
  const { text, translations, locale, fallbackLocales = ["es", "en"] } = options;
  const normalizedText = text?.trim() || "";
  const normalizedTranslations = normalizeTranslations(translations);

  const preferred = normalizedTranslations[locale];
  if (preferred) return preferred;

  for (const fallbackLocale of fallbackLocales) {
    const fallback = normalizedTranslations[fallbackLocale.toLowerCase()];
    if (fallback) return fallback;
  }

  const firstTranslation = Object.values(normalizedTranslations)[0];
  if (firstTranslation) return firstTranslation;

  return normalizedText;
}
