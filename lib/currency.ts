const DEFAULT_CURRENCY = "Bs.";

type CurrencyFormatOptions = {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
};

export function normalizeCurrencyLabel(currency?: string | null): string {
    const normalized = typeof currency === "string" ? currency.trim() : "";
    return normalized.length > 0 ? normalized : DEFAULT_CURRENCY;
}

export function formatCurrencyAmount(
    amount: number,
    currency?: string | null,
    options: CurrencyFormatOptions = {},
): string {
    const {
        locale,
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
    } = options;

    const numeric = Number.isFinite(amount) ? amount : 0;
    const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(numeric);

    return `${normalizeCurrencyLabel(currency)} ${formattedNumber}`;
}

export function formatFixedCurrencyAmount(
    amount: number,
    currency?: string | null,
): string {
    const numeric = Number.isFinite(amount) ? amount : 0;
    return `${normalizeCurrencyLabel(currency)} ${numeric.toFixed(2)}`;
}

export function formatCurrencyFromCents(
    cents: number,
    currency?: string | null,
    options: CurrencyFormatOptions = {},
): string {
    const numeric = Number.isFinite(cents) ? cents / 100 : 0;
    return formatCurrencyAmount(numeric, currency, options);
}

export function formatFixedCurrencyFromCents(
    cents: number,
    currency?: string | null,
): string {
    const numeric = Number.isFinite(cents) ? cents / 100 : 0;
    return formatFixedCurrencyAmount(numeric, currency);
}

export function formatCurrencyInputFromCents(cents: number): string {
    const numeric = Number.isFinite(cents) ? cents / 100 : 0;
    const fixed = numeric.toFixed(2);
    return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

export function parseCurrencyInputToCents(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) return null;

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return null;
    }

    return Math.round(numeric * 100);
}
