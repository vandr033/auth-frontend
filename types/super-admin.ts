// Types for Super Admin management (shops and users)

export interface CompanyType {
    id: number;
    key: string;
    name: string;
    name_i18n?: Record<string, string>;
    description?: string;
    description_i18n?: Record<string, string>;
    icon_name?: string;
    is_active: boolean;
}

export type ShopPlan = "STARTER" | "BUSINESS" | "PRO";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type ProductCode =
    | "RESERVAS"
    | "EVENTOS"
    | "CLASES"
    | "STORES"
    | "RESTAURANTE"
    | "PERSONALIZACION"
    | "CRM"
    | "MENSAJERIA"
    | "METRICAS"
    | "MARKETPLACE";
export type ProductTierCode =
    | "RESERVAS_BASE"
    | "RESERVAS_PRO"
    | "EVENTOS_BASE"
    | "EVENTOS_PRO"
    | "CLASES_BASE"
    | "CLASES_PRO"
    | "STORES_BASE"
    | "STORES_PRO"
    | "RESTAURANTE_PRO"
    | "PERSONALIZACION_BASE"
    | "PERSONALIZACION_PLUS"
    | "CRM_BASE"
    | "CRM_PRO"
    | "MENSAJERIA_BASE"
    | "MENSAJERIA_PRO"
    | "METRICAS_BASE"
    | "METRICAS_PRO"
    | "MARKETPLACE_PLUS";

export interface ActiveCommercialProduct {
    productCode: ProductCode;
    productName: string;
    tierCode: ProductTierCode;
    tierName: string;
    isCoreProduct: boolean;
    includedByDefault: boolean;
    billingCycle: BillingCycle;
    pricePaid: string | null;
    currency: string;
    availableUntil: string;
    status: "ACTIVE" | "TRIALING" | "EXPIRED" | "CANCELLED" | "SUSPENDED";
}

export interface RequestedCommercialProduct {
    productCode: ProductCode;
    productName: string;
    tierCode: ProductTierCode;
    tierName: string;
    isCoreProduct: boolean;
}

export interface SuperAdminShop {
    id: number;
    slug: string;
    name: string;
    address?: string;
    phone_prefix: string;
    phone: string;
    email?: string;
    google_maps_url?: string;
    city?: string;
    state?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone: string;
    currency: string;
    plan: ShopPlan;
    billingCycle: BillingCycle;
    pricePaid?: string | number | null;
    availableUntil: string;
    isMarketplaceVisible: boolean;
    restaurant_enabled?: boolean;
    logo_url?: string;
    is_active: boolean;
    company_type_id: number;
    company_type?: CompanyType;
    activeProducts?: ActiveCommercialProduct[];
    requestedProducts?: RequestedCommercialProduct[];
    legacyPlanCompatibility?: ShopPlan;
    user_count?: number;
    created_at: string;
    updated_at: string;
}

export interface CommercialProductPayload {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    billingCycle?: BillingCycle | null;
    pricePaid?: number | null;
    currency?: string | null;
    availableUntil?: string | null;
}

export interface RequestedProductPayload {
    productCode: ProductCode;
    tierCode: ProductTierCode;
}

export interface CreateShopPayload {
    name: string;
    slug?: string;
    address?: string;
    phone_prefix?: string;
    phone: string;
    email?: string;
    google_maps_url?: string;
    city?: string;
    state?: string;
    country_code?: string;
    timezone?: string;
    currency: string;
    latitude?: number;
    longitude?: number;
    company_type_id: number;
    plan: ShopPlan;
    billingCycle: BillingCycle;
    pricePaid?: number | null;
    availableUntil: string;
    isMarketplaceVisible: boolean;
    activeProducts?: CommercialProductPayload[];
    requestedProducts?: RequestedProductPayload[];
    restaurantEnabled?: boolean;
    note?: string;
    owner: {
        existingUserId?: string;
        email?: string;
        password?: string;
        first_name?: string;
        last_name?: string;
        phone_prefix?: string;
        phone?: string;
        display_name?: string;
        is_bookable?: boolean;
    };
}

export type UpdateShopPayload = Partial<CreateShopPayload>;

export interface ShopUser {
    company_user_id: number;
    role: "OWNER" | "ADMIN" | "STAFF" | "CUSTOMER";
    user: {
        id: string;
        email: string;
        name?: string;
        first_name?: string;
        last_name?: string;
        is_active: boolean;
        created_at: string;
    };
    staff_profile?: {
        id: number;
        display_name: string;
        is_bookable: boolean;
        image_url?: string;
        status?: "PENDING" | "ACTIVE" | "INACTIVE";
        invite_token?: string | null;
    };
}

export interface AddUserPayload {
    email: string;
    password?: string; // Required only for new users
    first_name?: string;
    last_name?: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    display_name?: string;
    is_bookable?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
