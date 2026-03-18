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

export function formatCurrencyFromCents(
    cents: number,
    currency?: string | null,
    options: CurrencyFormatOptions = {},
): string {
    const numeric = Number.isFinite(cents) ? cents / 100 : 0;
    return formatCurrencyAmount(numeric, currency, options);
}

