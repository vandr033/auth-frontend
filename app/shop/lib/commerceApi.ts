"use client";

import { resolveApiUrl } from "@/lib/api-url";
import { DEFAULT_LOCALE, getLocaleCookie, translate } from "@/lib/i18n";
import type {
    ShopCommerceCategory,
    ShopCommerceOrderScheduleSlot,
    ShopCommercePointOfSale,
    ShopCommerceProduct,
    ShopCommerceStore,
} from "@/types/shop";

export type PublicCommercePickupPoint = {
    id: string;
    name: string;
    address?: string | null;
    map_url?: string | null;
    instructions?: string | null;
    sort_order: number;
};

export type PublicCommerceOrderItem = {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    total: number;
};

export type PublicCommerceOrder = {
    id: string;
    order_number: string;
    public_access_token?: string | null;
    customer_name: string;
    payment_method: "CASH" | "QR" | "MANUAL";
    payment_status: string;
    fulfillment_status: string;
    fulfillment_type: "PICKUP" | "DELIVERY";
    created_at: string;
    payment_proof_url?: string | null;
    delivery_address?: string | null;
    delivery_notes?: string | null;
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
    delivery_place_id?: string | null;
    delivery_location_meta?: {
        provider?: string | null;
        source?: string | null;
        formattedAddress?: string | null;
        mapboxPlaceId?: string | null;
    } | null;
    total?: number | null;
    items: PublicCommerceOrderItem[];
};

export type PublicCommerceOrderLookupResponse = {
    company: {
        id: number;
        slug: string;
        name: string;
        currency?: string | null;
        logo_url?: string | null;
    };
    store: Pick<
        ShopCommerceStore,
        | "allow_cash_payment"
        | "allow_qr_payment"
        | "allow_manual_payment"
        | "qr_image_url"
        | "payment_instructions"
        | "payment_proof_required"
        | "delivery_cost_mode"
        | "delivery_instructions"
    >;
    order: PublicCommerceOrder;
};

export type PublicCommerceStoreResponse = {
    company: {
        id: number;
        slug: string;
        name: string;
        currency?: string | null;
        country_code?: string | null;
        timezone?: string | null;
        logo_url?: string | null;
    };
    store: ShopCommerceStore;
    categories: ShopCommerceCategory[];
    pickup_points: PublicCommercePickupPoint[];
    points_of_sale: ShopCommercePointOfSale[];
    featured_products: ShopCommerceProduct[];
    promo_products: ShopCommerceProduct[];
    combo_products: ShopCommerceProduct[];
    products: ShopCommerceProduct[];
};

export type PublicCommerceOrderPayload = {
    customerName: string;
    customerPhone: string;
    customerPhonePrefix: string;
    customerCountryCode?: string | null;
    customerEmail: string;
    fulfillmentType: "PICKUP" | "DELIVERY";
    pickupPointId?: string | null;
    deliveryAddress?: string | null;
    deliveryNotes?: string | null;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    deliveryPlaceId?: string | null;
    deliveryLocationMeta?: {
        provider?: string | null;
        source?: string | null;
        formattedAddress?: string | null;
        mapboxPlaceId?: string | null;
    } | null;
    scheduledFor?: string | null;
    customerNotes?: string | null;
    paymentMethod: "CASH" | "QR" | "MANUAL";
    paymentProofUrl?: string | null;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
};

export type PublicCommerceGuestCheckoutResult = {
    checkout_session_id: string | null;
    accountOutcome:
        | "NEW_ACCOUNT_PENDING_CREATION"
        | "ACCOUNT_FOUND_BY_EMAIL"
        | "ACCOUNT_FOUND_BY_PHONE"
        | "ACCOUNT_ALREADY_EXISTS"
        | "ACCOUNT_CONFLICT_PHONE_EMAIL";
    otpDelivery: {
        emailSent: boolean;
        phoneSent: boolean;
        maskedEmail: string | null;
        maskedPhone: string | null;
    };
    expiresAt: string | null;
    resendCooldownSeconds: number;
    canVerify: boolean;
};

export type PublicCommerceGuestCheckoutVerifyResult = {
    authenticated: boolean;
    storefrontLinked: boolean;
    user?: {
        id?: string;
        email?: string | null;
        name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        country_code?: string | null;
        phone_prefix?: string | null;
        phoneNumber?: string | null;
    } | null;
};

function getCurrentLocale() {
    return getLocaleCookie() ?? DEFAULT_LOCALE;
}

function getGenericCommerceError() {
    return translate(getCurrentLocale(), "common.error");
}

