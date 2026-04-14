"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { getLocalizedText } from "@/lib/i18n/localized";
import type { BillingCycle, CompanyType, ShopPlan } from "@/types/super-admin";
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
    currency: string;
    latitude: string;
    longitude: string;
    company_type_id: string;
    plan: ShopPlan;
    billingCycle: BillingCycle;
    availableUntil: string;
    pricePaid: string;
    isMarketplaceVisible: boolean;
    reservations_enabled: boolean;
    store_enabled: boolean;
}

interface OwnerFormData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_prefix: string;
    phone: string;
    display_name: string;
    is_bookable: boolean;
}

type OwnerMode = "existing" | "new";

interface ExistingOwnerUser {
    id: string;
    email: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    phone_prefix: string | null;
    phone: string | null;
    is_active: boolean;
    memberships?: Array<{
        role: string;
        company: {
            id: number;
            name: string;
            slug: string;
        };
    }>;
}

const initialFormData: FormData = {
    name: "",
    slug: "",
    phone_prefix: "591",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country_code: "BO",
    timezone: "America/La_Paz",
    currency: "Bs.",
    latitude: "",
    longitude: "",
    company_type_id: "",
    plan: "BUSINESS",
    billingCycle: "MONTHLY",
    availableUntil: toDateTimeLocalInput("2027-03-12T23:59:59.000Z"),
    pricePaid: "",
    isMarketplaceVisible: true,
    reservations_enabled: true,
    store_enabled: false,
};

