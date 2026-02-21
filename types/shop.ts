// Types for the shop public page data (from GET /api/company/:slug)

export interface ShopCompany {
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
    logo_url?: string;
    home_hero_image_url?: string;
    hero_about_url?: string;
    about_image_1_url?: string;
    about_image_2_url?: string;
    about_image_3_url?: string;
    // Text content fields
    about_us_text?: string;       // About text for home page
    our_story_text?: string;      // Full story for About page
    hero_overlay_text?: string;   // Hero overlay text for About page
    is_active: boolean;
    company_type_id: number;
}

export interface ShopCategory {
    id: number;
    name: string;
    slug: string;
    description?: string;
    position: number;
}

export interface ShopService {
    id: number;
    category_id: number;
    name: string;
    description?: string;
    price_cents: number;
    duration_minutes: number;
    position: number;
}

export interface ShopStaff {
    id: number;
    display_name: string;
    bio?: string;
    image_url?: string;
    is_bookable: boolean;
    services?: number[]; // IDs of services this staff member can perform
}

export interface ShopHours {
    id: number;
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    open_time?: string;  // "09:00"
    close_time?: string; // "18:00"
    is_closed: boolean;
}

export interface ShopTheme {
    brand_color: string;
    page_background_color: string;
    page_background_preset: 'light' | 'soft' | 'dark' | 'auto';
    cards_elevated: boolean;
    corner_radius: 'sm' | 'md' | 'lg';
}

export interface ShopSettings {
    allow_qr_payment: boolean;
    qr_image_url?: string | null;
    allow_cash_payment: boolean;
}

export interface ShopReviewStats {
    average: number;
    count: number;
}

export interface ShopData {
    company: ShopCompany;
    categories: ShopCategory[];
    services: ShopService[];
    staff: ShopStaff[];
    hours: ShopHours[];
    settings: ShopSettings;
    theme: ShopTheme;
    reviewStats: ShopReviewStats;
}