async function parseApiResponse<T>(response: Response): Promise<T> {
    const json = await response.json();
    if (!response.ok || json?.error) {
        throw new Error(json?.message || getGenericCommerceError());
    }
    return json.data as T;
}

export async function getPublicCommerceStore(slug: string): Promise<PublicCommerceStoreResponse> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/store`), {
        credentials: "include",
        cache: "no-store",
    });
    return parseApiResponse<PublicCommerceStoreResponse>(response);
}

export async function getPublicCommerceProduct(
    slug: string,
    productSlug: string,
): Promise<ShopCommerceProduct> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/products/${productSlug}`), {
        credentials: "include",
        cache: "no-store",
    });
    return parseApiResponse<ShopCommerceProduct>(response);
}

export async function createPublicCommerceOrder(
    slug: string,
    payload: PublicCommerceOrderPayload,
): Promise<PublicCommerceOrder> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/orders`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PublicCommerceOrder>(response);
}

export async function startPublicCommerceGuestCheckout(
    slug: string,
    payload: Pick<
        PublicCommerceOrderPayload,
        "customerName" | "customerPhone" | "customerPhonePrefix" | "customerCountryCode" | "customerEmail"
    >,
): Promise<PublicCommerceGuestCheckoutResult> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/checkout/guest/start`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    return parseApiResponse<PublicCommerceGuestCheckoutResult>(response);
}

export async function resendPublicCommerceGuestCheckout(
    slug: string,
    checkoutSessionId: string,
): Promise<PublicCommerceGuestCheckoutResult> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/checkout/guest/resend`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkout_session_id: checkoutSessionId }),
    });
    return parseApiResponse<PublicCommerceGuestCheckoutResult>(response);
}

export async function verifyPublicCommerceGuestCheckout(
    slug: string,
    checkoutSessionId: string,
    code: string,
): Promise<PublicCommerceGuestCheckoutVerifyResult> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/checkout/guest/verify`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            checkout_session_id: checkoutSessionId,
            code,
        }),
    });
    return parseApiResponse<PublicCommerceGuestCheckoutVerifyResult>(response);
}

export async function getPublicCommerceOrder(
    slug: string,
    orderNumber: string,
    accessToken?: string | null,
): Promise<PublicCommerceOrderLookupResponse> {
    const search = new URLSearchParams();
    if (accessToken) {
        search.set("token", accessToken);
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/orders/${orderNumber}${suffix}`), {
        credentials: "include",
        cache: "no-store",
    });
    return parseApiResponse<PublicCommerceOrderLookupResponse>(response);
}

export async function submitPublicCommercePaymentProof(
    slug: string,
    orderNumber: string,
    paymentProofUrl: string,
    accessToken?: string | null,
) {
    const response = await fetch(
        resolveApiUrl(`/api/public/commerce/${slug}/orders/${orderNumber}/payment-proof`),
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ paymentProofUrl, accessToken }),
        },
    );
    return parseApiResponse<PublicCommerceOrder>(response);
}

export async function uploadCheckoutCommercePaymentProof(slug: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/checkout/payment-proof-upload`), {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    return parseApiResponse<{ url: string; deleteToken?: string }>(response);
}

export async function uploadPublicCommercePaymentProof(
    slug: string,
    orderNumber: string,
    file: File,
    accessToken?: string | null,
) {
    const formData = new FormData();
    formData.append("image", file);
    if (accessToken) {
        formData.append("accessToken", accessToken);
    }

    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/orders/${orderNumber}/payment-proof/upload`), {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    return parseApiResponse<{ url: string; deleteToken?: string }>(response);
}

export async function deletePublicCommercePaymentProof(url: string, deleteToken?: string) {
    const response = await fetch(resolveApiUrl("/api/upload/qr"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, deleteToken }),
    });
    return parseApiResponse<{ success?: boolean }>(response);
}

export async function listMyCommerceOrders(slug: string): Promise<PublicCommerceOrder[]> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/me/orders`), {
        credentials: "include",
        cache: "no-store",
    });
    return parseApiResponse<PublicCommerceOrder[]>(response);
}

export async function getMyCommerceOrder(
    slug: string,
    orderNumber: string,
): Promise<PublicCommerceOrderLookupResponse> {
    const response = await fetch(resolveApiUrl(`/api/public/commerce/${slug}/me/orders/${orderNumber}`), {
        credentials: "include",
        cache: "no-store",
    });
    return parseApiResponse<PublicCommerceOrderLookupResponse>(response);
}
