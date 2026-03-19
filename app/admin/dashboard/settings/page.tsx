"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Save, Building2, MapPin, Globe, CreditCard, CalendarClock, Bell, Share2, Languages } from "lucide-react";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SocialLinksForm } from "@/components/admin/settings/SocialLinksForm";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT, SUPPORTED_LOCALES } from "@/lib/i18n";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import type { SocialLinks } from "@/types/shop";
import type {
    ShopSubscriptionHistoryItem,
    ShopSubscriptionSnapshot,
} from "@/types/subscription-history";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import {
    LocationPicker,
    type LocationAutofillUpdate,
} from "@/components/admin/location/LocationPicker";
import { formatCurrencyAmount } from "@/lib/currency";

// Combined interface
interface CompanySettings {
    // General (Company Model)
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

    // Configuration (CompanySettings Model)
    booking_buffer_minutes: number;
    booking_time_granularity_minutes: number;
    cancel_limit_minutes: number;
    reschedule_limit_minutes: number;
    auto_approve_staff_time_off: boolean;
    max_advance_booking_days: number | null;
    min_advance_booking_hours: number | null;
    allow_qr_payment: boolean;
    qr_image_url: string | null;
    allow_cash_payment: boolean;
    send_email_notifications: boolean;
    send_whatsapp_notifications: boolean;
    social_links: SocialLinks;
    default_language: string;
}

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

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
    // Defaults
    booking_buffer_minutes: 10,
    booking_time_granularity_minutes: 30,
    cancel_limit_minutes: 120,
    reschedule_limit_minutes: 120,
    auto_approve_staff_time_off: false,
    max_advance_booking_days: null,
    min_advance_booking_hours: null,
    allow_qr_payment: true,
    qr_image_url: null,
    allow_cash_payment: true,
    send_email_notifications: true,
    send_whatsapp_notifications: false,
    social_links: {},
    default_language: "es",
};

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString();
}

function formatPrice(value: string | null, currency?: string | null): string {
    if (!value) return "—";
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return value;
    return formatCurrencyAmount(parsed, currency);
}

function formatChangePair(previousValue: string, nextValue: string): string {
    return `${previousValue} → ${nextValue}`;
}

const PLAN_LABEL_KEY: Record<string, string> = {
    STARTER: "adminSettings.planStarter",
    BUSINESS: "adminSettings.planBusiness",
    PRO: "adminSettings.planPro",
};

const BILLING_LABEL_KEY: Record<string, string> = {
    MONTHLY: "adminSettings.billingMonthly",
    YEARLY: "adminSettings.billingYearly",
};

