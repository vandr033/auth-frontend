"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { getLocalizedText } from "@/lib/i18n/localized";
import type { BillingCycle, CompanyType, ShopPlan, SuperAdminShop } from "@/types/super-admin";
import type {
    ShopPendingProductRequestItem,
    ShopProductHistoryItem,
    ShopSubscriptionHistoryItem,
    ShopSubscriptionSnapshot,
} from "@/types/subscription-history";
import { notify } from "@/lib/notify";
import {
    LocationPicker,
    type LocationAutofillUpdate,
} from "@/components/admin/location/LocationPicker";
import { formatCurrencyAmount } from "@/lib/currency";
import { ProductConfigurationSection, formatProductHistoryValue } from "../components/ProductConfigurationSection";
import {
    buildCommercialPayload,
    deriveLegacyPlanCompatibility,
    getActiveCoreCount,
    hydrateProductConfig,
    type ProductConfigFormState,
} from "../lib/product-config";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface FormData {
    name: string;
    slug: string;
    phone_prefix: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country_code: string;
    timezone: string;
    currency: string;
    latitude: string;
    longitude: string;
    company_type_id: string;
    is_active: boolean;
    plan: ShopPlan;
    billingCycle: BillingCycle;
    availableUntil: string;
    pricePaid: string;
    isMarketplaceVisible: boolean;
    note: string;
}

