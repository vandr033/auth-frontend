"use client";

import { formatDateOnly } from "@/lib/date-only";

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function formatDate(value: string | null | undefined): string {
    return formatDateOnly(value);
}

export function formatMoneyFromCents(cents: number, currencyLabel?: string | null): string {
    const safe = Number.isFinite(cents) ? cents : 0;
    const major = safe / 100;
    if (!currencyLabel) {
        return major.toLocaleString(undefined, { style: "currency", currency: "USD" });
    }

    return `${currencyLabel} ${major.toFixed(2)}`;
}

export function clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}
