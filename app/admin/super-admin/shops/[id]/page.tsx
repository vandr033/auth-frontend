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
import type { SuperAdminShop, CompanyType } from "@/types/super-admin";
import { notify } from "@/lib/notify";
import {
    LocationPicker,
    type LocationAutofillUpdate,
} from "@/components/admin/location/LocationPicker";

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
    latitude: string;
    longitude: string;
    company_type_id: string;
    is_active: boolean;
}

function parseNumberOrNull(value: string): number | null {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
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
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false);

    const getCompanyTypeName = (type: CompanyType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    // Fetch shop and company types
    const fetchData = useCallback(async () => {
        try {
            const [shopRes, typesRes] = await Promise.all([
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), { credentials: "include" }),
                fetch(getApiUrl("/api/super-admin/company-types"), { credentials: "include" }),
            ]);

            if (!shopRes.ok) throw new Error(t("superAdminShops.fetchShopError"));

            const shopData = await shopRes.json();
            const typesData = await typesRes.json().catch(() => ({ data: [] }));

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
                latitude: shopInfo.latitude?.toString() || "",
                longitude: shopInfo.longitude?.toString() || "",
                company_type_id: shopInfo.company_type_id?.toString() || "",
                is_active: shopInfo.is_active,
            });
            setCompanyTypes(typesData.data || []);
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminShops.loadShopError"));
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
        if (!formData) return;

        if (!formData.name.trim()) {
            await notify.warning(t("superAdminShops.shopNameRequired"));
            return;
        }
        if (!formData.phone.trim()) {
            await notify.warning(t("superAdminShops.phoneRequired"));
            return;
        }

        setSubmitting(true);

        try {
            const latitude = parseNumberOrNull(formData.latitude);
            const longitude = parseNumberOrNull(formData.longitude);
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
                latitude,
                longitude,
                company_type_id: parseInt(formData.company_type_id),
                is_active: formData.is_active,
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
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("superAdminShops.updateFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="ml-2 text-slate-600">{t("superAdminShops.loadingShop")}</span>
            </div>
        );
    }

    if (!shop || !formData) {
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
        <div className="space-y-6 max-w-2xl">
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
                        className="bg-violet-600 hover:bg-violet-700 text-white"
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

                        {/* Actions */}
                        <div className="hidden md:flex gap-4 pt-4 border-t">
                            <Link href="/admin/super-admin/shops" className="flex-1">
                                <Button type="button" variant="outline" className="w-full">
                                    {t("common.cancel")}
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-violet-600 hover:bg-violet-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t("superAdminShops.saving")}
                                    </>
                                ) : (
                                    t("adminBookings.saveChanges")
                                )}
                            </Button>
                        </div>
                        <StickyFormActions
                            type="submit"
                            loading={submitting}
                            saveLabel={t("adminBookings.saveChanges")}
                            loadingLabel={t("superAdminShops.saving")}
                            onCancel={() => router.push("/admin/super-admin/shops")}
                            cancelLabel={t("common.cancel")}
                            saveClassName="bg-violet-600 hover:bg-violet-700 text-white"
                        />
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
