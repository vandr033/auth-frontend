"use client";

import { DEFAULT_LOCALE, getLocaleCookie, translate } from "@/lib/i18n";
import { getProductAccessRecommendationForCapability } from "@/lib/product-access";
import type { ProductAccessRecommendation, ProductCapability } from "@/types/product-access";

type ApiErrorPayload = {
    code?: unknown;
    error?: unknown;
    message?: unknown;
    reason?: unknown;
    technicalMessage?: unknown;
    details?: unknown;
    data?: unknown;
};

type ApiErrorPayloadData = {
    capability?: unknown;
};

export type AppApiError = Error & {
    status?: number;
    code?: number;
    reason?: string;
    technicalMessage?: string;
    details?: string;
    data?: unknown;
    capability?: ProductCapability;
    isEntitlementError?: boolean;
    recommendation?: ProductAccessRecommendation;
};

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isProductCapability(value: unknown): value is ProductCapability {
    return typeof value === "string" && value.length > 0;
}

function getCurrentLocale() {
    return getLocaleCookie() ?? DEFAULT_LOCALE;
}

function buildEntitlementMessage(capability?: ProductCapability) {
    const locale = getCurrentLocale();

    if (capability) {
        const recommendation = getProductAccessRecommendationForCapability(capability);
        return translate(locale, "entitlements.requiresProduct", {
            productName: recommendation.requestLabel,
        });
    }

    return translate(locale, "entitlements.moduleNotActive");
}

export function normalizeApiError(
    payload: unknown,
    status: number,
    fallbackMessage?: string,
): AppApiError {
    const payloadRecord = toRecord(payload) as ApiErrorPayload | null;
    const payloadData = toRecord(payloadRecord?.data) as ApiErrorPayloadData | null;
    const capability = isProductCapability(payloadData?.capability) ? payloadData.capability : undefined;
    const reason = toStringOrUndefined(payloadRecord?.reason);

    const isEntitlementError = status === 403 && (
        reason === "PRODUCT_NOT_ACTIVE" ||
        reason === "CAPABILITY_REQUIRED" ||
        capability !== undefined
    );

    const rawMessage =
        toStringOrUndefined(payloadRecord?.message) ||
        toStringOrUndefined(payloadRecord?.error) ||
        toStringOrUndefined(payloadRecord?.details) ||
        fallbackMessage ||
        `Request failed with status ${status}`;

    const error = new Error(
        isEntitlementError ? buildEntitlementMessage(capability) : rawMessage,
    ) as AppApiError;

    error.status = status;
    error.code = typeof payloadRecord?.code === "number" ? payloadRecord.code : undefined;
    error.reason = reason;
    error.technicalMessage = toStringOrUndefined(payloadRecord?.technicalMessage);
    error.details = toStringOrUndefined(payloadRecord?.details);
    error.data = payloadRecord?.data;
    error.capability = capability;
    error.isEntitlementError = isEntitlementError;
    error.recommendation = capability
        ? getProductAccessRecommendationForCapability(capability)
        : undefined;

    return error;
}

export function isEntitlementApiError(error: unknown): error is AppApiError {
    return Boolean(
        error &&
        typeof error === "object" &&
        "isEntitlementError" in error &&
        (error as AppApiError).isEntitlementError === true,
    );
}
