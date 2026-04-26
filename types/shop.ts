// Types for the shop public page data (from GET /api/company/:slug)
import type { CompanyCapabilities } from "@/lib/plans/capabilities";

export type HeroVariant = 'hero-cinematic' | 'hero-split' | 'hero-minimal';
export type ServicesVariant = 'services-grid' | 'services-list';
export type TeamVariant = 'team-cards' | 'team-spotlight';
export type FontPairing = 'classic' | 'modern' | 'bold' | 'refined' | 'friendly';

export type CTADestination = 'booking' | 'services' | 'free-events' | 'events' | 'classes';

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

export type HomeSectionKey = 'about' | 'services' | 'events' | 'classes' | 'team';
export const DEFAULT_SECTION_ORDER: HomeSectionKey[] = ['about', 'services', 'events', 'classes', 'team'];

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
        { key: 'events', enabled: true },
        { key: 'classes', enabled: true },
        { key: 'about', enabled: true },
        { key: 'book', enabled: true },
    ],
};

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
    settings: ShopSettings;
    theme: ShopTheme;
    reviewStats: ShopReviewStats;
}
