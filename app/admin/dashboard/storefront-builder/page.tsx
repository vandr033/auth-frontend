"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Building2,
    ChevronDown,
    ChevronUp,
    Eye,
    GalleryHorizontal,
    GripVertical,
    Image as ImageIcon,
    LayoutTemplate,
    Loader2,
    Megaphone,
    MousePointerClick,
    Palette,
    PanelBottom,
    Save,
    Store,
    Trash2,
    Type,
    Users,
} from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/shared";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { SocialLinksForm } from "@/components/admin/settings/SocialLinksForm";
import { FontPairingSelector } from "@/components/admin/theme/FontPairingSelector";
import {
    OutcomeHint,
    StylePresetGrid,
    type StorefrontStylePreset,
} from "@/components/admin/theme/ThemeEditorUX";
import { VariantSelector } from "@/components/admin/theme/VariantSelector";
import { getActiveAnnouncementBanner, getBannerEndAt } from "@/components/shop/AnnouncementBanner";
import { HeroCinematic } from "@/components/shop/heroes/HeroCinematic";
import { HeroMinimal } from "@/components/shop/heroes/HeroMinimal";
import { HeroSplit } from "@/components/shop/heroes/HeroSplit";
import { QuickInfoBar } from "@/components/shop/QuickInfoBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { mainSiteThemeConfig } from "@/theme/mainSiteTheme";
import type {
    AnnouncementBanner,
    CTADestination,
    FooterConfig,
    HomeCTAButton,
    HomeSectionKey,
    SocialLinks,
    ShopData,
    ShopService,
} from "@/types/shop";
import { DEFAULT_FOOTER_CONFIG, DEFAULT_SECTION_ORDER } from "@/types/shop";
import { getImageUrl } from "@/utils/image-url";
import { computeTheme, fontPairingMap, type PageBackgroundPreset, type ThemeConfig } from "@/utils/themepicker";
import { normalizeShopData, type ShopApiResponse } from "@/app/shop/lib/shopData";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface ExtendedThemeConfig extends ThemeConfig {
    heroVariant: string;
    servicesVariant: string;
    teamVariant: string;
    fontPairing: string;
    homeCTAButtons: HomeCTAButton[];
    homeSectionOrder: HomeSectionKey[];
    footerConfig: FooterConfig;
    announcementBanners: AnnouncementBanner[];
}

interface StaffMember {
    id: number;
    display_name: string;
    role: string;
    bio?: string;
    image_url?: string;
}

interface CompanyContent {
    logo_url?: string;
    hero_home_url?: string;
    hero_about_url?: string;
    about_us_text?: string;
    hero_overlay_text?: string;
    our_story_text?: string;
    about_image_1_url?: string;
    about_image_2_url?: string;
    about_image_3_url?: string;
}

interface CompanySettings {
    name: string;
    slug: string;
    email: string;
    phone_prefix: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country_code: string;
    timezone: string;
    currency: string;
    google_maps_url: string;
    latitude: string;
    longitude: string;
    is_active: boolean;
    booking_buffer_minutes: number;
    booking_time_granularity_minutes: number;
    cancel_limit_minutes: number;
    reschedule_limit_minutes: number;
    auto_approve_staff_time_off: boolean;
    max_advance_booking_days: number | null;
    min_advance_booking_minutes: number | null;
    allow_qr_payment: boolean;
    qr_image_url: string | null;
    allow_cash_payment: boolean;
    require_comprobante_for_qr: boolean;
    auto_confirm_bookings: boolean;
    send_email_notifications: boolean;
    send_whatsapp_notifications: boolean;
    social_links: SocialLinks;
    default_language: string;
    custom_tos: string;
    staff_label: string;
}

const DEFAULT_CTA_BUTTONS: HomeCTAButton[] = [
    // Product terminology decision pending: these persisted theme defaults are Spanish until CTA defaults become locale-aware.
    { destination: "booking", label: "Reservar Ahora", color: "#ffffff", opacity: 100, enabled: true, order: 0 },
    { destination: "services", label: "Servicios", color: "#ffffff", opacity: 20, enabled: true, order: 1 },
    { destination: "free-events", label: "Eventos Gratuitos", color: "#ffffff", opacity: 20, enabled: false, order: 2 },
    { destination: "events", label: "Eventos", color: "#ffffff", opacity: 20, enabled: false, order: 3 },
    { destination: "classes", label: "Clases", color: "#ffffff", opacity: 20, enabled: false, order: 4 },
];

const defaultThemeConfig: ExtendedThemeConfig = {
    ...mainSiteThemeConfig,
    heroVariant: "hero-cinematic",
    servicesVariant: "services-grid",
    teamVariant: "team-cards",
    fontPairing: "classic",
    homeCTAButtons: DEFAULT_CTA_BUTTONS,
    homeSectionOrder: DEFAULT_SECTION_ORDER,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    announcementBanners: [],
};

const initialSettings: CompanySettings = {
    name: "",
    slug: "",
    email: "",
    phone_prefix: "591",
    phone: "",
    address: "",
    city: "",
    state: "",
    country_code: "BO",
    timezone: "America/La_Paz",
    currency: "Bs.",
    google_maps_url: "",
    latitude: "",
    longitude: "",
    is_active: true,
    booking_buffer_minutes: 10,
    booking_time_granularity_minutes: 30,
    cancel_limit_minutes: 120,
    reschedule_limit_minutes: 120,
    auto_approve_staff_time_off: false,
    max_advance_booking_days: null,
    min_advance_booking_minutes: null,
    allow_qr_payment: true,
    qr_image_url: null,
    allow_cash_payment: true,
    require_comprobante_for_qr: true,
    auto_confirm_bookings: true,
    send_email_notifications: true,
    send_whatsapp_notifications: false,
    social_links: {},
    default_language: "es",
    custom_tos: "",
    // Product terminology decision pending: staff_label is persisted as a merchant-customizable resource label.
    staff_label: "Equipo",
};

