import { es } from "date-fns/locale/es";
import { enUS } from "date-fns/locale/en-US";
import type { Locale as DateFnsLocale } from "date-fns";
import type { Locale } from "@/lib/i18n";

const DATE_LOCALE_MAP: Record<Locale, DateFnsLocale> = {
    es,
    en: enUS,
};

export function getDateLocale(locale: Locale): DateFnsLocale {
    return DATE_LOCALE_MAP[locale] ?? es;
}
