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
    reservations_enabled: boolean;
    store_enabled: boolean;
    logo_url?: string;
    is_active: boolean;
    company_type_id: number;
    company_type?: CompanyType;
    user_count?: number;
    created_at: string;
    updated_at: string;
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
    reservations_enabled: boolean;
    store_enabled: boolean;
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