export default function StorefrontBuilderPage() {
    const { companyId, companyUser, isAuthenticated, loading: authLoading, user } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canCTACustomize = canUsePlanFeature(plan, "HOME_CTA_CUSTOMIZATION");
    const canSectionOrder = canUsePlanFeature(plan, "HOME_SECTION_ORDER");
    const canFooterCustomize = canUsePlanFeature(plan, "FOOTER_CUSTOMIZATION");
    const canBanners = canUsePlanFeature(plan, "ANNOUNCEMENT_BANNERS");
    const canCustomizeBookingFlow = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "BOOKING_FLOW_CUSTOMIZATION");
    const canUseNotifications = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "TRANSACTIONAL_BOOKING_NOTIFICATIONS");

    const [themeConfig, setThemeConfig] = useState<ExtendedThemeConfig>(defaultThemeConfig);
    const [content, setContent] = useState<CompanyContent>({});
    const [settings, setSettings] = useState<CompanySettings>(initialSettings);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [previewData, setPreviewData] = useState<ShopData | null>(null);
    const [aboutUsText, setAboutUsText] = useState("");
    const [heroOverlayText, setHeroOverlayText] = useState("");
    const [ourStoryText, setOurStoryText] = useState("");
    const [pendingImages, setPendingImages] = useState<Record<string, File>>({});
    const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const storefrontHref = useMemo(() => {
        const slug = settings.slug || companyUser?.company?.slug;
        return slug ? `/shop/${slug}` : "/admin/dashboard/settings";
    }, [companyUser?.company?.slug, settings.slug]);

    const activeBannerCount = themeConfig.announcementBanners.filter((banner) => getBannerStatus(banner) === "active").length;
    const enabledCTAButtons = themeConfig.homeCTAButtons.filter((button) => button.enabled).length;
    const mediaCount = [
        content.logo_url,
        content.hero_home_url,
        content.hero_about_url,
        content.about_image_1_url,
        content.about_image_2_url,
        content.about_image_3_url,
        ...staff.map((member) => member.image_url),
    ].filter(Boolean).length;

    const normalizeAnnouncementBanner = (banner: AnnouncementBanner): AnnouncementBanner => ({
        ...banner,
        sticky: banner.sticky === true,
        starts_at: banner.starts_at ?? null,
        ends_at: banner.ends_at ?? banner.expires_at ?? null,
        expires_at: banner.expires_at ?? banner.ends_at ?? null,
    });

    const fetchBuilderData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const [themeRes, contentRes, staffRes, companyRes, settingsRes] = await Promise.all([
                fetch(getApiUrl("/admin/theme"), {
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/staff?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/company/id/${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl("/api/admin/settings"), {
                    credentials: "include",
                }),
            ]);

            if (themeRes.ok) {
                const json = await themeRes.json();
                if (json.data) {
                    setThemeConfig((prev) => ({
                        ...prev,
                        brandColor: json.data.brand_color,
                        pageBackgroundColor: json.data.page_background_color,
                        pageBackgroundPreset: json.data.page_background_preset,
                        cardsElevated: json.data.cards_elevated,
                        cornerRadius: json.data.corner_radius,
                        fontPreset: json.data.font_preset || "modern",
                        heroVariant: json.data.hero_variant || "hero-cinematic",
                        servicesVariant: json.data.services_variant || "services-grid",
                        teamVariant: json.data.team_variant || "team-cards",
                        fontPairing: json.data.font_pairing || "classic",
                        homeCTAButtons: json.data.home_cta_buttons ?? DEFAULT_CTA_BUTTONS,
                        homeSectionOrder: json.data.home_section_order ?? DEFAULT_SECTION_ORDER,
                        footerConfig: json.data.footer_config ?? DEFAULT_FOOTER_CONFIG,
                        announcementBanners: Array.isArray(json.data.announcement_banners)
                            ? json.data.announcement_banners.map(normalizeAnnouncementBanner)
                            : [],
                    }));
                }
            } else if (themeRes.status !== 404) {
                console.error("Failed to fetch theme:", themeRes.statusText);
            }

            if (contentRes.ok) {
                const contentData = await contentRes.json();
                const data = contentData.data || contentData;
                const images = data.images || {};
                const texts = data.texts || {};
                const flatContent: CompanyContent = {
                    ...data,
                    ...images,
                    ...texts,
                    hero_overlay_text: texts.about_us_hero_text || data.hero_overlay_text,
                    about_us_text: texts.about_us_text || data.about_us_text,
                    our_story_text: texts.our_story_text || data.our_story_text,
                    hero_home_url: images.home_hero_image_url || data.hero_home_url,
                    hero_about_url: images.about_hero_image_url || data.hero_about_url,
                    logo_url: images.logo_url || data.logo_url,
                    about_image_1_url: images.about_image_1_url || data.about_image_1_url,
                    about_image_2_url: images.about_image_2_url || data.about_image_2_url,
                    about_image_3_url: images.about_image_3_url || data.about_image_3_url,
                };

                setContent(flatContent);
                setAboutUsText(flatContent.about_us_text || "");
                setHeroOverlayText(flatContent.hero_overlay_text || "");
                setOurStoryText(flatContent.our_story_text || "");
            }

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                setStaff(staffData.data || staffData || []);
            }

            const companyData = companyRes.ok ? await companyRes.json() : {};
            const settingsData = settingsRes.ok ? await settingsRes.json() : {};
            const company = companyData.data || companyData || {};
            const config = settingsData.data || settingsData || {};

            setSettings((prev) => ({
                ...prev,
                name: company.name || prev.name,
                slug: company.slug || prev.slug,
                email: company.email || prev.email,
                phone_prefix: company.phone_prefix || prev.phone_prefix,
                phone: company.phone || prev.phone,
                address: company.address || prev.address,
                city: company.city || prev.city,
                state: company.state || prev.state,
                country_code: company.country_code || prev.country_code,
                timezone: company.timezone || prev.timezone,
                currency: company.currency || prev.currency,
                google_maps_url: company.google_maps_url || prev.google_maps_url,
                latitude: company.latitude?.toString() || prev.latitude,
                longitude: company.longitude?.toString() || prev.longitude,
                is_active: company.is_active ?? prev.is_active,
                booking_buffer_minutes: config.booking_buffer_minutes ?? prev.booking_buffer_minutes,
                booking_time_granularity_minutes: config.booking_time_granularity_minutes ?? prev.booking_time_granularity_minutes,
                cancel_limit_minutes: config.cancel_limit_minutes ?? prev.cancel_limit_minutes,
                reschedule_limit_minutes: config.reschedule_limit_minutes ?? prev.reschedule_limit_minutes,
                auto_approve_staff_time_off: config.auto_approve_staff_time_off ?? prev.auto_approve_staff_time_off,
                max_advance_booking_days: config.max_advance_booking_days ?? prev.max_advance_booking_days,
                min_advance_booking_minutes: config.min_advance_booking_minutes ?? prev.min_advance_booking_minutes,
                allow_qr_payment: config.allow_qr_payment ?? prev.allow_qr_payment,
                qr_image_url: config.qr_image_url ?? prev.qr_image_url,
                allow_cash_payment: config.allow_cash_payment ?? prev.allow_cash_payment,
                require_comprobante_for_qr: config.require_comprobante_for_qr ?? prev.require_comprobante_for_qr,
                auto_confirm_bookings: config.auto_confirm_bookings ?? prev.auto_confirm_bookings,
                send_email_notifications: config.send_email_notifications ?? prev.send_email_notifications,
                send_whatsapp_notifications: config.send_whatsapp_notifications ?? prev.send_whatsapp_notifications,
                social_links: config.social_links ?? prev.social_links,
                default_language: config.default_language ?? prev.default_language,
                custom_tos: config.custom_tos ?? prev.custom_tos,
                staff_label: config.staff_label ?? prev.staff_label,
            }));

            if (company.slug) {
                const publicRes = await fetch(getApiUrl(`/api/company/${company.slug}`), {
                    credentials: "include",
                });
                if (publicRes.ok) {
                    const publicJson = (await publicRes.json()) as ShopApiResponse;
                    if (publicJson.data) {
                        setPreviewData(normalizeShopData(publicJson.data));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load storefront builder:", err);
            void notify.error(t("storefrontBuilder.loadError"));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchBuilderData();
        }
    }, [isAuthenticated, companyId, fetchBuilderData]);

    const updateThemeConfig = <K extends keyof ExtendedThemeConfig>(key: K, value: ExtendedThemeConfig[K]) => {
        setThemeConfig((prev) => ({ ...prev, [key]: value }));
    };

    const applyStylePreset = (preset: StorefrontStylePreset) => {
        setThemeConfig((prev) => ({
            ...prev,
            brandColor: preset.brandColor,
            pageBackgroundColor: preset.pageBackgroundColor,
            pageBackgroundPreset: preset.pageBackgroundPreset,
            cardsElevated: preset.cardsElevated,
            cornerRadius: preset.cornerRadius,
            fontPairing: preset.fontPairing,
            heroVariant: preset.heroVariant,
            servicesVariant: preset.servicesVariant,
            teamVariant: preset.teamVariant,
        }));
    };

    const updateCTAButton = (index: number, field: keyof HomeCTAButton, value: unknown) => {
        setThemeConfig((prev) => {
            const updated = [...prev.homeCTAButtons];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, homeCTAButtons: updated };
        });
    };

    const moveCTAButton = (index: number, direction: -1 | 1) => {
        setThemeConfig((prev) => {
            const updated = [...prev.homeCTAButtons];
            const target = index + direction;
            if (target < 0 || target >= updated.length) return prev;
            [updated[index], updated[target]] = [updated[target], updated[index]];
            return {
                ...prev,
                homeCTAButtons: updated.map((button, order) => ({ ...button, order })),
            };
        });
    };

    const getDestinationLabel = (destination: CTADestination): string => {
        const map: Record<CTADestination, string> = {
            booking: t("adminTheme.ctaDestinationBooking"),
            services: t("adminTheme.ctaDestinationServices"),
            "free-events": t("adminTheme.ctaDestinationFreeEvents"),
            events: t("adminTheme.ctaDestinationEvents"),
            classes: t("adminTheme.ctaDestinationClasses"),
        };
        return map[destination];
    };

    const updateSettings = (field: keyof CompanySettings, value: string | boolean | number | null | SocialLinks) => {
        setSettings((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "google_maps_url" && typeof value === "string") {
                let url = value;
                if (value.includes("<iframe")) {
                    const srcMatch = value.match(/src="([^"]+)"/);
                    if (srcMatch && srcMatch[1]) {
                        url = srcMatch[1];
                        next.google_maps_url = url;
                    }
                }

                const longMatch = url.match(/!2d(-?\d+\.?\d*)/);
                const latMatch = url.match(/!3d(-?\d+\.?\d*)/);

                if (longMatch && longMatch[1]) next.longitude = longMatch[1];
                if (latMatch && latMatch[1]) next.latitude = latMatch[1];
            }

            return next;
        });
    };

    const handleImageSelect = (field: keyof CompanyContent) => (file: File) => {
        const objectUrl = URL.createObjectURL(file);
        setPendingImages((prev) => ({ ...prev, [field]: file }));
        setLocalPreviews((prev) => ({ ...prev, [field]: objectUrl }));
    };

    const handleStaffImageSelect = (staffId: number) => (file: File) => {
        const key = `staff_${staffId}`;
        const objectUrl = URL.createObjectURL(file);
        setPendingImages((prev) => ({ ...prev, [key]: file }));
        setLocalPreviews((prev) => ({ ...prev, [key]: objectUrl }));
    };

    const getDisplayUrl = (field: keyof CompanyContent) => localPreviews[field] || content[field];
    const getStaffDisplayUrl = (member: StaffMember) => localPreviews[`staff_${member.id}`] || member.image_url;

    const handleImageDelete = async (field: keyof CompanyContent) => {
        if (!companyId) return;
        const backendFieldMap: Partial<Record<keyof CompanyContent, string>> = {
            hero_home_url: "home_hero_image_url",
            hero_about_url: "about_hero_image_url",
        };
        const backendField = backendFieldMap[field] ?? field;

        try {
            const response = await fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ [backendField]: null }),
            });

            if (!response.ok) throw new Error(t("adminPages.failedToDelete"));

            setContent((prev) => ({ ...prev, [field]: undefined }));
            await notify.success(t("adminPages.imageRemoved"));
        } catch {
            await notify.error(t("adminPages.failedToDelete"));
        }
    };

    const saveTheme = async () => {
        const payload = {
            brand_color: themeConfig.brandColor,
            page_background_color: themeConfig.pageBackgroundColor,
            page_background_preset: themeConfig.pageBackgroundPreset,
            cards_elevated: themeConfig.cardsElevated,
            corner_radius: themeConfig.cornerRadius,
            font_preset: themeConfig.fontPreset,
            hero_variant: themeConfig.heroVariant,
            services_variant: themeConfig.servicesVariant,
            team_variant: themeConfig.teamVariant,
            font_pairing: themeConfig.fontPairing,
            ...(canCTACustomize && { home_cta_buttons: themeConfig.homeCTAButtons }),
            ...(canSectionOrder && { home_section_order: themeConfig.homeSectionOrder }),
            ...(canFooterCustomize && { footer_config: themeConfig.footerConfig }),
            ...(canBanners && { announcement_banners: themeConfig.announcementBanners }),
        };

        const response = await fetch(getApiUrl("/admin/theme"), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || t("adminTheme.updateError"));
        }
    };

    const saveContent = async () => {
        if (!companyId) return;

        const uploadedUrls: Record<string, string> = {};
        const staffUpdates: Record<number, string> = {};

        for (const [key, file] of Object.entries(pendingImages)) {
            if (key.startsWith("staff_")) continue;

            let type = key.replace("_url", "");
            if (type.startsWith("about_image_")) {
                type = type.replace("about_image_", "about_");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("company_id", companyId.toString());
            formData.append("type", type);

            const response = await fetch(getApiUrl("/api/admin/uploads/image"), {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) throw new Error(`Failed to upload ${key}`);
            const data = await response.json();
            uploadedUrls[key] = data.url || data.data?.url;
        }

        for (const [key, file] of Object.entries(pendingImages)) {
            if (!key.startsWith("staff_")) continue;

            const staffId = Number.parseInt(key.split("_")[1], 10);
            const formData = new FormData();
            formData.append("file", file);
            formData.append("company_id", companyId.toString());
            formData.append("type", "staff");
            formData.append("entity_id", staffId.toString());

            const response = await fetch(getApiUrl("/api/admin/uploads/image"), {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) throw new Error(`Failed to upload ${key}`);
            const data = await response.json();
            staffUpdates[staffId] = data.url || data.data?.url;
        }

        const contentUpdates: Partial<CompanyContent> = {
            about_us_text: aboutUsText,
            hero_overlay_text: heroOverlayText,
            our_story_text: ourStoryText,
            ...uploadedUrls,
        };

        const contentResponse = await fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                about_us_text: aboutUsText,
                about_us_hero_text: heroOverlayText,
                our_story_text: ourStoryText,
            }),
        });

        if (!contentResponse.ok) throw new Error(t("adminPages.failedToSave"));

        setContent((prev) => ({ ...prev, ...contentUpdates }));
        if (Object.keys(staffUpdates).length > 0) {
            setStaff((prev) => prev.map((member) => (
                staffUpdates[member.id] ? { ...member, image_url: staffUpdates[member.id] } : member
            )));
        }
        setPendingImages({});
        setLocalPreviews({});
    };

    const saveBusinessInfo = async () => {
        if (!companyId) return;

        const normalizedCurrency = settings.currency.trim();
        if (!normalizedCurrency || normalizedCurrency.length > 3) {
            throw new Error(t("adminSettings.currencyInvalid"));
        }

        const payloadCompany = {
            name: settings.name,
            slug: settings.slug,
            email: settings.email,
            phone: settings.phone,
            phone_prefix: settings.phone_prefix,
            address: settings.address,
            city: settings.city,
            state: settings.state,
            country_code: settings.country_code,
            timezone: settings.timezone,
            currency: normalizedCurrency,
            google_maps_url: settings.google_maps_url,
            latitude: settings.latitude ? Number.parseFloat(settings.latitude) : null,
            longitude: settings.longitude ? Number.parseFloat(settings.longitude) : null,
            is_active: settings.is_active,
        };

        const payloadSettings = {
            booking_buffer_minutes: Number(settings.booking_buffer_minutes),
            booking_time_granularity_minutes: Number(settings.booking_time_granularity_minutes),
            cancel_limit_minutes: Number(settings.cancel_limit_minutes),
            reschedule_limit_minutes: Number(settings.reschedule_limit_minutes),
            auto_approve_staff_time_off: settings.auto_approve_staff_time_off,
            max_advance_booking_days: settings.max_advance_booking_days,
            min_advance_booking_minutes: settings.min_advance_booking_minutes,
            allow_qr_payment: settings.allow_qr_payment,
            qr_image_url: settings.qr_image_url,
            allow_cash_payment: settings.allow_cash_payment,
            require_comprobante_for_qr: settings.require_comprobante_for_qr,
            auto_confirm_bookings: settings.auto_confirm_bookings,
            send_email_notifications: settings.send_email_notifications,
            send_whatsapp_notifications: settings.send_whatsapp_notifications,
            social_links: settings.social_links,
            default_language: settings.default_language,
            custom_tos: settings.custom_tos || "",
            staff_label: settings.staff_label || t("adminSettings.staffLabelPlaceholder"),
        };

        const [companyRes, settingsRes] = await Promise.all([
            fetch(getApiUrl(`/api/company/id/${companyId}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payloadCompany),
            }),
            fetch(getApiUrl("/api/admin/settings"), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payloadSettings),
            }),
        ]);

        if (!companyRes.ok) {
            const errorData = await companyRes.json().catch(() => ({}));
            throw new Error(errorData.message || t("adminSettings.saveSettingsFailed"));
        }
        if (!settingsRes.ok) {
            const errorData = await settingsRes.json().catch(() => ({}));
            throw new Error(errorData.message || t("adminSettings.saveConfigFailed"));
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Migration note: v1 keeps the existing Theme, Pages, and Settings
            // persistence contracts separate while presenting them as one IA area.
            await saveTheme();
            await saveContent();
            await saveBusinessInfo();
            await notify.success(t("storefrontBuilder.savedTitle"), t("storefrontBuilder.savedMessage"));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("storefrontBuilder.saveError"));
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-2 bg-page">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
                <p className="text-sm text-text-muted">{t("storefrontBuilder.loading")}</p>
            </div>
        );
    }

    return (
        <AdminPageShell className="max-w-[1600px] pb-24 md:pb-0">
            <AdminPageHeader
                eyebrow={t("storefrontBuilder.eyebrow")}
                title={t("storefrontBuilder.title")}
                subtitle={t("storefrontBuilder.subtitle")}
                actions={(
                    <Link href={storefrontHref} target="_blank">
                        <Button variant="outline" className="gap-2">
                            <Eye className="h-4 w-4" />
                            {t("storefrontBuilder.previewCta")}
                        </Button>
                    </Link>
                )}
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <BuilderMetric
                    icon={<Store className="h-5 w-5" />}
                    label={t("storefrontBuilder.publicUrl")}
                    value={`/shop/${settings.slug || "..."}`}
                    hint={settings.is_active ? t("storefrontBuilder.visible") : t("storefrontBuilder.hidden")}
                />
                <BuilderMetric
                    icon={<Palette className="h-5 w-5" />}
                    label={t("adminTheme.appearance")}
                    value={themeConfig.fontPairing}
                    hint={themeConfig.heroVariant}
                />
                <BuilderMetric
                    icon={<MousePointerClick className="h-5 w-5" />}
                    label={t("adminTheme.ctaButtons")}
                    value={enabledCTAButtons}
                    hint={t("adminTheme.sectionOrder")}
                />
                <BuilderMetric
                    icon={<GalleryHorizontal className="h-5 w-5" />}
                    label={t("storefrontBuilder.media")}
                    value={mediaCount}
                    hint={`${t("storefrontBuilder.mediaAssets")} · ${activeBannerCount} ${t("adminTheme.announcementBanners")}`}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <Tabs defaultValue="content" className="min-w-0 space-y-4">
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardContent className="p-2">
                            <TabsList className="h-auto w-full justify-start overflow-x-auto bg-transparent shadow-none">
                                <TabsTrigger value="content" className="flex-none">{t("storefrontBuilder.content")}</TabsTrigger>
                                <TabsTrigger value="appearance" className="flex-none">{t("adminTheme.visualStyle")}</TabsTrigger>
                                <TabsTrigger value="actions" className="flex-none">{t("adminTheme.buttonsCtas")}</TabsTrigger>
                                <TabsTrigger value="sections" className="flex-none">{t("storefrontBuilder.sections")}</TabsTrigger>
                                <TabsTrigger value="media" className="flex-none">{t("storefrontBuilder.media")}</TabsTrigger>
                                <TabsTrigger value="business" className="flex-none">{t("storefrontBuilder.businessInfo")}</TabsTrigger>
                                <TabsTrigger value="advanced" className="flex-none">{t("adminTheme.advancedOptions")}</TabsTrigger>
                            </TabsList>
                        </CardContent>
                    </Card>

                    <TabsContent value="content" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Store className="h-5 w-5 text-admin-brand" />
                                    {t("storefrontBuilder.pageCopy")}
                                </CardTitle>
                                <CardDescription>{t("storefrontBuilder.pageCopyDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <TextAreaField
                                    id="about-us"
                                    label={t("adminPages.aboutUsText")}
                                    value={aboutUsText}
                                    onChange={setAboutUsText}
                                    placeholder={t("adminPages.aboutUsPlaceholder")}
                                    helper={t("adminPages.aboutUsHelpText")}
                                    rows={5}
                                />
                                <TextAreaField
                                    id="about-hero-overlay"
                                    label={t("adminPages.overlayText")}
                                    value={heroOverlayText}
                                    onChange={setHeroOverlayText}
                                    placeholder={t("adminPages.overlayPlaceholder")}
                                    rows={3}
                                />
                                <TextAreaField
                                    id="our-story"
                                    label={t("adminPages.ourStoryText")}
                                    value={ourStoryText}
                                    onChange={setOurStoryText}
                                    placeholder={t("adminPages.ourStoryPlaceholder")}
                                    rows={8}
                                />
                            </CardContent>
                        </Card>

                    </TabsContent>

                    <TabsContent value="appearance" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <LayoutTemplate className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.visualStyle")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.visualStyleDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <StylePresetGrid config={themeConfig} onApply={applyStylePreset} />
                                <OutcomeHint>{t("adminTheme.previewPanelDesc")}</OutcomeHint>
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Palette className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.colors")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.colorsDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                                <ColorField
                                    label={t("adminTheme.brandColor")}
                                    value={themeConfig.brandColor}
                                    onChange={(value) => updateThemeConfig("brandColor", value)}
                                    helper={t("adminTheme.brandColorHint")}
                                />
                                <ColorField
                                    label={t("adminTheme.pageBackground")}
                                    value={themeConfig.pageBackgroundColor}
                                    onChange={(value) => updateThemeConfig("pageBackgroundColor", value)}
                                    helper={t("adminTheme.pageBackgroundHint")}
                                />
                                <div className="space-y-3">
                                    <Label>{t("adminTheme.backgroundPreset")}</Label>
                                    <Select
                                        value={themeConfig.pageBackgroundPreset}
                                        onValueChange={(value) => updateThemeConfig("pageBackgroundPreset", value as PageBackgroundPreset)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("adminTheme.selectPreset")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">{t("adminTheme.presetAuto")}</SelectItem>
                                            <SelectItem value="light">{t("adminTheme.presetLight")}</SelectItem>
                                            <SelectItem value="soft">{t("adminTheme.presetSoft")}</SelectItem>
                                            <SelectItem value="dark">{t("adminTheme.presetDark")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-text-muted">{t("adminTheme.backgroundPresetHint")}</p>
                                </div>
                                <div className="space-y-3">
                                    <Label>{t("adminTheme.cornerRadius")}</Label>
                                    <Select
                                        value={themeConfig.cornerRadius}
                                        onValueChange={(value) => updateThemeConfig("cornerRadius", value as ThemeConfig["cornerRadius"])}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("adminTheme.selectRadius")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sm">{t("adminTheme.radiusSmall")}</SelectItem>
                                            <SelectItem value="md">{t("adminTheme.radiusMedium")}</SelectItem>
                                            <SelectItem value="lg">{t("adminTheme.radiusLarge")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-text-muted">{t("adminTheme.radiusHint")}</p>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-surface-border p-3 sm:col-span-2 xl:col-span-4">
                                    <div className="space-y-1">
                                        <Label className="text-base" htmlFor="cardsElevated">{t("adminTheme.cardsElevated")}</Label>
                                        <p className="text-xs text-text-muted">{t("adminTheme.cardsElevatedHint")}</p>
                                    </div>
                                    <Switch
                                        id="cardsElevated"
                                        checked={themeConfig.cardsElevated}
                                        onCheckedChange={(value) => updateThemeConfig("cardsElevated", value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Type className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.typography")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.typographyDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FontPairingSelector
                                    selected={themeConfig.fontPairing}
                                    onChange={(value) => updateThemeConfig("fontPairing", value)}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <LayoutTemplate className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.bannersHeroTreatment")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.bannersHeroTreatmentDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <VariantBlock title={t("adminTheme.heroStyle")} description={t("adminTheme.heroStyleDesc")}>
                                    <OutcomeHint>{t("adminTheme.heroOutcomeHint")}</OutcomeHint>
                                    <VariantSelector
                                        options={[
                                            { value: "hero-cinematic", label: t("adminTheme.heroCinematic"), description: t("adminTheme.heroCinematicLongDesc") },
                                            { value: "hero-split", label: t("adminTheme.heroSplit"), description: t("adminTheme.heroSplitLongDesc") },
                                            { value: "hero-minimal", label: t("adminTheme.heroMinimal"), description: t("adminTheme.heroMinimalLongDesc") },
                                        ]}
                                        selected={themeConfig.heroVariant}
                                        onChange={(value) => updateThemeConfig("heroVariant", value)}
                                    />
                                </VariantBlock>
                                <VariantBlock title={t("adminTheme.servicesLayout")} description={t("adminTheme.servicesLayoutDesc")}>
                                    <VariantSelector
                                        options={[
                                            { value: "services-grid", label: t("adminTheme.servicesGridLabel"), description: t("adminTheme.servicesGridLongDesc") },
                                            { value: "services-list", label: t("adminTheme.servicesListLabel"), description: t("adminTheme.servicesListLongDesc") },
                                        ]}
                                        selected={themeConfig.servicesVariant}
                                        onChange={(value) => updateThemeConfig("servicesVariant", value)}
                                    />
                                </VariantBlock>
                                <VariantBlock title={t("adminTheme.teamLayout")} description={t("adminTheme.teamLayoutDesc")}>
                                    <VariantSelector
                                        options={[
                                            { value: "team-cards", label: t("adminTheme.teamCardsLabel"), description: t("adminTheme.teamCardsLongDesc") },
                                            { value: "team-spotlight", label: t("adminTheme.teamSpotlight"), description: t("adminTheme.teamSpotlightLongDesc") },
                                        ]}
                                        selected={themeConfig.teamVariant}
                                        onChange={(value) => updateThemeConfig("teamVariant", value)}
                                    />
                                </VariantBlock>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MousePointerClick className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.buttonsCtas")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.buttonsCtasDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canCTACustomize ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.homeCTACustomization")}
                                        feature="HOME_CTA_CUSTOMIZATION"
                                        currentPlan={plan}
                                        requiredPlan="PRO"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <OutcomeHint>{t("adminTheme.ctaOutcomeHint")}</OutcomeHint>
                                        {themeConfig.homeCTAButtons.map((button, index) => {
                                            const needsEventsWarn = (button.destination === "events" || button.destination === "free-events") && !canUsePlanFeature(plan, "GROUP_EVENTS");
                                            const needsClassesWarn = button.destination === "classes" && !canUsePlanFeature(plan, "GROUP_CLASSES");

                                            return (
                                                <div key={button.destination} className="space-y-3 rounded-lg border border-surface-border bg-page p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={button.enabled}
                                                            onCheckedChange={(value) => updateCTAButton(index, "enabled", value)}
                                                        />
                                                        <span className="flex-1 text-sm font-semibold text-text-main">
                                                            {getDestinationLabel(button.destination)}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            disabled={index === 0}
                                                            onClick={() => moveCTAButton(index, -1)}
                                                            title={t("adminTheme.ctaMoveUp")}
                                                        >
                                                            <ChevronUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            disabled={index === themeConfig.homeCTAButtons.length - 1}
                                                            onClick={() => moveCTAButton(index, 1)}
                                                            title={t("adminTheme.ctaMoveDown")}
                                                        >
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">{t("adminTheme.ctaLabel")}</Label>
                                                            <Input
                                                                value={button.label}
                                                                onChange={(event) => updateCTAButton(index, "label", event.target.value)}
                                                                placeholder={t("adminTheme.ctaLabelPlaceholder")}
                                                            />
                                                        </div>
                                                        <ColorField
                                                            label={t("adminTheme.ctaColor")}
                                                            value={button.color}
                                                            onChange={(value) => updateCTAButton(index, "color", value)}
                                                        />
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">{t("adminTheme.ctaOpacity")} — {button.opacity}%</Label>
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={100}
                                                                value={button.opacity}
                                                                onChange={(event) => updateCTAButton(index, "opacity", Number(event.target.value))}
                                                                className="w-full accent-brand"
                                                            />
                                                        </div>
                                                    </div>
                                                    {button.enabled && (needsEventsWarn || needsClassesWarn) ? (
                                                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                            <span>
                                                                {needsClassesWarn
                                                                    ? t("adminTheme.ctaDestinationClassesWarning")
                                                                    : t("adminTheme.ctaDestinationEventsWarning")}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sections" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <GripVertical className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.sectionOrder")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.sectionOrderDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canSectionOrder ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.homeSectionOrder")}
                                        feature="HOME_SECTION_ORDER"
                                        currentPlan={plan}
                                        requiredPlan="BUSINESS"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        <OutcomeHint>{t("adminTheme.sectionOutcomeHint")}</OutcomeHint>
                                        {themeConfig.homeSectionOrder.map((key, index) => {
                                            const labels: Record<HomeSectionKey, string> = {
                                                about: t("adminTheme.sectionAbout"),
                                                services: t("adminTheme.sectionServices"),
                                                events: t("adminTheme.sectionEvents"),
                                                classes: t("adminTheme.sectionClasses"),
                                                team: t("adminTheme.sectionTeam"),
                                            };

                                            return (
                                                <div key={key} className="flex items-center gap-3 rounded-lg border border-surface-border bg-page px-4 py-3">
                                                    <GripVertical className="h-4 w-4 shrink-0 text-text-muted" />
                                                    <span className="flex-1 text-sm font-medium text-text-main">{labels[key]}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={index === 0}
                                                        onClick={() => {
                                                            setThemeConfig((prev) => {
                                                                const order = [...prev.homeSectionOrder];
                                                                [order[index - 1], order[index]] = [order[index], order[index - 1]];
                                                                return { ...prev, homeSectionOrder: order };
                                                            });
                                                        }}
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={index === themeConfig.homeSectionOrder.length - 1}
                                                        onClick={() => {
                                                            setThemeConfig((prev) => {
                                                                const order = [...prev.homeSectionOrder];
                                                                [order[index], order[index + 1]] = [order[index + 1], order[index]];
                                                                return { ...prev, homeSectionOrder: order };
                                                            });
                                                        }}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <PanelBottom className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.footerCustomization")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.footerCustomizationDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canFooterCustomize ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.footerCustomization")}
                                        feature="FOOTER_CUSTOMIZATION"
                                        currentPlan={plan}
                                        requiredPlan="BUSINESS"
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>{t("adminTheme.footerTagline")}</Label>
                                            <Input
                                                value={themeConfig.footerConfig.tagline ?? ""}
                                                onChange={(event) => setThemeConfig((prev) => ({
                                                    ...prev,
                                                    footerConfig: { ...prev.footerConfig, tagline: event.target.value || null },
                                                }))}
                                                placeholder={t("adminTheme.footerTaglinePlaceholder")}
                                            />
                                        </div>
                                        <ToggleList
                                            label={t("storefrontBuilder.footerContact")}
                                            items={[
                                                ["show_address", t("adminTheme.footerShowAddress")],
                                                ["show_phone", t("adminTheme.footerShowPhone")],
                                                ["show_email", t("adminTheme.footerShowEmail")],
                                            ]}
                                            values={themeConfig.footerConfig}
                                            onChange={(field, value) => setThemeConfig((prev) => ({
                                                ...prev,
                                                footerConfig: { ...prev.footerConfig, [field]: value },
                                            }))}
                                        />
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                                {t("adminTheme.footerNavLinks")}
                                            </Label>
                                            <div className="space-y-2">
                                                {themeConfig.footerConfig.nav_links.map((link) => {
                                                    const navLabels: Record<string, string> = {
                                                        home: t("adminTheme.footerNavHome"),
                                                        services: t("adminTheme.footerNavServices"),
                                                        events: t("adminTheme.footerNavEvents"),
                                                        classes: t("adminTheme.footerNavClasses"),
                                                        about: t("adminTheme.footerNavAbout"),
                                                        book: t("adminTheme.footerNavBook"),
                                                    };
                                                    return (
                                                        <div key={link.key} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                                                            <span className="text-sm text-text-main">{navLabels[link.key] ?? link.key}</span>
                                                            <Switch
                                                                checked={link.enabled}
                                                                onCheckedChange={(value) => setThemeConfig((prev) => ({
                                                                    ...prev,
                                                                    footerConfig: {
                                                                        ...prev.footerConfig,
                                                                        nav_links: prev.footerConfig.nav_links.map((item) => (
                                                                            item.key === link.key ? { ...item, enabled: value } : item
                                                                        )),
                                                                    },
                                                                }))}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ImageIcon className="h-5 w-5 text-admin-brand" />
                                    {t("storefrontBuilder.images")}
                                </CardTitle>
                                <CardDescription>{t("storefrontBuilder.imagesDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <UploadField
                                    title={t("adminPages.logo")}
                                    description={t("adminPages.logoDescription")}
                                >
                                    <ImageUpload
                                        companyId={companyId!}
                                        type="logo"
                                        currentUrl={getDisplayUrl("logo_url")}
                                        autoUpload={false}
                                        onFileSelect={handleImageSelect("logo_url")}
                                        onDelete={() => handleImageDelete("logo_url")}
                                        aspectRatio="1:1"
                                        maxSizeMB={2}
                                    />
                                </UploadField>
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <UploadField title={t("adminPages.homeHero")} description={t("adminPages.homeHeroDescription")}>
                                        <ImageUpload
                                            companyId={companyId!}
                                            type="hero_home"
                                            currentUrl={getDisplayUrl("hero_home_url")}
                                            autoUpload={false}
                                            onFileSelect={handleImageSelect("hero_home_url")}
                                            onDelete={() => handleImageDelete("hero_home_url")}
                                            aspectRatio="16:9"
                                            maxSizeMB={5}
                                        />
                                    </UploadField>
                                    <UploadField title={t("adminPages.aboutHero")} description={t("adminPages.aboutHeroDescription")}>
                                        <ImageUpload
                                            companyId={companyId!}
                                            type="hero_about"
                                            currentUrl={getDisplayUrl("hero_about_url")}
                                            autoUpload={false}
                                            onFileSelect={handleImageSelect("hero_about_url")}
                                            onDelete={() => handleImageDelete("hero_about_url")}
                                            aspectRatio="16:9"
                                            maxSizeMB={5}
                                        />
                                    </UploadField>
                                </div>
                                <div>
                                    <div className="mb-3">
                                        <h3 className="text-sm font-semibold text-text-main">{t("adminPages.gallery")}</h3>
                                        <p className="text-sm text-text-muted">{t("adminPages.galleryDescription")}</p>
                                    </div>
                                    <div className="grid gap-6 md:grid-cols-3">
                                        {(["about_image_1_url", "about_image_2_url", "about_image_3_url"] as const).map((field, index) => (
                                            <div key={field} className="space-y-2">
                                                <Label>{t("adminPages.imageNumber", { number: index + 1 })}</Label>
                                                <ImageUpload
                                                    companyId={companyId!}
                                                    type={`about_${index + 1}` as "about_1" | "about_2" | "about_3"}
                                                    currentUrl={getDisplayUrl(field)}
                                                    autoUpload={false}
                                                    onFileSelect={handleImageSelect(field)}
                                                    onDelete={() => handleImageDelete(field)}
                                                    aspectRatio="4:3"
                                                    maxSizeMB={3}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="h-5 w-5 text-admin-brand" />
                                    {t("adminPages.teamPhotos")}
                                </CardTitle>
                                <CardDescription>{t("adminPages.teamPhotosDescription")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {staff.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-surface-border py-10 text-center text-text-muted">
                                        <Users className="mx-auto mb-3 h-10 w-10 text-text-muted/60" />
                                        <p className="font-medium">{t("adminPages.noStaff")}</p>
                                        <p className="text-sm">{t("adminPages.noStaffDescription")}</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                        {staff.map((member) => (
                                            <div key={member.id} className="rounded-lg border border-surface-border p-4">
                                                <div className="mb-4">
                                                    <h3 className="font-semibold text-text-main">{member.display_name}</h3>
                                                    <p className="text-sm text-text-muted">{member.role}</p>
                                                </div>
                                                <ImageUpload
                                                    companyId={companyId!}
                                                    type="staff"
                                                    entityId={member.id}
                                                    currentUrl={getStaffDisplayUrl(member)}
                                                    autoUpload={false}
                                                    onFileSelect={handleStaffImageSelect(member.id)}
                                                    aspectRatio="1:1"
                                                    maxSizeMB={2}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Megaphone className="h-5 w-5 text-admin-brand" />
                                    {t("adminTheme.announcementBanners")}
                                </CardTitle>
                                <CardDescription>{t("adminTheme.announcementBannersDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canBanners ? (
                                    <PlanUpgradeNotice
                                        title={t("planEnforcement.featureLockedTitle")}
                                        message={t("planEnforcement.desc.announcementBanners")}
                                        feature="ANNOUNCEMENT_BANNERS"
                                        currentPlan={plan}
                                        requiredPlan="PRO"
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <OutcomeHint>{t("adminTheme.bannerOutcomeHint")}</OutcomeHint>
                                        <AnnouncementBannerEditor
                                            banners={themeConfig.announcementBanners}
                                            setBanners={(updater) => setThemeConfig((prev) => ({
                                                ...prev,
                                                announcementBanners: updater(prev.announcementBanners),
                                            }))}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="business" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-admin-brand" />
                                    {t("adminSettings.companyInformation")}
                                </CardTitle>
                                <CardDescription>{t("storefrontBuilder.businessInfoDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                                <Field label={t("adminSettings.companyName")} id="name">
                                    <Input id="name" value={settings.name} onChange={(event) => updateSettings("name", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.slug")} id="slug">
                                    <Input id="slug" value={settings.slug} onChange={(event) => updateSettings("slug", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.email")} id="email">
                                    <Input id="email" type="email" value={settings.email} onChange={(event) => updateSettings("email", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.currency")} id="currency" helper={t("adminSettings.currencyCodeHelp")}>
                                    <Input
                                        id="currency"
                                        value={settings.currency}
                                        onChange={(event) => updateSettings("currency", event.target.value.slice(0, 3))}
                                        maxLength={3}
                                        className="uppercase"
                                    />
                                </Field>
                                <div className="grid grid-cols-4 gap-2">
                                    <Field label={t("adminSettings.prefix")} id="phone_prefix" className="col-span-1">
                                        <Input
                                            id="phone_prefix"
                                            value={settings.phone_prefix}
                                            onChange={(event) => updateSettings("phone_prefix", event.target.value)}
                                        />
                                    </Field>
                                    <Field label={t("adminSettings.phone")} id="phone" className="col-span-3">
                                        <Input id="phone" value={settings.phone} onChange={(event) => updateSettings("phone", event.target.value)} />
                                    </Field>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-surface-border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t("adminSettings.activeStatus")}</Label>
                                        <p className="text-sm text-text-muted">{t("adminSettings.visibleToPublic")}</p>
                                    </div>
                                    <Switch
                                        checked={settings.is_active}
                                        onCheckedChange={(checked) => updateSettings("is_active", checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle>{t("adminSettings.locationAddress")}</CardTitle>
                                <CardDescription>{t("storefrontBuilder.locationDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                                <Field label={t("adminSettings.address")} id="address" className="sm:col-span-2">
                                    <Input id="address" value={settings.address} onChange={(event) => updateSettings("address", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.city")} id="city">
                                    <Input id="city" value={settings.city} onChange={(event) => updateSettings("city", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.stateProvince")} id="state">
                                    <Input id="state" value={settings.state} onChange={(event) => updateSettings("state", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.countryCode")} id="country_code">
                                    <Input
                                        id="country_code"
                                        value={settings.country_code}
                                        onChange={(event) => updateSettings("country_code", event.target.value.toUpperCase())}
                                        maxLength={2}
                                    />
                                </Field>
                                <Field label={t("adminSettings.timezone")} id="timezone">
                                    <Input id="timezone" value={settings.timezone} onChange={(event) => updateSettings("timezone", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.googleMapsUrl")} id="google_maps_url" className="sm:col-span-2" helper={t("adminSettings.googleMapsHelp")}>
                                    <Input
                                        id="google_maps_url"
                                        value={settings.google_maps_url}
                                        onChange={(event) => updateSettings("google_maps_url", event.target.value)}
                                    />
                                </Field>
                                <Field label={t("adminSettings.latitude")} id="latitude">
                                    <Input id="latitude" type="number" step="any" value={settings.latitude} onChange={(event) => updateSettings("latitude", event.target.value)} />
                                </Field>
                                <Field label={t("adminSettings.longitude")} id="longitude">
                                    <Input id="longitude" type="number" step="any" value={settings.longitude} onChange={(event) => updateSettings("longitude", event.target.value)} />
                                </Field>
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle>{t("adminSettings.socialMediaLinks")}</CardTitle>
                                <CardDescription>{t("storefrontBuilder.socialDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SocialLinksForm
                                    socialLinks={settings.social_links}
                                    onChange={(links) => updateSettings("social_links", links)}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle>{t("storefrontBuilder.storefrontPreferences")}</CardTitle>
                                <CardDescription>{t("storefrontBuilder.storefrontPreferencesDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                                <Field label={t("adminSettings.defaultLanguage")} id="default_language">
                                    <Select
                                        value={settings.default_language}
                                        onValueChange={(value) => updateSettings("default_language", value)}
                                    >
                                        <SelectTrigger id="default_language">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">{t("language.es")}</SelectItem>
                                            <SelectItem value="en">{t("language.en")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label={t("adminSettings.staffLabelTitle")} id="staff_label" helper={t("adminSettings.staffLabelDesc")}>
                                    <Input
                                        id="staff_label"
                                        value={settings.staff_label}
                                        onChange={(event) => updateSettings("staff_label", event.target.value)}
                                        maxLength={50}
                                    />
                                </Field>
                            </CardContent>
                        </Card>

                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle>{t("adminTheme.advancedOptions")}</CardTitle>
                                <CardDescription>{t("adminTheme.advancedOptionsDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ReadonlyToggle
                                    label={t("adminSettings.allowCash")}
                                    checked={settings.allow_cash_payment}
                                />
                                <ReadonlyToggle
                                    label={t("adminSettings.allowQR")}
                                    checked={settings.allow_qr_payment}
                                />
                                <ReadonlyToggle
                                    label={t("adminSettings.autoConfirmBookings")}
                                    checked={settings.auto_confirm_bookings}
                                    muted={!canCustomizeBookingFlow}
                                />
                                <ReadonlyToggle
                                    label={t("adminSettings.emailNotifications")}
                                    checked={settings.send_email_notifications}
                                    muted={!canUseNotifications}
                                />
                                <p className="text-xs text-text-muted">{t("storefrontBuilder.advancedSettingsHint")}</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Eye className="h-5 w-5 text-admin-brand" />
                                {t("storefrontBuilder.preview")}
                            </CardTitle>
                            <CardDescription>{t("storefrontBuilder.previewDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <OutcomeHint>{t("storefrontBuilder.previewDraftHint")}</OutcomeHint>
                            <StorefrontDraftPreview
                                content={{
                                    ...content,
                                    logo_url: getDisplayUrl("logo_url"),
                                    hero_home_url: getDisplayUrl("hero_home_url"),
                                    hero_about_url: getDisplayUrl("hero_about_url"),
                                    about_image_1_url: getDisplayUrl("about_image_1_url"),
                                    about_image_2_url: getDisplayUrl("about_image_2_url"),
                                    about_image_3_url: getDisplayUrl("about_image_3_url"),
                                }}
                                aboutUsText={aboutUsText}
                                heroOverlayText={heroOverlayText}
                                ourStoryText={ourStoryText}
                                settings={settings}
                                staff={staff.map((member) => ({ ...member, image_url: getStaffDisplayUrl(member) }))}
                                themeConfig={themeConfig}
                                previewData={previewData}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("storefrontBuilder.legacyToolsTitle")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-text-muted">
                            <p>{t("storefrontBuilder.legacyToolsBody")}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link href="/admin/dashboard/theme">
                                    <Button variant="outline" size="sm">{t("adminNav.theme")}</Button>
                                </Link>
                                <Link href="/admin/dashboard/page-management">
                                    <Button variant="outline" size="sm">{t("adminNav.pages")}</Button>
                                </Link>
                                <Link href="/admin/dashboard/settings">
                                    <Button variant="outline" size="sm">{t("adminNav.settings")}</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <StickyFormActions
                onSave={handleSaveAll}
                loading={saving}
                saveLabel={t("storefrontBuilder.save")}
                loadingLabel={t("storefrontBuilder.saving")}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
            />
        </AdminPageShell>
    );
}

type BannerStatus = "inactive" | "scheduled" | "active" | "expired";

function getBannerStatus(banner: AnnouncementBanner, now = new Date()): BannerStatus {
    if (!banner.enabled) return "inactive";
    if (banner.starts_at && new Date(banner.starts_at) > now) return "scheduled";
    const endsAt = getBannerEndAt(banner);
    if (endsAt && new Date(endsAt) < now) return "expired";
    return "active";
}

function isoToDateTimeLocal(value: string | null | undefined): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}

function StorefrontDraftPreview({
    content,
    aboutUsText,
    heroOverlayText,
    ourStoryText,
    settings,
    staff,
    themeConfig,
    previewData,
}: {
    content: CompanyContent;
    aboutUsText: string;
    heroOverlayText: string;
    ourStoryText: string;
    settings: CompanySettings;
    staff: StaffMember[];
    themeConfig: ExtendedThemeConfig;
    previewData: ShopData | null;
}) {
    const t = useT();
    const theme = useMemo(() => computeTheme(themeConfig), [themeConfig]);
    const fonts = fontPairingMap[themeConfig.fontPairing] || fontPairingMap.classic;
    const activeBanner = useMemo(
        () => getActiveAnnouncementBanner(themeConfig.announcementBanners),
        [themeConfig.announcementBanners],
    );

    const company = useMemo(() => ({
        ...(previewData?.company ?? {}),
        id: previewData?.company.id ?? 0,
        slug: settings.slug || previewData?.company.slug || "preview",
        name: settings.name || previewData?.company.name || t("themePreview.shopName"),
        availableUntil: previewData?.company.availableUntil ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        address: settings.address,
        phone_prefix: settings.phone_prefix,
        phone: settings.phone,
        email: settings.email,
        google_maps_url: settings.google_maps_url,
        city: settings.city,
        state: settings.state,
        country_code: settings.country_code,
        latitude: settings.latitude ? Number(settings.latitude) : undefined,
        longitude: settings.longitude ? Number(settings.longitude) : undefined,
        timezone: settings.timezone,
        currency: settings.currency,
        logo_url: content.logo_url,
        home_hero_image_url: content.hero_home_url,
        about_hero_image_url: content.hero_about_url,
        hero_about_url: content.hero_about_url,
        about_image_1_url: content.about_image_1_url,
        about_image_2_url: content.about_image_2_url,
        about_image_3_url: content.about_image_3_url,
        about_us_text: aboutUsText,
        hero_overlay_text: heroOverlayText,
        our_story_text: ourStoryText,
        is_active: settings.is_active,
        company_type_id: previewData?.company.company_type_id ?? 0,
    }), [aboutUsText, content, heroOverlayText, ourStoryText, previewData?.company, settings, t]);

    const cssVars = {
        ...theme.tokens.cssVars,
        "--font-heading": fonts.heading,
        "--font-body": fonts.body,
    } as React.CSSProperties;

    const sectionLabels: Record<HomeSectionKey, string> = {
        about: t("adminTheme.sectionAbout"),
        services: t("adminTheme.sectionServices"),
        events: t("adminTheme.sectionEvents"),
        classes: t("adminTheme.sectionClasses"),
        team: t("adminTheme.sectionTeam"),
    };

    const services = previewData?.services ?? [];
    const categories = previewData?.categories ?? [];
    const hours = previewData?.hours ?? [];
    const slug = company.slug;

    const heroProps = {
        company,
        reviewStats: previewData?.reviewStats ?? null,
        socialLinks: settings.social_links,
        slug,
        homeCTAButtons: themeConfig.homeCTAButtons,
    };

    return (
        <div className="rounded-xl border-2 border-dashed border-surface-border bg-page p-3">
            <div
                className="max-h-[760px] overflow-y-auto rounded-xl bg-page shadow-2xl ring-1 ring-black/5"
                style={cssVars}
            >
                <div className="pointer-events-none min-h-[680px] bg-page text-text-main">
                    {activeBanner ? (
                        <div
                            className="px-4 py-2 text-center text-sm font-medium"
                            style={{ backgroundColor: activeBanner.background_color, color: activeBanner.text_color }}
                        >
                            {activeBanner.message || t("storefrontBuilder.bannerPreviewEmpty")}
                            {activeBanner.link_url ? (
                                <span className="ml-2 underline underline-offset-2">
                                    {activeBanner.link_label || t("adminTheme.announcementBannerDefaultLink")}
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 px-4 py-3 backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                {company.logo_url ? (
                                    <img
                                        src={getImageUrl(company.logo_url) || undefined}
                                        alt=""
                                        className="h-8 w-8 rounded-md object-cover"
                                    />
                                ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
                                        {company.name.charAt(0) || "P"}
                                    </div>
                                )}
                                <span className="truncate font-heading text-sm font-bold">{company.name}</span>
                            </div>
                            <div className="hidden items-center gap-3 text-xs font-semibold text-text-muted sm:flex">
                                <span>{t("shopNav.services")}</span>
                                <span>{t("shopNav.about")}</span>
                                <span className="rounded-md bg-brand px-2.5 py-1 text-white">{t("shopNav.bookShort")}</span>
                            </div>
                        </div>
                    </div>

                    {themeConfig.heroVariant === "hero-split" ? (
                        <HeroSplit {...heroProps} />
                    ) : themeConfig.heroVariant === "hero-minimal" ? (
                        <HeroMinimal {...heroProps} />
                    ) : (
                        <HeroCinematic {...heroProps} />
                    )}

                    <QuickInfoBar company={company} hours={hours} />

                    {themeConfig.homeSectionOrder.map((key) => {
                        if (key === "about") {
                            if (!aboutUsText) return null;
                            return (
                                <PreviewSection key={key} eyebrow={sectionLabels[key]} title={t("shopHome.aboutUs")}>
                                    <p className="font-heading text-xl leading-relaxed text-text-main">{aboutUsText}</p>
                                    {ourStoryText ? (
                                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{ourStoryText}</p>
                                    ) : null}
                                </PreviewSection>
                            );
                        }

                        if (key === "services") {
                            if (services.length === 0) return null;
                            return (
                                <PreviewSection key={key} eyebrow={t("shopHome.whatWeOffer")} title={t("shopHome.ourServices")}>
                                    <PreviewServices services={services} currency={company.currency} listStyle={themeConfig.servicesVariant === "services-list"} />
                                </PreviewSection>
                            );
                        }

                        if (key === "team") {
                            if (staff.length === 0) return null;
                            return (
                                <PreviewSection key={key} eyebrow={t("shopHome.ourExperts")} title={t("shopHome.ourTeam")}>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {staff.slice(0, 4).map((member) => (
                                            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3 shadow-card">
                                                {member.image_url ? (
                                                    <img src={getImageUrl(member.image_url) || undefined} alt="" className="h-12 w-12 rounded-md object-cover" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-md bg-brand-soft-bg" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-text-main">{member.display_name}</p>
                                                    <p className="truncate text-xs text-text-muted">{member.role || settings.staff_label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </PreviewSection>
                            );
                        }

                        if (key === "events" || key === "classes") {
                            return (
                                <PreviewSection key={key} eyebrow={sectionLabels[key]} title={sectionLabels[key]}>
                                    <p className="text-sm text-text-muted">{t("storefrontBuilder.previewManagedContent")}</p>
                                </PreviewSection>
                            );
                        }

                        return null;
                    })}

                    <footer className="border-t border-surface-border bg-section px-4 py-8">
                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <p className="font-heading text-lg font-bold text-text-main">{company.name}</p>
                                {themeConfig.footerConfig.tagline ? (
                                    <p className="mt-2 text-text-muted">{themeConfig.footerConfig.tagline}</p>
                                ) : null}
                            </div>
                            <div className="space-y-1 text-text-muted">
                                {themeConfig.footerConfig.show_address && company.address ? <p>{company.address}</p> : null}
                                {themeConfig.footerConfig.show_phone && company.phone ? <p>+{company.phone_prefix} {company.phone}</p> : null}
                                {themeConfig.footerConfig.show_email && company.email ? <p>{company.email}</p> : null}
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
            {categories.length === 0 && services.length > 0 ? (
                <p className="mt-2 text-xs text-text-muted">{t("storefrontBuilder.previewCategoryFallback")}</p>
            ) : null}
        </div>
    );
}

function PreviewSection({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="py-10">
            <div className="mx-auto max-w-5xl px-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{eyebrow}</p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main">{title}</h2>
                <div className="mt-5">{children}</div>
            </div>
        </section>
    );
}

function PreviewServices({
    services,
    currency,
    listStyle,
}: {
    services: ShopService[];
    currency?: string;
    listStyle: boolean;
}) {
    const items = services.slice(0, 4);
    if (listStyle) {
        return (
            <div className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface shadow-card">
                {items.map((service) => (
                    <div key={service.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-text-main">{service.name}</p>
                            {service.description ? <p className="line-clamp-1 text-xs text-text-muted">{service.description}</p> : null}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-brand">{currency} {(service.price_cents / 100).toFixed(0)}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((service) => (
                <div key={service.id} className="rounded-lg border border-surface-border bg-surface p-4 shadow-card">
                    <p className="font-heading text-base font-semibold text-text-main">{service.name}</p>
                    {service.description ? <p className="mt-2 line-clamp-2 text-sm text-text-muted">{service.description}</p> : null}
                    <p className="mt-3 text-sm font-semibold text-brand">{currency} {(service.price_cents / 100).toFixed(0)}</p>
                </div>
            ))}
        </div>
    );
}

function BuilderMetric({
    icon,
    label,
    value,
    hint,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    hint: string;
}) {
    return (
        <Card className="border-surface-border bg-surface shadow-card">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-admin-brand-soft text-admin-brand">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
                    <div className="truncate text-base font-semibold text-text-main">{value}</div>
                    <p className="truncate text-xs text-text-muted">{hint}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function Field({
    label,
    id,
    helper,
    className,
    children,
}: {
    label: string;
    id: string;
    helper?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={["space-y-2", className].filter(Boolean).join(" ")}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            {helper ? <p className="text-xs text-text-muted">{helper}</p> : null}
        </div>
    );
}

function TextAreaField({
    id,
    label,
    value,
    onChange,
    placeholder,
    helper,
    rows,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    helper?: string;
    rows: number;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full resize-y rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-text-main placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-admin-brand/30"
            />
            {helper ? <p className="text-xs text-text-muted">{helper}</p> : null}
        </div>
    );
}

function ColorField({
    label,
    value,
    onChange,
    helper,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    helper?: string;
}) {
    return (
        <div className="space-y-3">
            <Label>{label}</Label>
            <div className="flex gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-surface-border shadow-sm">
                    <input
                        type="color"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                    />
                </div>
                <Input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="font-mono uppercase"
                    maxLength={9}
                />
            </div>
            {helper ? <p className="text-xs text-text-muted">{helper}</p> : null}
        </div>
    );
}

function VariantBlock({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-sm font-semibold text-text-main">{title}</h3>
                <p className="text-sm text-text-muted">{description}</p>
            </div>
            {children}
        </section>
    );
}

function ToggleList<T extends object>({
    label,
    items,
    values,
    onChange,
}: {
    label: string;
    items: Array<[keyof T, string]>;
    values: T;
    onChange: (field: keyof T, value: boolean) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</Label>
            <div className="space-y-2">
                {items.map(([field, itemLabel]) => (
                    <div key={String(field)} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                        <span className="text-sm text-text-main">{itemLabel}</span>
                        <Switch checked={Boolean(values[field])} onCheckedChange={(value) => onChange(field, value)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function UploadField({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <div>
                <h3 className="text-sm font-semibold text-text-main">{title}</h3>
                <p className="text-sm text-text-muted">{description}</p>
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}

function ReadonlyToggle({
    label,
    checked,
    muted = false,
}: {
    label: string;
    checked: boolean;
    muted?: boolean;
}) {
    return (
        <div className={`flex items-center justify-between rounded-md border border-surface-border px-3 py-2 ${muted ? "opacity-60" : ""}`}>
            <span className="text-sm text-text-main">{label}</span>
            <Switch checked={checked} disabled />
        </div>
    );
}

function AnnouncementBannerEditor({
    banners,
    setBanners,
}: {
    banners: AnnouncementBanner[];
    setBanners: (updater: (banners: AnnouncementBanner[]) => AnnouncementBanner[]) => void;
}) {
    const t = useT();
    const statusLabels: Record<BannerStatus, string> = {
        inactive: t("adminTheme.announcementBannerStatusInactive"),
        scheduled: t("adminTheme.announcementBannerStatusScheduled"),
        active: t("adminTheme.announcementBannerStatusActive"),
        expired: t("adminTheme.announcementBannerStatusExpired"),
    };
    const statusClasses: Record<BannerStatus, string> = {
        inactive: "bg-slate-100 text-slate-600",
        scheduled: "bg-sky-100 text-sky-700",
        active: "bg-emerald-100 text-emerald-700",
        expired: "bg-amber-100 text-amber-800",
    };

    return (
        <div className="space-y-4">
            {banners.map((banner, index) => {
                const status = getBannerStatus(banner);

                return (
                <div key={banner.id} className="space-y-4 rounded-lg border border-surface-border bg-page p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={banner.enabled}
                                onCheckedChange={(value) => setBanners((items) => items.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, enabled: value } : item
                                )))}
                            />
                            <div>
                                <span className="text-sm font-semibold text-text-main">{t("adminTheme.announcementBannerEnabled")}</span>
                                <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses[status]}`}>
                                    {statusLabels[status]}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-text-muted">{t("adminTheme.announcementBannerSticky")}</span>
                            <Switch
                                checked={banner.sticky === true}
                                onCheckedChange={(value) => setBanners((items) => items.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, sticky: value } : item
                                )))}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => setBanners((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">{t("adminTheme.announcementBannerMessage")}</Label>
                        <Input
                            value={banner.message}
                            onChange={(event) => setBanners((items) => items.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, message: event.target.value } : item
                            )))}
                            placeholder={t("adminTheme.announcementBannerMessagePlaceholder")}
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("adminTheme.announcementBannerLinkUrl")}</Label>
                            <Input
                                value={banner.link_url ?? ""}
                                onChange={(event) => setBanners((items) => items.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, link_url: event.target.value || null } : item
                                )))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("adminTheme.announcementBannerLinkLabel")}</Label>
                            <Input
                                value={banner.link_label ?? ""}
                                onChange={(event) => setBanners((items) => items.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, link_label: event.target.value || null } : item
                                )))}
                                placeholder={t("adminTheme.announcementBannerLinkLabelPlaceholder")}
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <ColorField
                            label={t("adminTheme.announcementBannerBgColor")}
                            value={banner.background_color}
                            onChange={(value) => setBanners((items) => items.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, background_color: value } : item
                            )))}
                        />
                        <ColorField
                            label={t("adminTheme.announcementBannerTextColor")}
                            value={banner.text_color}
                            onChange={(value) => setBanners((items) => items.map((item, itemIndex) => (
                                itemIndex === index ? { ...item, text_color: value } : item
                            )))}
                        />
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("adminTheme.announcementBannerStartsAt")}</Label>
                            <Input
                                type="datetime-local"
                                value={isoToDateTimeLocal(banner.starts_at)}
                                onChange={(event) => setBanners((items) => items.map((item, itemIndex) => (
                                    itemIndex === index
                                        ? { ...item, starts_at: dateTimeLocalToIso(event.target.value) }
                                        : item
                                )))}
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("adminTheme.announcementBannerEndsAt")}</Label>
                            <Input
                                type="datetime-local"
                                value={isoToDateTimeLocal(getBannerEndAt(banner))}
                                onChange={(event) => setBanners((items) => items.map((item, itemIndex) => {
                                    if (itemIndex !== index) return item;
                                    const endsAt = dateTimeLocalToIso(event.target.value);
                                    return { ...item, ends_at: endsAt, expires_at: endsAt };
                                }))}
                            />
                        </div>
                        <p className="self-end text-xs text-text-muted">
                            {t("adminTheme.announcementBannerScheduleHint")}
                        </p>
                    </div>
                    <div
                        className="flex items-center justify-center gap-3 rounded-md px-4 py-2 text-sm font-medium"
                        style={{ backgroundColor: banner.background_color, color: banner.text_color }}
                    >
                        {banner.message || "..."}
                        {banner.link_url ? (
                            <span className="underline underline-offset-2">{banner.link_label || t("adminTheme.announcementBannerDefaultLink")}</span>
                        ) : null}
                    </div>
                </div>
                );
            })}
            {banners.length < 3 ? (
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setBanners((items) => [
                        ...items,
                        {
                            id: crypto.randomUUID(),
                            message: "",
                            link_url: null,
                            link_label: null,
                            background_color: "#1d4ed8",
                            text_color: "#ffffff",
                            enabled: true,
                            sticky: false,
                            starts_at: null,
                            ends_at: null,
                            expires_at: null,
                        },
                    ])}
                >
                    <Megaphone className="h-4 w-4" />
                    {t("adminTheme.announcementBannersAddBanner")}
                </Button>
            ) : null}
        </div>
    );
}