function parseNumberOrNull(value: string): number | null {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseNonNegativeNumberOrNull(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
}

function toDateTimeLocalInput(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoDateTimeOrNull(value: string): string | null {
    if (!value.trim()) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

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

export default function EditShopPage() {
    const t = useT();
    const { locale } = useI18n();
    const router = useRouter();
    const params = useParams();
    const shopIdParam = params?.id;
    const shopId = Array.isArray(shopIdParam) ? shopIdParam[0] : shopIdParam ?? "";
    const { isAuthenticated, isSuperAdmin, loading: authLoading, refreshSession } = useAdminAuth();

    const [shop, setShop] = useState<SuperAdminShop | null>(null);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [productConfig, setProductConfig] = useState<ProductConfigFormState | null>(null);
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [subscriptionSummary, setSubscriptionSummary] = useState<ShopSubscriptionSnapshot | null>(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState<ShopSubscriptionHistoryItem[]>([]);
    const [productHistory, setProductHistory] = useState<ShopProductHistoryItem[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ShopPendingProductRequestItem[]>([]);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false);
    const companyBillingCycle = formData?.billingCycle;
    const companyAvailableUntil = formData?.availableUntil;
    const companyCurrency = formData?.currency;

    const getCompanyTypeName = (type: CompanyType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    // Fetch shop and company types
    const fetchData = useCallback(async () => {
        try {
            const [shopRes, typesRes, historyRes] = await Promise.all([
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), { credentials: "include" }),
                fetch(getApiUrl("/api/super-admin/company-types"), { credentials: "include" }),
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}/subscription-history`), {
                    credentials: "include",
                }),
            ]);

            if (!shopRes.ok) throw new Error(t("superAdminShops.fetchShopError"));

            const shopData = await shopRes.json();
            const typesData = await typesRes.json().catch(() => ({ data: [] }));
            const historyData = historyRes.ok
                ? await historyRes.json()
                : null;

            const shopInfo: SuperAdminShop = shopData.data || shopData;
            setShop(shopInfo);
            setFormData({
                name: shopInfo.name || "",
                slug: shopInfo.slug || "",
                phone_prefix: shopInfo.phone_prefix || "591",
                phone: shopInfo.phone || "",
                email: shopInfo.email || "",
                address: shopInfo.address || "",
                city: shopInfo.city || "",
                state: shopInfo.state || "",
                country_code: shopInfo.country_code || "BO",
                timezone: shopInfo.timezone || "America/La_Paz",
                currency: shopInfo.currency || "Bs.",
                latitude: shopInfo.latitude?.toString() || "",
                longitude: shopInfo.longitude?.toString() || "",
                company_type_id: shopInfo.company_type_id?.toString() || "",
                is_active: shopInfo.is_active,
                plan: shopInfo.plan || "BUSINESS",
                billingCycle: shopInfo.billingCycle || "MONTHLY",
                availableUntil: toDateTimeLocalInput(shopInfo.availableUntil || "2027-03-12T23:59:59.000Z"),
                pricePaid: shopInfo.pricePaid === null || shopInfo.pricePaid === undefined
                    ? ""
                    : String(shopInfo.pricePaid),
                isMarketplaceVisible: shopInfo.isMarketplaceVisible ?? true,
                note: "",
            });
            setCompanyTypes(typesData.data || []);

            if (historyData?.data) {
                setSubscriptionSummary(historyData.data.company ?? null);
                setSubscriptionHistory(historyData.data.history ?? []);
                setProductHistory(historyData.data.productHistory ?? []);
                setPendingRequests(historyData.data.pendingRequests ?? []);
                setProductConfig(
                    hydrateProductConfig({
                        billingCycle: shopInfo.billingCycle || "MONTHLY",
                        availableUntil: toDateTimeLocalInput(shopInfo.availableUntil || "2027-03-12T23:59:59.000Z"),
                        currency: shopInfo.currency || "Bs.",
                        activeProducts: historyData.data.company?.activeProducts ?? shopInfo.activeProducts,
                        requestedProducts: historyData.data.company?.requestedProducts ?? shopInfo.requestedProducts,
                    }),
                );
                setHistoryError(null);
            } else {
                setSubscriptionSummary(null);
                setSubscriptionHistory([]);
                setProductHistory([]);
                setPendingRequests([]);
                setProductConfig(
                    hydrateProductConfig({
                        billingCycle: shopInfo.billingCycle || "MONTHLY",
                        availableUntil: toDateTimeLocalInput(shopInfo.availableUntil || "2027-03-12T23:59:59.000Z"),
                        currency: shopInfo.currency || "Bs.",
                        activeProducts: shopInfo.activeProducts,
                        requestedProducts: shopInfo.requestedProducts,
                    }),
                );
                setHistoryError(t("superAdminShops.historyLoadFailed"));
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminShops.loadShopError"));
            setHistoryError(t("superAdminShops.historyLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [shopId, t]);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin && shopId) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, shopId, fetchData]);

    const handleLocationAutofill = useCallback(
        (update: LocationAutofillUpdate) => {
            setFormData((prev) => {
                if (!prev) return prev;
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
        },
        [timezoneManuallyEdited],
    );

    useEffect(() => {
        if (!companyBillingCycle || !companyAvailableUntil || !companyCurrency) return;

        setProductConfig((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            for (const productCode of Object.keys(next) as Array<keyof typeof next>) {
                next[productCode] = {
                    ...next[productCode],
                    billingCycle: next[productCode].billingCycle || companyBillingCycle,
                    availableUntil: next[productCode].availableUntil || companyAvailableUntil,
                    currency: next[productCode].currency || companyCurrency,
                };
            }
            return next;
        });
    }, [companyAvailableUntil, companyBillingCycle, companyCurrency]);

    // Handle impersonate
    const handleImpersonate = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/super-admin/impersonate/${shopId}`), {
                method: "POST",
                credentials: "include",
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || t("superAdminShops.impersonateFailed"));
            }
            await refreshSession();
            router.push("/admin/dashboard");
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("superAdminShops.impersonateFailed"));
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || !productConfig) return;

        if (!formData.name.trim()) {
            await notify.warning(t("superAdminShops.shopNameRequired"));
            return;
        }
        if (!formData.phone.trim()) {
            await notify.warning(t("superAdminShops.phoneRequired"));
            return;
        }
        if (getActiveCoreCount(productConfig) === 0) {
            await notify.warning("Select at least one active core product.");
            return;
        }
        if (!formData.availableUntil) {
            await notify.warning("Available until is required.");
            return;
        }

        const availableUntilIso = toIsoDateTimeOrNull(formData.availableUntil);
        if (!availableUntilIso) {
            await notify.warning("Available until must be a valid date and time.");
            return;
        }

        if (formData.pricePaid.trim().length > 0 && parseNonNegativeNumberOrNull(formData.pricePaid) === null) {
            await notify.warning("Price paid must be a non-negative number.");
            return;
        }

        const normalizedCurrency = formData.currency.trim();
        if (!normalizedCurrency) {
            await notify.warning(t("superAdminShops.currencyRequired"));
            return;
        }
        if (normalizedCurrency.length > 3) {
            await notify.warning(t("superAdminShops.currencyInvalid"));
            return;
        }

        setSubmitting(true);

        try {
            const latitude = parseNumberOrNull(formData.latitude);
            const longitude = parseNumberOrNull(formData.longitude);
            const pricePaid = parseNonNegativeNumberOrNull(formData.pricePaid);
            const commercialPayload = buildCommercialPayload(productConfig);
            const legacyPlanCompatibility = deriveLegacyPlanCompatibility(productConfig);
            const payload = {
                name: formData.name.trim(),
                slug: formData.slug.trim(),
                phone_prefix: formData.phone_prefix,
                phone: formData.phone.trim(),
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                city: formData.city.trim() || null,
                state: formData.state.trim() || null,
                country_code: formData.country_code || null,
                timezone: formData.timezone,
                currency: normalizedCurrency,
                latitude,
                longitude,
                company_type_id: parseInt(formData.company_type_id),
                is_active: formData.is_active,
                plan: legacyPlanCompatibility,
                billingCycle: formData.billingCycle,
                availableUntil: availableUntilIso,
                pricePaid,
                isMarketplaceVisible: formData.isMarketplaceVisible,
                activeProducts: commercialPayload.activeProducts,
                requestedProducts: commercialPayload.requestedProducts,
                note: formData.note.trim() || undefined,
            };
            // TODO(super-admin-shops): Persist optional map metadata once backend supports it:
            // formattedAddress, mapProvider, mapboxPlaceId, locationSource.

            const response = await fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminShops.updateFailed"));
            }

            await notify.success(t("superAdminShops.updatedSuccess"));
            await fetchData();
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("superAdminShops.updateFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
                <span className="ml-2 text-slate-600">{t("superAdminShops.loadingShop")}</span>
            </div>
        );
    }

    if (!shop || !formData || !productConfig) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">{t("superAdminShops.shopNotFound")}</p>
                <Link href="/admin/super-admin/shops">
                    <Button variant="outline" className="mt-4">
                        {t("superAdminShops.backToShops")}
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/super-admin/shops">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("superAdminShops.backToShops")}
                        </Button>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleImpersonate}
                        className="bg-admin-brand hover:bg-admin-brand-hover text-white"
                    >
                        <LogIn className="h-4 w-4 mr-2" />
                        {t("superAdminShops.enterShop")}
                    </Button>
                    <Link href={`/admin/super-admin/shops/${shopId}/users`}>
                        <Button variant="outline">
                            <Users className="h-4 w-4 mr-2" />
                            {t("superAdminShops.manageUsers")}
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("superAdminShops.editShopTitle", { name: shop.name })}</CardTitle>
                    <CardDescription>
                        {t("superAdminShops.editDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                            <div>
                                <Label>{t("superAdminShops.shopStatus")}</Label>
                                <p className="text-sm text-slate-500">
                                    {formData.is_active ? t("superAdminShops.shopVisible") : t("superAdminShops.shopHidden")}
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>

                        {/* Basic Info */}
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("superAdminShops.shopNameRequiredLabel")}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t("superAdminShops.shopNamePlaceholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">{t("superAdminShops.urlSlug")}</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder={t("superAdminShops.slugPlaceholder")}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">
                                    {t("superAdminShops.shopUrlShort", { slug: formData.slug })}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_type">{t("superAdminShops.companyType")}</Label>
                                <Select
                                    value={formData.company_type_id}
                                    onValueChange={(value) => setFormData({ ...formData, company_type_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("superAdminShops.selectType")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {getCompanyTypeName(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Commercial Settings */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">Commercial settings</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="billing_cycle">Billing cycle</Label>
                                    <Select
                                        value={formData.billingCycle}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, billingCycle: value as BillingCycle })
                                        }
                                    >
                                        <SelectTrigger id="billing_cycle">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                                            <SelectItem value="YEARLY">YEARLY</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="currency">{t("superAdminShops.currencyRequiredLabel")}</Label>
                                    <Input
                                        id="currency"
                                        value={formData.currency}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                currency: e.target.value.slice(0, 3),
                                            })
                                        }
                                        placeholder="Bs."
                                        maxLength={3}
                                    />
                                    <p className="text-xs text-slate-500">{t("superAdminShops.currencyCodeHint")}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="available_until">Available until</Label>
                                    <Input
                                        id="available_until"
                                        type="datetime-local"
                                        value={formData.availableUntil}
                                        onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500">
                                        After this date, the shop becomes inactive until reactivated.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price_paid">Price paid</Label>
                                    <Input
                                        id="price_paid"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.pricePaid}
                                        onChange={(e) => setFormData({ ...formData, pricePaid: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Legacy plan compatibility</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {deriveLegacyPlanCompatibility(productConfig)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Compatibility only. Active products and add-ons below are the real source of truth.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border px-3 py-2 md:col-span-2">
                                    <div>
                                        <p className="text-sm font-medium">Visible in marketplace</p>
                                        <p className="text-xs text-slate-500">
                                            If disabled, the public page still works by direct link, but the shop will not appear in marketplace discovery.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.isMarketplaceVisible}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, isMarketplaceVisible: checked })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <ProductConfigurationSection
                            billingCycle={formData.billingCycle}
                            currency={formData.currency}
                            availableUntil={formData.availableUntil}
                            value={productConfig}
                            onChange={setProductConfig}
                            priceOverride={formData.pricePaid}
                            showLegacyMetricsBase={Boolean(
                                subscriptionSummary?.activeProducts.some((product) => product.tierCode === "METRICAS_BASE"),
                            )}
                            validationError={getActiveCoreCount(productConfig) === 0 ? "At least one core product is required." : null}
                        />

                        {/* Contact Info */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">{t("superAdminShops.contactInformation")}</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="phone_prefix">{t("superAdminShops.countryCode")}</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={formData.phone_prefix}
                                        onChange={(e) => setFormData({ ...formData, phone_prefix: e.target.value })}
                                        placeholder="591"
                                        className="w-24"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t("superAdminShops.phoneRequiredLabel")}</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label htmlFor="email">{t("adminSettings.email")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t("superAdminShops.emailPlaceholder")}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">{t("superAdminShops.location")}</h3>
                            <div className="grid gap-4">
                                <LocationPicker
                                    value={{
                                        address: formData.address,
                                        city: formData.city,
                                        stateRegion: formData.state,
                                        countryCode: formData.country_code,
                                        timezone: formData.timezone,
                                        latitude: formData.latitude,
                                        longitude: formData.longitude,
                                    }}
                                    text={{
                                        searchLabel: t("superAdminShops.searchLocation"),
                                        searchPlaceholder: t("superAdminShops.searchLocationPlaceholder"),
                                        helperText: t("superAdminShops.searchLocationHelper"),
                                        searchLoadingText: t("superAdminShops.locationSearchLoading"),
                                        searchErrorText: t("superAdminShops.locationSearchError"),
                                        noResultsText: t("superAdminShops.locationSearchNoResults"),
                                        reverseGeocodeLoadingText: t("superAdminShops.reverseGeocodeLoading"),
                                        reverseGeocodeErrorText: t("superAdminShops.reverseGeocodeError"),
                                        mapUnavailableText: t("superAdminShops.mapUnavailable"),
                                        missingTokenText: t("superAdminShops.mapTokenMissing"),
                                    }}
                                    onLocationAutofill={handleLocationAutofill}
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="address">{t("adminSettings.address")}</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder={t("superAdminShops.addressPlaceholder")}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">{t("adminSettings.city")}</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder={t("superAdminShops.cityPlaceholder")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">{t("superAdminShops.stateRegion")}</Label>
                                        <Input
                                            id="state"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            placeholder={t("superAdminShops.statePlaceholder")}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="country_code">{t("superAdminShops.countryCode")}</Label>
                                        <Input
                                            id="country_code"
                                            value={formData.country_code}
                                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                                            placeholder={t("superAdminShops.countryCodePlaceholder")}
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">{t("superAdminShops.timezone")}</Label>
                                        <Select
                                            value={formData.timezone}
                                            onValueChange={(value) => {
                                                setTimezoneManuallyEdited(true);
                                                setFormData({ ...formData, timezone: value });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="America/La_Paz">{t("superAdminShops.timezoneBolivia")}</SelectItem>
                                                <SelectItem value="America/Lima">{t("superAdminShops.timezonePeru")}</SelectItem>
                                                <SelectItem value="America/Santiago">{t("superAdminShops.timezoneChile")}</SelectItem>
                                                <SelectItem value="America/Buenos_Aires">{t("superAdminShops.timezoneArgentina")}</SelectItem>
                                                <SelectItem value="America/Sao_Paulo">{t("superAdminShops.timezoneBrazil")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">{t("adminSettings.latitude")}</Label>
                                        <Input
                                            id="latitude"
                                            value={formData.latitude}
                                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                            placeholder="-17.783327"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">{t("adminSettings.longitude")}</Label>
                                        <Input
                                            id="longitude"
                                            value={formData.longitude}
                                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                            placeholder="-63.182140"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">{t("superAdminShops.coordinatesHelper")}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">Internal notes</h3>
                            <div className="space-y-2">
                                <Label htmlFor="note">Change note</Label>
                                <textarea
                                    id="note"
                                    value={formData.note}
                                    onChange={(event) => setFormData({ ...formData, note: event.target.value.slice(0, 500) })}
                                    placeholder="Document why this commercial change is being made"
                                    className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20"
                                />
                                <p className="text-xs text-slate-500">
                                    Saved into product and subscription history for future admin review.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <StickyFormActions
                            type="submit"
                            loading={submitting}
                            saveLabel={t("adminBookings.saveChanges")}
                            loadingLabel={t("superAdminShops.saving")}
                            onCancel={() => router.push("/admin/super-admin/shops")}
                            cancelLabel={t("common.cancel")}
                            saveClassName="bg-admin-brand hover:bg-admin-brand-hover text-white"
                        />
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("superAdminShops.planHistory")}</CardTitle>
                    <CardDescription>Vista comercial modular con compatibilidad legacy preservada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {subscriptionSummary ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Active products</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {subscriptionSummary.activeProducts
                                            .filter((product) => product.isCoreProduct)
                                            .map((product) => product.tierName)
                                            .join(", ") || "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Active add-ons</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {subscriptionSummary.activeProducts
                                            .filter((product) => !product.isCoreProduct)
                                            .map((product) => product.tierName)
                                            .join(", ") || "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Pending requests</p>
                                    <p className="text-sm font-semibold text-slate-900">{pendingRequests.length}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Legacy compatibility</p>
                                    <p className="text-sm font-semibold text-slate-900">{subscriptionSummary.legacyPlanCompatibility}</p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t("superAdminShops.billingCycle")}</p>
                                    <p className="text-sm font-semibold text-slate-900">{subscriptionSummary.billingCycle}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t("superAdminShops.availableUntil")}</p>
                                    <p className="text-sm font-semibold text-slate-900">{formatDateTime(subscriptionSummary.availableUntil)}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t("superAdminShops.expirationStatus")}</p>
                                    <Badge className={subscriptionSummary.isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                                        {subscriptionSummary.isExpired ? t("superAdminShops.expired") : t("superAdminShops.active")}
                                    </Badge>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t("superAdminShops.pricePaid")}</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {formatPrice(subscriptionSummary.pricePaid, formData.currency)}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>{t("superAdminShops.billingCycle")}</TableHead>
                                            <TableHead>{t("superAdminShops.availableUntil")}</TableHead>
                                            <TableHead>{t("superAdminShops.pricePaid")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subscriptionSummary.activeProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                                                    No active products yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            subscriptionSummary.activeProducts.map((product) => (
                                                <TableRow key={`${product.productCode}-${product.tierCode}`}>
                                                    <TableCell>{product.productName}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span>{product.tierName}</span>
                                                            <Badge variant="secondary">
                                                                {product.isCoreProduct ? "Core" : "Add-on"}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{product.billingCycle}</TableCell>
                                                    <TableCell>{formatDateTime(product.availableUntil)}</TableCell>
                                                    <TableCell>{formatPrice(product.pricePaid, product.currency)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pending requests</h3>
                            <p className="text-sm text-slate-500">
                                Products the company has requested but still needs admin approval.
                            </p>
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Requested at</TableHead>
                                        <TableHead>Requested by</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Tier</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Message</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-6 text-center text-slate-500">
                                                No pending requests.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingRequests.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                                                <TableCell>{entry.requestedBy?.displayName || entry.requestedBy?.email || "—"}</TableCell>
                                                <TableCell>{entry.productName}</TableCell>
                                                <TableCell>{entry.tierName}</TableCell>
                                                <TableCell>{entry.source}</TableCell>
                                                <TableCell>{entry.message || "—"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {historyError ? (
                        <p className="text-sm text-rose-600">{historyError}</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("superAdminShops.changedAt")}</TableHead>
                                        <TableHead>{t("superAdminShops.changedBy")}</TableHead>
                                        <TableHead>{t("superAdminShops.plan")}</TableHead>
                                        <TableHead>{t("superAdminShops.billingCycle")}</TableHead>
                                        <TableHead>{t("superAdminShops.pricePaid")}</TableHead>
                                        <TableHead>{t("superAdminShops.availableUntil")}</TableHead>
                                        <TableHead>{t("superAdminShops.visibleInMarketplace")}</TableHead>
                                        <TableHead>{t("superAdminShops.note")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subscriptionHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                                                {t("superAdminShops.noSubscriptionChanges")}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        subscriptionHistory.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{formatDateTime(entry.changedAt)}</TableCell>
                                                <TableCell>{entry.changedBy?.displayName || entry.changedBy?.email || t("superAdminShops.systemActor")}</TableCell>
                                                <TableCell>
                                                    {formatChangePair(entry.previousPlan ?? "—", entry.newPlan)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatChangePair(entry.previousBillingCycle ?? "—", entry.newBillingCycle)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatChangePair(
                                                        formatPrice(entry.previousPricePaid, formData.currency),
                                                        formatPrice(entry.newPricePaid, formData.currency),
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatChangePair(formatDateTime(entry.previousAvailableUntil), formatDateTime(entry.newAvailableUntil))}
                                                </TableCell>
                                                <TableCell>
                                                    {formatChangePair(
                                                        entry.previousMarketplaceVisible === null
                                                            ? "—"
                                                            : entry.previousMarketplaceVisible
                                                                ? t("superAdminShops.yes")
                                                                : t("superAdminShops.no"),
                                                        entry.newMarketplaceVisible ? t("superAdminShops.yes") : t("superAdminShops.no"),
                                                    )}
                                                </TableCell>
                                                <TableCell>{entry.note || "—"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="space-y-3 pt-4">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Product history</h3>
                            <p className="text-sm text-slate-500">
                                Additions, removals, upgrades, downgrades, requests, and product-level extensions.
                            </p>
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Changed at</TableHead>
                                        <TableHead>Changed by</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Previous</TableHead>
                                        <TableHead>New</TableHead>
                                        <TableHead>Note</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-6 text-center text-slate-500">
                                                No product changes yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        productHistory.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                                                <TableCell>{entry.actor?.displayName || entry.actor?.email || t("superAdminShops.systemActor")}</TableCell>
                                                <TableCell>{entry.action}</TableCell>
                                                <TableCell>{formatProductHistoryValue(entry.previousValue)}</TableCell>
                                                <TableCell>{formatProductHistoryValue(entry.newValue)}</TableCell>
                                                <TableCell>{entry.note || "—"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
