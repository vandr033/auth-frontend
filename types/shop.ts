// Types for the shop public page data (from GET /api/company/:slug)
import type { CompanyCapabilities } from "@/lib/plans/capabilities";
import type { EffectiveCompanyProduct, ProductCapability, ProductTierCode } from "@/types/product-access";

export type HeroVariant = 'hero-cinematic' | 'hero-split' | 'hero-minimal';
export type ServicesVariant = 'services-grid' | 'services-list';
export type TeamVariant = 'team-cards' | 'team-spotlight';
export type FontPairing = 'classic' | 'modern' | 'bold' | 'refined' | 'friendly';

export type CTADestination = 'booking' | 'services' | 'store' | 'free-events' | 'events' | 'classes';

export interface HomeCTAButton {
    destination: CTADestination;
    label: string;
    color: string;    // hex e.g. "#ffffff"
    opacity: number;  // 0-100
    enabled: boolean;
    order: number;
}

export interface SocialLinks {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    x_twitter?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
}

export interface ShopCompany {
    id: number;
    slug: string;
    name: string;
    plan?: 'STARTER' | 'BUSINESS' | 'PRO' | string;
    capabilities?: CompanyCapabilities | null;
    entitlements?: ShopPublicEntitlements | null;
    public_features?: ShopPublicFeatureVisibility | null;
    availableUntil: string;
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
    currency?: string;
    logo_url?: string;
    home_hero_image_url?: string;
    about_hero_image_url?: string;
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

export interface ShopPublicFeatureVisibility {
    storefrontEnabled: boolean;
    companyInfoVisible: boolean;
    contactVisible: boolean;
    servicesVisible: boolean;
    bookingsEnabled: boolean;
    commerceVisible: boolean;
    commercePromotionsVisible: boolean;
    commerceCombosVisible: boolean;
    eventsVisible: boolean;
    eventRegistrationEnabled: boolean;
    eventAdvancedEnabled: boolean;
    eventWaitlistEnabled: boolean;
    eventTicketsEnabled: boolean;
    classesVisible: boolean;
    classEnrollmentEnabled: boolean;
    classAdvancedEnabled: boolean;
    classPaymentPlansEnabled: boolean;
    classAttendanceEnabled: boolean;
    personalizationPlusEnabled: boolean;
    customCtasVisible: boolean;
    announcementBannersVisible: boolean;
    advancedSectionsVisible: boolean;
    footerCustomizationVisible: boolean;
    marketplaceListed: boolean;
}

export interface ShopPublicEntitlements {
    source?: "legacy_plan" | "modular";
    currentPlan: "STARTER" | "BUSINESS" | "PRO" | string;
    activeProducts: ProductTierCode[];
    activeAddOns: ProductTierCode[];
    capabilities: Partial<Record<ProductCapability, boolean>>;
    products: EffectiveCompanyProduct[];
    publicFeatures: ShopPublicFeatureVisibility;
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
    category?: {
        id: number;
        name: string;
    } | null;
    name: string;
    description?: string;
    price_cents: number;
    promo_price_cents?: number | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
    promo_label?: string | null;
    duration_minutes: number;
    is_multi_session?: boolean;
    session_count?: number | null;
    session_duration_minutes?: number | null;
    position: number;
    is_invite_only?: boolean;
    pricing?: {
        regular_price_cents?: number | null;
        base_price_cents: number;
        final_price_cents: number;
        promo_applied: boolean;
        promo_label?: string | null;
        promo_starts_at?: string | null;
        promo_ends_at?: string | null;
    };
    required_resource_ids?: number[]; // StaffProfile IDs required to be booked with this service
}

export interface ShopStaff {
    id: number;
    display_name: string;
    bio?: string;
    image_url?: string;
    is_bookable: boolean;
    resource_type?: 'PERSON' | 'ROOM' | 'EQUIPMENT';
    services?: number[]; // IDs of services this staff member can perform
}

export interface ShopHours {
    id: number;
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    open_time?: string;  // "09:00"
    close_time?: string; // "18:00"
    is_closed: boolean;
}

export type HomeSectionKey = 'about' | 'services' | 'products' | 'promotions' | 'combos' | 'events' | 'classes' | 'team';
export const DEFAULT_SECTION_ORDER: HomeSectionKey[] = ['about', 'services', 'products', 'promotions', 'combos', 'events', 'classes', 'team'];

export interface AnnouncementBanner {
    id: string;           // stable UUID used as localStorage dismissal key
    message: string;
    link_url?: string | null;
    link_label?: string | null;
    background_color: string;
    text_color: string;
    enabled: boolean;
    sticky?: boolean;
    starts_at?: string | null;  // ISO date string
    ends_at?: string | null;    // ISO date string
    expires_at?: string | null; // Legacy end date alias
}

export interface FooterConfig {
    tagline?: string | null;
    show_address: boolean;
    show_phone: boolean;
    show_email: boolean;
    nav_links: { key: string; enabled: boolean }[];
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
    tagline: null,
    show_address: true,
    show_phone: true,
    show_email: true,
    nav_links: [
        { key: 'home', enabled: true },
        { key: 'services', enabled: true },
        { key: 'store', enabled: true },
        { key: 'events', enabled: true },
        { key: 'classes', enabled: true },
        { key: 'about', enabled: true },
        { key: 'book', enabled: true },
    ],
};

export interface ShopCommerceStore {
    id: string;
    company_id: number;
    is_active: boolean;
    fulfillment_mode: 'PICKUP_ONLY' | 'DELIVERY_ONLY' | 'PICKUP_AND_DELIVERY';
    scheduled_orders_enabled: boolean;
    min_preparation_minutes?: number | null;
    max_schedule_days_ahead?: number | null;
    order_slots_enabled: boolean;
    allow_cash_payment: boolean;
    allow_qr_payment: boolean;
    allow_manual_payment: boolean;
    qr_image_url?: string | null;
    payment_instructions?: string | null;
    payment_proof_required: boolean;
    payment_review_required: boolean;
    delivery_cost_mode: 'MANUAL' | 'FIXED';
    fixed_delivery_cost?: number | null;
    delivery_instructions?: string | null;
    order_schedule_slots?: ShopCommerceOrderScheduleSlot[];
}

export interface ShopCommerceOrderScheduleSlot {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    sort_order: number;
}

export interface ShopCommercePointOfSale {
    id: string;
    name: string;
    address: string;
    opening_time: string;
    closing_time: string;
    latitude: number;
    longitude: number;
    google_maps_url: string;
    notes?: string | null;
    is_active: boolean;
    sort_order: number;
}

export interface ShopCommerceCategory {
    id: string;
    store_id?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    image_url?: string | null;
    is_active: boolean;
    sort_order: number;
}

export interface ShopCommerceProductImage {
    id: string;
    image_url: string;
    alt_text?: string | null;
    sort_order: number;
    is_primary: boolean;
}

export interface ShopCommerceComboItem {
    id: string;
    component_product_id: string;
    quantity: number;
    component_product?: {
        id: string;
        name: string;
        price?: number | null;
        regular_price?: number | null;
        promo_price?: number | null;
        track_stock?: boolean;
        stock_quantity?: number;
        allow_out_of_stock_orders?: boolean;
    } | null;
}

export interface ShopCommerceProductPricing {
    regular_price?: number | null;
    base_price: number;
    final_price: number;
    promo_applied: boolean;
    promo_label?: string | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
}

export interface ShopCommerceProduct {
    id: string;
    store_id?: string | null;
    category_id?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    product_type: 'SIMPLE' | 'COMBO';
    price: number;
    regular_price?: number | null;
    promo_price?: number | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
    promo_label?: string | null;
    is_active: boolean;
    is_featured: boolean;
    track_stock: boolean;
    stock_quantity: number;
    low_stock_threshold?: number | null;
    allow_out_of_stock_orders: boolean;
    available_for_pickup: boolean;
    available_for_delivery: boolean;
    sort_order: number;
    category?: ShopCommerceCategory | null;
    images: ShopCommerceProductImage[];
    combo_items: ShopCommerceComboItem[];
    combo_available_units?: number | null;
    pricing?: ShopCommerceProductPricing | null;
}

export interface ShopTheme {
    brand_color: string;
    page_background_color: string;
    page_background_preset: 'light' | 'soft' | 'dark' | 'auto';
    cards_elevated: boolean;
    corner_radius: 'sm' | 'md' | 'lg';
    font_pairing: FontPairing;
    hero_variant: HeroVariant;
    services_variant: ServicesVariant;
    team_variant: TeamVariant;
    home_cta_buttons?: HomeCTAButton[] | null;
    home_section_order?: HomeSectionKey[] | null;
    footer_config?: FooterConfig | null;
    announcement_banners?: AnnouncementBanner[] | null;
}

export interface ShopSettings {
    allow_qr_payment: boolean;
    qr_image_url?: string | null;
    allow_cash_payment: boolean;
    require_comprobante_for_qr?: boolean;
    auto_confirm_bookings?: boolean;
    booking_time_view_default?: "hour" | "all";
    social_links: SocialLinks;
    default_language?: string;
    max_advance_booking_days?: number | null;
    min_advance_booking_minutes?: number | null;
    custom_tos?: string | null;
    staff_label?: string;
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
    commerceStore?: ShopCommerceStore | null;
    commercePointsOfSale?: ShopCommercePointOfSale[];
    commerceCategories?: ShopCommerceCategory[];
    commerceProducts?: ShopCommerceProduct[];
    settings: ShopSettings;
    theme: ShopTheme;
    reviewStats: ShopReviewStats;
}
