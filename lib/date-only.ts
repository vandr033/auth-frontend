const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_ONLY_UTC_MIDNIGHT_REGEX = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d{1,3})?Z$/;

function parseDateOnlyParts(value: string): { year: number; month: number; day: number } | null {
    const match = DATE_ONLY_REGEX.exec(value);
    if (!match) return null;

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

function toDateOnlyFromKnownValue(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (DATE_ONLY_REGEX.test(trimmed)) {
        return trimmed;
    }

    const midnightMatch = DATE_ONLY_UTC_MIDNIGHT_REGEX.exec(trimmed);
    if (midnightMatch) {
        return midnightMatch[1];
    }

    return null;
}

export function formatDateOnly(value: string | null | undefined, locale?: string): string {
    if (!value) return "—";

    const dateOnlyValue = toDateOnlyFromKnownValue(value);
    if (dateOnlyValue) {
        const parts = parseDateOnlyParts(dateOnlyValue);
        if (!parts) return "—";

        const parsedUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeZone: "UTC",
        }).format(parsedUtc);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";

    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
    }).format(parsed);
}

export function toLocalDateInputValue(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