function parseNumberOrUndefined(value: string): number | undefined {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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

const initialOwnerFormData: OwnerFormData = {
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_prefix: "591",
    phone: "",
    display_name: "",
    is_bookable: false,
};

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export default function NewShopPage() {
    const t = useT();
    const { locale } = useI18n();
    const router = useRouter();
    const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAdminAuth();

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [ownerData, setOwnerData] = useState<OwnerFormData>(initialOwnerFormData);
    const [ownerMode, setOwnerMode] = useState<OwnerMode>("existing");
    const [ownerSearch, setOwnerSearch] = useState("");
    const [ownerSearchResults, setOwnerSearchResults] = useState<ExistingOwnerUser[]>([]);
    const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
    const [selectedExistingOwner, setSelectedExistingOwner] = useState<ExistingOwnerUser | null>(null);
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

    const getExistingOwnerDisplayName = (user: ExistingOwnerUser): string => {
        const fromNames = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
        return fromNames || user.name || user.email;
    };

    // Fetch company types
    const fetchCompanyTypes = useCallback(async () => {
        try {
            const response = await fetch(getApiUrl("/api/super-admin/company-types"), {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setCompanyTypes(data.data || []);
            }
        } catch {
            // Silently fail - will show empty dropdown
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchCompanyTypes();
        }
    }, [isAuthenticated, isSuperAdmin, fetchCompanyTypes]);

    useEffect(() => {
        if (ownerMode !== "existing") {
            setOwnerSearchLoading(false);
            return;
        }

        const term = ownerSearch.trim();
        if (term.length < 2) {
            setOwnerSearchResults([]);
            setOwnerSearchLoading(false);
            return;
        }

        let cancelled = false;
        setOwnerSearchLoading(true);

        const timeoutId = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await fetch(
                        getApiUrl(`/api/super-admin/users/search?q=${encodeURIComponent(term)}&limit=10`),
                        { credentials: "include" },
                    );

                    if (!response.ok) {
                        throw new Error(t("superAdminShops.ownerSearchFailed"));
                    }

                    const data = await response.json();
                    if (!cancelled) {
                        setOwnerSearchResults(Array.isArray(data?.data) ? data.data : []);
                    }
                } catch {
                    if (!cancelled) {
                        setOwnerSearchResults([]);
                    }
                } finally {
                    if (!cancelled) {
                        setOwnerSearchLoading(false);
                    }
                }
            })();
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [ownerMode, ownerSearch, t]);

    // Update slug when name changes
    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
        });
    };

    const handleLocationAutofill = useCallback(
        (update: LocationAutofillUpdate) => {
            setFormData((prev) => {
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

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            await notify.warning(t("superAdminShops.shopNameRequired"));
            return;
        }
        if (!formData.phone.trim()) {
            await notify.warning(t("superAdminShops.phoneRequired"));
            return;
        }
        if (!formData.company_type_id) {
            await notify.warning(t("superAdminShops.companyTypeRequired"));
            return;
        }
        if (!formData.availableUntil) {
            await notify.warning("Available until is required.");
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

        const availableUntilIso = toIsoDateTimeOrNull(formData.availableUntil);
        if (!availableUntilIso) {
            await notify.warning("Available until must be a valid date and time.");
            return;
        }

        if (formData.pricePaid.trim().length > 0 && parseNonNegativeNumberOrNull(formData.pricePaid) === null) {
            await notify.warning("Price paid must be a non-negative number.");
            return;
        }
        if (!formData.reservations_enabled && !formData.store_enabled) {
            await notify.warning("Enable at least one module for this company.");
            return;
        }

        const ownerEmail = ownerData.email.trim().toLowerCase();
        const ownerPassword = ownerData.password.trim();
        const ownerPhone = ownerData.phone.replace(/\D/g, "");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (ownerMode === "existing") {
            if (!selectedExistingOwner) {
                await notify.warning(t("superAdminShops.ownerSelectRequired"));
                return;
            }
        } else {
            if (!ownerEmail) {
                await notify.warning(t("superAdminShops.ownerEmailRequired"));
                return;
            }
            if (!emailRegex.test(ownerEmail)) {
                await notify.warning(t("superAdminShops.ownerEmailInvalid"));
                return;
            }
            if (ownerPassword.length < 8) {
                await notify.warning(t("superAdminShops.ownerPasswordMin"));
                return;
            }
            if (!ownerPhone) {
                await notify.warning(t("superAdminShops.ownerPhoneRequired"));
                return;
            }
        }

        setSubmitting(true);

        try {
            const ownerPhone = ownerData.phone.replace(/\D/g, "");
            const ownerPhonePrefix = ownerData.phone_prefix.trim();
            const latitude = parseNumberOrUndefined(formData.latitude);
            const longitude = parseNumberOrUndefined(formData.longitude);
            const pricePaid = parseNonNegativeNumberOrNull(formData.pricePaid);

            const ownerPayload =
                ownerMode === "existing" && selectedExistingOwner
                    ? {
                        existingUserId: selectedExistingOwner.id,
                        display_name: ownerData.display_name.trim() || undefined,
                        is_bookable: ownerData.is_bookable,
                    }
                    : {
                        email: ownerData.email.trim().toLowerCase(),
                        password: ownerData.password.trim(),
                        first_name: ownerData.first_name.trim() || undefined,
                        last_name: ownerData.last_name.trim() || undefined,
                        phone_prefix: ownerPhonePrefix || "591",
                        phone: ownerPhone,
                        display_name: ownerData.display_name.trim() || undefined,
                        is_bookable: ownerData.is_bookable,
                    };

            const payload = {
                name: formData.name.trim(),
                slug: formData.slug.trim() || undefined,
                phone_prefix: formData.phone_prefix,
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                address: formData.address.trim() || undefined,
                city: formData.city.trim() || undefined,
                state: formData.state.trim() || undefined,
                country_code: formData.country_code || undefined,
                timezone: formData.timezone || "America/La_Paz",
                currency: normalizedCurrency,
                latitude,
                longitude,
                company_type_id: parseInt(formData.company_type_id),
                plan: formData.plan,
                billingCycle: formData.billingCycle,
                availableUntil: availableUntilIso,
                pricePaid,
                isMarketplaceVisible: formData.isMarketplaceVisible,
                reservations_enabled: formData.reservations_enabled,
                store_enabled: formData.store_enabled,
                owner: ownerPayload,
            };
            // TODO(super-admin-shops): Persist optional map metadata once backend supports it:
            // formattedAddress, mapProvider, mapboxPlaceId, locationSource.

            const response = await fetch(getApiUrl("/api/super-admin/shops"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminShops.createFailed"));
            }

            router.push("/admin/super-admin/shops");
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("superAdminShops.createFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <span className="ml-2 text-slate-600">{t("common.loading")}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/super-admin/shops">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("superAdminShops.backToShops")}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("superAdminShops.createNewShop")}</CardTitle>
                    <CardDescription>
                        {t("superAdminShops.createDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("superAdminShops.shopNameRequiredLabel")}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
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
                                    {t("superAdminShops.shopUrl", { slug: formData.slug || t("superAdminShops.yourShop") })}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_type">{t("superAdminShops.companyTypeRequiredLabel")}</Label>
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
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="plan">Plan</Label>
                                    <Select
                                        value={formData.plan}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, plan: value as ShopPlan })
                                        }
                                    >
                                        <SelectTrigger id="plan">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STARTER">STARTER</SelectItem>
                                            <SelectItem value="BUSINESS">BUSINESS</SelectItem>
                                            <SelectItem value="PRO">PRO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

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

                                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
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

                                <div className="rounded-lg border p-4">
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-slate-900">Company modules</p>
                                        <p className="text-xs text-slate-500">
                                            Control whether this company can use reservations, the store, or both.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">Reservations module</p>
                                                <p className="text-xs text-slate-500">Bookings, services, availability, events, and classes.</p>
                                            </div>
                                            <Switch
                                                checked={formData.reservations_enabled}
                                                onCheckedChange={(checked) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        reservations_enabled: checked,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">Store module</p>
                                                <p className="text-xs text-slate-500">Catalog, storefront, checkout, and order management.</p>
                                            </div>
                                            <Switch
                                                checked={formData.store_enabled}
                                                onCheckedChange={(checked) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        store_enabled: checked,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
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
                                            onChange={(e) =>
                                                setFormData({ ...formData, country_code: e.target.value.toUpperCase() })
                                            }
                                            placeholder={t("superAdminShops.countryCodePlaceholder")}
                                            maxLength={2}
                                            className="uppercase"
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

                        {/* Owner Profile */}
                        <div className="border-t pt-4 space-y-4">
                            <div>
                                <h3 className="font-medium">{t("superAdminShops.ownerProfileSection")}</h3>
                                <p className="text-sm text-slate-500">{t("superAdminShops.ownerProfileSectionHint")}</p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant={ownerMode === "existing" ? "default" : "outline"}
                                    onClick={() => setOwnerMode("existing")}
                                    className={ownerMode === "existing" ? "bg-brand hover:bg-brand-hover text-white" : ""}
                                >
                                    {t("superAdminShops.ownerUseExisting")}
                                </Button>
                                <Button
                                    type="button"
                                    variant={ownerMode === "new" ? "default" : "outline"}
                                    onClick={() => setOwnerMode("new")}
                                    className={ownerMode === "new" ? "bg-brand hover:bg-brand-hover text-white" : ""}
                                >
                                    {t("superAdminShops.ownerCreateNew")}
                                </Button>
                            </div>

                            <div className="grid gap-4">
                                {ownerMode === "existing" ? (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="owner_search">{t("superAdminShops.ownerSearchLabel")}</Label>
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Input
                                                    id="owner_search"
                                                    value={ownerSearch}
                                                    onChange={(e) => setOwnerSearch(e.target.value)}
                                                    placeholder={t("superAdminShops.ownerSearchPlaceholder")}
                                                    className="pl-9"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">{t("superAdminShops.ownerSearchHint")}</p>
                                        </div>

                                        {ownerSearch.trim().length > 0 && ownerSearch.trim().length < 2 ? (
                                            <p className="text-xs text-amber-700">{t("superAdminShops.ownerSearchMinChars")}</p>
                                        ) : null}

                                        {ownerSearchLoading ? (
                                            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t("superAdminShops.ownerSearching")}
                                            </div>
                                        ) : null}

                                        {!ownerSearchLoading && ownerSearch.trim().length >= 2 ? (
                                            ownerSearchResults.length > 0 ? (
                                                <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
                                                    {ownerSearchResults.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => setSelectedExistingOwner(user)}
                                                            className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-slate-900">
                                                                    {getExistingOwnerDisplayName(user)}
                                                                </p>
                                                                <p className="truncate text-xs text-slate-600">{user.email}</p>
                                                                {user.phone ? (
                                                                    <p className="truncate text-xs text-slate-500">
                                                                        +{user.phone_prefix || "591"} {user.phone}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            <span className="text-xs text-brand">{t("superAdminShops.ownerSelectThisUser")}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">{t("superAdminShops.ownerNoResults")}</p>
                                            )
                                        ) : null}

                                        {selectedExistingOwner ? (
                                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                                    {t("superAdminShops.ownerSelected")}
                                                </p>
                                                <p className="text-sm font-semibold text-emerald-900">
                                                    {getExistingOwnerDisplayName(selectedExistingOwner)}
                                                </p>
                                                <p className="text-xs text-emerald-800">{selectedExistingOwner.email}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="owner_email">{t("superAdminShops.emailRequiredLabel")}</Label>
                                                <Input
                                                    id="owner_email"
                                                    type="email"
                                                    value={ownerData.email}
                                                    onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                                                    placeholder={t("superAdminShops.userEmailPlaceholder")}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="owner_password">{t("superAdminShops.tempPasswordRequiredLabel")}</Label>
                                                <Input
                                                    id="owner_password"
                                                    type="password"
                                                    value={ownerData.password}
                                                    onChange={(e) => setOwnerData({ ...ownerData, password: e.target.value })}
                                                    placeholder={t("superAdminShops.passwordPlaceholder")}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="owner_first_name">{t("superAdminShops.firstName")}</Label>
                                                <Input
                                                    id="owner_first_name"
                                                    value={ownerData.first_name}
                                                    onChange={(e) => setOwnerData({ ...ownerData, first_name: e.target.value })}
                                                    placeholder={t("superAdminShops.firstNamePlaceholder")}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="owner_last_name">{t("superAdminShops.lastName")}</Label>
                                                <Input
                                                    id="owner_last_name"
                                                    value={ownerData.last_name}
                                                    onChange={(e) => setOwnerData({ ...ownerData, last_name: e.target.value })}
                                                    placeholder={t("superAdminShops.lastNamePlaceholder")}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="owner_phone_prefix">{t("superAdminShops.countryCode")}</Label>
                                                <Input
                                                    id="owner_phone_prefix"
                                                    value={ownerData.phone_prefix}
                                                    onChange={(e) => setOwnerData({ ...ownerData, phone_prefix: e.target.value })}
                                                    placeholder="591"
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="owner_phone">{t("superAdminShops.ownerPhoneRequiredLabel")}</Label>
                                                <Input
                                                    id="owner_phone"
                                                    value={ownerData.phone}
                                                    onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                                                    placeholder="70000000"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="owner_display_name">{t("superAdminShops.displayName")}</Label>
                                    <Input
                                        id="owner_display_name"
                                        value={ownerData.display_name}
                                        onChange={(e) => setOwnerData({ ...ownerData, display_name: e.target.value })}
                                        placeholder={t("superAdminShops.displayNamePlaceholder")}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium">{t("superAdminShops.canReceiveBookings")}</p>
                                        <p className="text-xs text-slate-500">{t("superAdminShops.canReceiveBookingsHint")}</p>
                                    </div>
                                    <Switch
                                        checked={ownerData.is_bookable}
                                        onCheckedChange={(checked) =>
                                            setOwnerData({ ...ownerData, is_bookable: checked })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <StickyFormActions
                            type="submit"
                            loading={submitting}
                            saveLabel={t("superAdminShops.createShop")}
                            loadingLabel={t("superAdminShops.creating")}
                            onCancel={() => router.push("/admin/super-admin/shops")}
                            cancelLabel={t("common.cancel")}
                            saveClassName="bg-brand hover:bg-brand-hover text-white"
                        />
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