export default function SettingsPage() {
    const { companyId, companyUser, user, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canUseNotifications = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "TRANSACTIONAL_BOOKING_NOTIFICATIONS");
    const canUseReminders = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "BOOKING_REMINDERS");

    const [settings, setSettings] = useState<CompanySettings>(initialSettings);
    const [subscriptionSummary, setSubscriptionSummary] = useState<ShopSubscriptionSnapshot | null>(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState<ShopSubscriptionHistoryItem[]>([]);
    const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedQR, setSelectedQR] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState("general");
    const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false);

    // Fetch company settings
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            // Fetch both Company Config and General Details
            const [companyRes, settingsRes, historyRes] = await Promise.all([
                fetch(getApiUrl(`/api/company/id/${companyId}`), { credentials: "include" }),
                fetch(getApiUrl(`/api/admin/settings`), { credentials: "include" }),
                fetch(getApiUrl(`/api/admin/settings/subscription-history`), { credentials: "include" }),
            ]);

            const companyData = companyRes.ok ? (await companyRes.json()) : {};
            const settingsData = settingsRes.ok ? (await settingsRes.json()) : {};
            const historyData = historyRes.ok ? (await historyRes.json()) : {};

            const company = companyData.data || companyData || {};
            const config = settingsData.data || settingsData || {};
            const historyPayload = historyData.data || {};

            setSettings(prev => ({
                ...prev,
                // General
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
                // Config
                booking_buffer_minutes: config.booking_buffer_minutes ?? prev.booking_buffer_minutes,
                booking_time_granularity_minutes: config.booking_time_granularity_minutes ?? prev.booking_time_granularity_minutes,
                cancel_limit_minutes: config.cancel_limit_minutes ?? prev.cancel_limit_minutes,
                reschedule_limit_minutes: config.reschedule_limit_minutes ?? prev.reschedule_limit_minutes,
                auto_approve_staff_time_off: config.auto_approve_staff_time_off ?? prev.auto_approve_staff_time_off,
                max_advance_booking_days: config.max_advance_booking_days ?? prev.max_advance_booking_days,
                min_advance_booking_hours: config.min_advance_booking_hours ?? prev.min_advance_booking_hours,
                allow_qr_payment: config.allow_qr_payment ?? prev.allow_qr_payment,
                qr_image_url: config.qr_image_url ?? prev.qr_image_url,
                allow_cash_payment: config.allow_cash_payment ?? prev.allow_cash_payment,
                send_email_notifications: config.send_email_notifications ?? prev.send_email_notifications,
                send_whatsapp_notifications: config.send_whatsapp_notifications ?? prev.send_whatsapp_notifications,
                social_links: config.social_links ?? prev.social_links,
                default_language: config.default_language ?? prev.default_language,
            }));

            if (historyPayload.company) {
                setSubscriptionSummary(historyPayload.company);
                setSubscriptionHistory(Array.isArray(historyPayload.history) ? historyPayload.history : []);
                setSubscriptionError(null);
            } else {
                setSubscriptionSummary(null);
                setSubscriptionHistory([]);
                setSubscriptionError(t("adminSettings.historyLoadFailed"));
            }

        } catch (err) {
            console.error("Failed to fetch settings:", err);
            void notify.error('Failed to load settings');
            setSubscriptionError(t("adminSettings.historyLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Handle input change
    const handleChange = (field: keyof CompanySettings, value: string | boolean | number | null | SocialLinks) => {
        setSettings(prev => {
            const next = { ...prev, [field]: value };

            // Auto-extract from Google Maps URL
            if (field === 'google_maps_url' && typeof value === 'string') {
                let url = value;

                // If user pasted an iframe, extract src
                if (value.includes('<iframe')) {
                    const srcMatch = value.match(/src="([^"]+)"/);
                    if (srcMatch && srcMatch[1]) {
                        url = srcMatch[1];
                        next.google_maps_url = url; // Update field to just URL
                    }
                }

                // Extract coordinates from pb parameter
                // Format: ...!2d-63.19750242438211!3d-17.767202574620846!...
                const longMatch = url.match(/!2d(-?\d+\.?\d*)/);
                const latMatch = url.match(/!3d(-?\d+\.?\d*)/);

                if (longMatch && longMatch[1]) {
                    next.longitude = longMatch[1];
                }
                if (latMatch && latMatch[1]) {
                    next.latitude = latMatch[1];
                }
            }

            return next;
        });
    };

    const handleLocationAutofill = useCallback((update: LocationAutofillUpdate) => {
        setSettings((prev) => {
            const fields = { ...update.fields };
            if (timezoneManuallyEdited) {
                delete fields.timezone;
            }

            // Field mapping: stateRegion -> state, countryCode -> country_code.
            return {
                ...prev,
                address: fields.address ?? prev.address,
                city: fields.city ?? prev.city,
                state: fields.stateRegion ?? prev.state,
                country_code: fields.countryCode ?? prev.country_code,
                timezone: fields.timezone ?? prev.timezone,
                latitude: fields.latitude ?? prev.latitude,
                longitude: fields.longitude ?? prev.longitude,
            };
        });
    }, [timezoneManuallyEdited]);

    // Save changes
    const handleSave = async () => {
        if (!companyId) return;

        const normalizedCurrency = settings.currency.trim();
        if (!normalizedCurrency || normalizedCurrency.length > 3) {
            await notify.warning(t("adminSettings.currencyInvalid"));
            return;
        }

        setSaving(true);
        try {
            let qrUrl = settings.qr_image_url;

            // Upload QR if selected
            if (selectedQR) {
                const formData = new FormData();
                formData.append('image', selectedQR);
                formData.append('company_id', companyId.toString());
                const uploadRes = await fetch(getApiUrl('/api/upload/qr'), {
                    method: 'POST',
                    body: formData,
                    credentials: "include",
                });

                if (!uploadRes.ok) {
                    throw new Error(t('adminSettings.uploadQrFailed'));
                }

                const uploadData = await uploadRes.json();
                qrUrl = uploadData.data?.url || uploadData.url;
            }

            // Payload for Company (General)
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
                latitude: settings.latitude ? parseFloat(settings.latitude) : null,
                longitude: settings.longitude ? parseFloat(settings.longitude) : null,
                is_active: settings.is_active,
            };

            // Payload for Admin Settings (Config)
            const payloadSettings = {
                booking_buffer_minutes: Number(settings.booking_buffer_minutes),
                booking_time_granularity_minutes: Number(settings.booking_time_granularity_minutes),
                cancel_limit_minutes: Number(settings.cancel_limit_minutes),
                reschedule_limit_minutes: Number(settings.reschedule_limit_minutes),
                auto_approve_staff_time_off: settings.auto_approve_staff_time_off,
                max_advance_booking_days: settings.max_advance_booking_days,
                min_advance_booking_hours: settings.min_advance_booking_hours,
                allow_qr_payment: settings.allow_qr_payment,
                qr_image_url: qrUrl,
                allow_cash_payment: settings.allow_cash_payment,
                send_email_notifications: settings.send_email_notifications,
                send_whatsapp_notifications: settings.send_whatsapp_notifications,
                social_links: settings.social_links,
                default_language: settings.default_language,
            };

            const [companyRes, settingsRes] = await Promise.all([
                fetch(getApiUrl(`/api/company/id/${companyId}`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payloadCompany),
                }),
                fetch(getApiUrl(`/api/admin/settings`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payloadSettings),
                }),
            ]);

            if (!companyRes.ok) {
                const errorData = await companyRes.json().catch(() => ({}));
                throw new Error(errorData.message || t('adminSettings.saveSettingsFailed'));
            }
            if (!settingsRes.ok) {
                const errorData = await settingsRes.json().catch(() => ({}));
                throw new Error(errorData.message || t('adminSettings.saveConfigFailed'));
            }

            // Update state with new URL if uploaded
            setSettings(prev => ({ ...prev, qr_image_url: qrUrl }));
            setSelectedQR(null); // Clear selection after upload
            await notify.success(t('common.success'));
        } catch (err) {
            console.error("Save error:", err);
            await notify.error(err instanceof Error ? err.message : t('adminSettings.saveSettingsFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('adminSettings.title')}</h1>
                    <p className="text-slate-500">{t('adminSettings.subtitle')}</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="hidden md:inline-flex bg-orange-500 hover:bg-orange-600 text-white"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {t('adminSettings.saving')}
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {t('common.save')}
                        </>
                    )}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 min-w-0">
                <TabsList className="config-tabs w-full justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-md border bg-white p-1 text-slate-600 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <TabsTrigger
                        value="general"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <Building2 className="h-4 w-4 mr-2" />
                        {t('adminSettings.general')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="booking"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        {t('adminSettings.bookingRules')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="payments"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('adminSettings.payments')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="social"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        {t('adminSettings.socialMedia')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="language"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <Languages className="h-4 w-4 mr-2" />
                        {t('adminSettings.language')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="subscription"
                        className="config-tab h-11 shrink-0 rounded-md px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-200"
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('adminSettings.subscription')}
                    </TabsTrigger>
                </TabsList>

                {/* --- GENERAL TAB --- */}
                <TabsContent value="general" className="space-y-6">
                    {/* General Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.companyInformation')}</CardTitle>
                            <CardDescription>{t('adminSettings.companyInformationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('adminSettings.companyName')}</Label>
                                <Input
                                    id="name"
                                    value={settings.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder={t('adminSettings.companyNamePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">
                                    {t('adminSettings.slug')}
                                    <span className="ml-1 text-xs text-slate-400 font-normal">
                                        ({t('adminSettings.slugHelpPrefix')}<strong>{t('adminSettings.slugHelpExample')}</strong>)
                                    </span>
                                </Label>
                                <Input
                                    id="slug"
                                    value={settings.slug}
                                    onChange={(e) => handleChange('slug', e.target.value)}
                                    placeholder={t('adminSettings.slugPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('adminSettings.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder={t('adminSettings.emailPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">{t('adminSettings.currency')}</Label>
                                <Input
                                    id="currency"
                                    value={settings.currency}
                                    onChange={(e) =>
                                        handleChange('currency', e.target.value.slice(0, 3))
                                    }
                                    placeholder={t('adminSettings.currencyPlaceholder')}
                                    maxLength={3}
                                    className="uppercase"
                                />
                                <p className="text-xs text-slate-500">{t('adminSettings.currencyCodeHelp')}</p>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-2 col-span-1">
                                    <Label htmlFor="phone_prefix">{t('adminSettings.prefix')}</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={settings.phone_prefix}
                                        onChange={(e) => handleChange('phone_prefix', e.target.value)}
                                        placeholder="591"
                                    />
                                </div>
                                <div className="space-y-2 col-span-3">
                                    <Label htmlFor="phone">{t('adminSettings.phone')}</Label>
                                    <Input
                                        id="phone"
                                        value={settings.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col justify-end pb-2">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.activeStatus')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.visibleToPublic')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.is_active}
                                        onCheckedChange={(checked) => handleChange('is_active', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.locationAddress')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <LocationPicker
                                    value={{
                                        address: settings.address,
                                        city: settings.city,
                                        stateRegion: settings.state,
                                        countryCode: settings.country_code,
                                        timezone: settings.timezone,
                                        latitude: settings.latitude,
                                        longitude: settings.longitude,
                                    }}
                                    text={{
                                        searchLabel: t('adminSettings.searchLocation'),
                                        searchPlaceholder: t('adminSettings.searchLocationPlaceholder'),
                                        helperText: t('adminSettings.searchLocationHelper'),
                                        searchLoadingText: t('adminSettings.locationSearchLoading'),
                                        searchErrorText: t('adminSettings.locationSearchError'),
                                        noResultsText: t('adminSettings.locationSearchNoResults'),
                                        reverseGeocodeLoadingText: t('adminSettings.reverseGeocodeLoading'),
                                        reverseGeocodeErrorText: t('adminSettings.reverseGeocodeError'),
                                        mapUnavailableText: t('adminSettings.mapUnavailable'),
                                        missingTokenText: t('adminSettings.mapTokenMissing'),
                                    }}
                                    onLocationAutofill={handleLocationAutofill}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">{t('adminSettings.address')}</Label>
                                <Input
                                    id="address"
                                    value={settings.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder={t('adminSettings.addressPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">{t('adminSettings.city')}</Label>
                                <Input
                                    id="city"
                                    value={settings.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder={t('adminSettings.cityPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">{t('adminSettings.stateProvince')}</Label>
                                <Input
                                    id="state"
                                    value={settings.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    placeholder={t('adminSettings.statePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country_code">{t('adminSettings.countryCode')}</Label>
                                <Input
                                    id="country_code"
                                    value={settings.country_code}
                                    onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                                    placeholder={t('adminSettings.countryCodePlaceholder')}
                                    maxLength={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timezone">{t('adminSettings.timezone')}</Label>
                                <Input
                                    id="timezone"
                                    value={settings.timezone}
                                    onChange={(e) => {
                                        setTimezoneManuallyEdited(true);
                                        handleChange('timezone', e.target.value);
                                    }}
                                    placeholder={t('adminSettings.timezonePlaceholder')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Map Integration Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.mapIntegration')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="google_maps_url">{t('adminSettings.googleMapsUrl')}</Label>
                                <Input
                                    id="google_maps_url"
                                    value={settings.google_maps_url}
                                    onChange={(e) => handleChange('google_maps_url', e.target.value)}
                                    placeholder={t('adminSettings.googleMapsPlaceholder')}
                                />
                                <p className="text-xs text-slate-500">
                                    {t('adminSettings.googleMapsHelp')}
                                </p>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="latitude">{t('adminSettings.latitude')}</Label>
                                    <Input
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        value={settings.latitude}
                                        onChange={(e) => handleChange('latitude', e.target.value)}
                                        placeholder="-16.5000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitude">{t('adminSettings.longitude')}</Label>
                                    <Input
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        value={settings.longitude}
                                        onChange={(e) => handleChange('longitude', e.target.value)}
                                        placeholder="-68.1500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">{t('adminSettings.coordinatesHelper')}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- BOOKING TAB --- */}
                <TabsContent value="booking" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.bookingConfiguration')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.bookingConfigurationDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="booking_buffer_minutes">{t('adminSettings.bufferTime')}</Label>
                                <Input
                                    id="booking_buffer_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.booking_buffer_minutes}
                                    onChange={(e) => handleChange('booking_buffer_minutes', e.target.value)}
                                    placeholder="10"
                                />
                                <p className="text-xs text-slate-500">
                                    Minimum time before a booking can be made
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="booking_time_granularity_minutes">{t('adminSettings.timeSlotInterval')}</Label>
                                <Input
                                    id="booking_time_granularity_minutes"
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={settings.booking_time_granularity_minutes}
                                    onChange={(e) => handleChange('booking_time_granularity_minutes', e.target.value)}
                                    placeholder="30"
                                />
                                <p className="text-xs text-slate-500">
                                    Frequency of available time slots (e.g., every 15, 30, 60 mins)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cancel_limit_minutes">{t('adminSettings.cancellationLimit')}</Label>
                                <Input
                                    id="cancel_limit_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.cancel_limit_minutes}
                                    onChange={(e) => handleChange('cancel_limit_minutes', e.target.value)}
                                    placeholder="120"
                                />
                                <p className="text-xs text-slate-500">
                                    Minutes before appointment customers can cancel (0 = always)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reschedule_limit_minutes">{t('adminSettings.rescheduleLimit')}</Label>
                                <Input
                                    id="reschedule_limit_minutes"
                                    type="number"
                                    min="0"
                                    value={settings.reschedule_limit_minutes}
                                    onChange={(e) => handleChange('reschedule_limit_minutes', e.target.value)}
                                    placeholder="120"
                                />
                                <p className="text-xs text-slate-500">
                                    Minutes before appointment customers can reschedule
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.autoApproveTimeOff')}</Label>
                                        <p className="text-sm text-slate-500">
                                            {t('adminSettings.autoApproveTimeOffDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.auto_approve_staff_time_off}
                                        onCheckedChange={(checked) => handleChange('auto_approve_staff_time_off', checked)}
                                    />
                                </div>

                                {/* Advance booking limits */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('adminSettings.maxAdvanceDays')}</Label>
                                        <p className="text-xs text-slate-500">{t('adminSettings.maxAdvanceDaysDesc')}</p>
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder={t('adminSettings.noLimit')}
                                            value={settings.max_advance_booking_days ?? ""}
                                            onChange={(e) => handleChange('max_advance_booking_days', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminSettings.minAdvanceHours')}</Label>
                                        <p className="text-xs text-slate-500">{t('adminSettings.minAdvanceHoursDesc')}</p>
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder={t('adminSettings.noLimit')}
                                            value={settings.min_advance_booking_hours ?? ""}
                                            onChange={(e) => handleChange('min_advance_booking_hours', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- PAYMENTS & NOTIFICATIONS TAB --- */}
                <TabsContent value="payments" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.paymentMethods')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.paymentMethodsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Cash Payment */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('adminSettings.allowCash')}</Label>
                                    <p className="text-sm text-slate-500">
                                        Allow customers to pay in person with cash
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.allow_cash_payment}
                                    onCheckedChange={(checked) => handleChange('allow_cash_payment', checked)}
                                />
                            </div>

                            {/* QR Payment */}
                            <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('adminSettings.allowQR')}</Label>
                                        <p className="text-sm text-slate-500">
                                            Allow customers to upload a payment proof
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.allow_qr_payment}
                                        onCheckedChange={(checked) => handleChange('allow_qr_payment', checked)}
                                    />
                                </div>

                                {settings.allow_qr_payment && (
                                    <div className="mt-4 border-t pt-4">
                                        <Label className="mb-2 block">{t('adminSettings.qrImage')}</Label>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Upload the QR code image your customers will scan to pay.
                                        </p>
                                        <div className="flex justify-start">
                                            <ImageUpload
                                                companyId={Number(companyId)}
                                                type="qr"
                                                autoUpload={false}
                                                currentUrl={selectedQR ? URL.createObjectURL(selectedQR) : (settings.qr_image_url || undefined)}
                                                onFileSelect={setSelectedQR}
                                                aspectRatio="1:1"
                                                className="w-full max-w-[250px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.notifications')}</CardTitle>
                            </div>
                            <CardDescription>{t('adminSettings.notificationsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!canUseNotifications && (
                                <PlanUpgradeNotice
                                    title={t("planEnforcement.featureLockedTitle")}
                                    message={t("planEnforcement.availableOnBusiness")}
                                    feature="TRANSACTIONAL_BOOKING_NOTIFICATIONS"
                                />
                            )}
                            <div className={`flex items-center justify-between rounded-lg border p-4 ${!canUseNotifications ? "opacity-50" : ""}`}>
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('adminSettings.emailNotifications')}</Label>
                                    <p className="text-sm text-slate-500">
                                        Send booking confirmations via email
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.send_email_notifications}
                                    onCheckedChange={(checked) => handleChange('send_email_notifications', checked)}
                                    disabled={!canUseNotifications}
                                />
                            </div>
                            <div className={`flex items-center justify-between rounded-lg border p-4 ${!canUseNotifications ? "opacity-50" : ""}`}>
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('adminSettings.whatsappNotifications')}</Label>
                                    <p className="text-sm text-slate-500">
                                        Send booking updates via WhatsApp (requires integration)
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.send_whatsapp_notifications}
                                    onCheckedChange={(checked) => handleChange('send_whatsapp_notifications', checked)}
                                    disabled={!canUseNotifications}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SOCIAL MEDIA TAB --- */}
                <TabsContent value="social" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.socialMediaLinks')}</CardTitle>
                            </div>
                            <CardDescription>
                                Add your social media profiles. These will appear in your shop&apos;s navbar and footer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SocialLinksForm
                                socialLinks={settings.social_links}
                                onChange={(links) => handleChange('social_links', links)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- LANGUAGE TAB --- */}
                <TabsContent value="language" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Languages className="h-5 w-5 text-slate-500" />
                                <CardTitle>{t('adminSettings.language')}</CardTitle>
                            </div>
                            <CardDescription>
                                {t('adminSettings.defaultLanguageDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 max-w-xs">
                                <Label htmlFor="default_language">{t('adminSettings.defaultLanguage')}</Label>
                                <Select
                                    value={settings.default_language}
                                    onValueChange={(value) => handleChange('default_language', value)}
                                >
                                    <SelectTrigger id="default_language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_LOCALES.map((locale) => (
                                            <SelectItem key={locale} value={locale}>
                                                {t(`language.${locale}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.planHistory')}</CardTitle>
                            <CardDescription>{t('adminSettings.subscriptionChanges')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscriptionSummary ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.currentPlan')}</p>
                                        <p className="text-sm font-semibold text-slate-900">{t(PLAN_LABEL_KEY[subscriptionSummary.plan] ?? 'adminSettings.planStarter')}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.billingCycle')}</p>
                                        <p className="text-sm font-semibold text-slate-900">{t(BILLING_LABEL_KEY[subscriptionSummary.billingCycle] ?? 'adminSettings.billingMonthly')}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.availableUntil')}</p>
                                        <p className="text-sm font-semibold text-slate-900">{formatDateTime(subscriptionSummary.availableUntil)}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.expirationStatus')}</p>
                                        <Badge className={subscriptionSummary.isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                                            {subscriptionSummary.isExpired ? t('adminSettings.expired') : t('adminSettings.active')}
                                        </Badge>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.pricePaid')}</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatPrice(subscriptionSummary.pricePaid, settings.currency)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminSettings.visibleInMarketplace')}</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {subscriptionSummary.isMarketplaceVisible ? t('superAdminShops.yes') : t('superAdminShops.no')}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminSettings.subscriptionChanges')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subscriptionError ? (
                                <p className="text-sm text-rose-600">{subscriptionError}</p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('adminSettings.changedAt')}</TableHead>
                                                <TableHead>{t('adminSettings.changedBy')}</TableHead>
                                                <TableHead>{t('adminSettings.plan')}</TableHead>
                                                <TableHead>{t('adminSettings.billingCycle')}</TableHead>
                                                <TableHead>{t('adminSettings.pricePaid')}</TableHead>
                                                <TableHead>{t('adminSettings.availableUntil')}</TableHead>
                                                <TableHead>{t('adminSettings.visibleInMarketplace')}</TableHead>
                                                <TableHead>{t('adminSettings.note')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subscriptionHistory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                                                        {t('adminSettings.noSubscriptionChanges')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                subscriptionHistory.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{formatDateTime(entry.changedAt)}</TableCell>
                                                        <TableCell>{entry.changedBy?.displayName || entry.changedBy?.email || t('adminSettings.systemActor')}</TableCell>
                                                        <TableCell>{formatChangePair(entry.previousPlan ? t(PLAN_LABEL_KEY[entry.previousPlan] ?? 'adminSettings.planStarter') : '—', t(PLAN_LABEL_KEY[entry.newPlan] ?? 'adminSettings.planStarter'))}</TableCell>
                                                        <TableCell>{formatChangePair(entry.previousBillingCycle ? t(BILLING_LABEL_KEY[entry.previousBillingCycle] ?? 'adminSettings.billingMonthly') : '—', t(BILLING_LABEL_KEY[entry.newBillingCycle] ?? 'adminSettings.billingMonthly'))}</TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                formatPrice(entry.previousPricePaid, settings.currency),
                                                                formatPrice(entry.newPricePaid, settings.currency),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                formatDateTime(entry.previousAvailableUntil),
                                                                formatDateTime(entry.newAvailableUntil),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatChangePair(
                                                                entry.previousMarketplaceVisible === null
                                                                    ? '—'
                                                                    : entry.previousMarketplaceVisible
                                                                        ? t('superAdminShops.yes')
                                                                        : t('superAdminShops.no'),
                                                                entry.newMarketplaceVisible ? t('superAdminShops.yes') : t('superAdminShops.no'),
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{entry.note || '—'}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <StickyFormActions
                onSave={handleSave}
                loading={saving}
                saveLabel={t('common.save')}
                loadingLabel={t('adminSettings.saving')}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-orange-500 hover:bg-orange-600 text-white"
            />
        </div>
    );
}
