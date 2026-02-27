"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

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
import { getLocalizedText } from "@/lib/i18n/localized";
import type { CompanyType } from "@/types/super-admin";

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
    company_type_id: string;
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
    company_type_id: "",
};

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
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCompanyTypeName = (type: CompanyType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

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

    // Update slug when name changes
    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
        });
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError(t("superAdminShops.shopNameRequired"));
            return;
        }
        if (!formData.phone.trim()) {
            setError(t("superAdminShops.phoneRequired"));
            return;
        }
        if (!formData.company_type_id) {
            setError(t("superAdminShops.companyTypeRequired"));
            return;
        }
        const ownerEmail = ownerData.email.trim().toLowerCase();
        const ownerPassword = ownerData.password.trim();
        const ownerPhone = ownerData.phone.replace(/\D/g, "");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!ownerEmail) {
            setError(t("superAdminShops.ownerEmailRequired"));
            return;
        }
        if (!emailRegex.test(ownerEmail)) {
            setError(t("superAdminShops.ownerEmailInvalid"));
            return;
        }
        if (ownerPassword.length < 8) {
            setError(t("superAdminShops.ownerPasswordMin"));
            return;
        }
        if (!ownerPhone) {
            setError(t("superAdminShops.ownerPhoneRequired"));
            return;
        }

        setSubmitting(true);

        try {
            const ownerPhone = ownerData.phone.replace(/\D/g, "");
            const ownerPhonePrefix = ownerData.phone_prefix.trim();

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
                company_type_id: parseInt(formData.company_type_id),
                owner: {
                    email: ownerData.email.trim().toLowerCase(),
                    password: ownerData.password.trim(),
                    first_name: ownerData.first_name.trim() || undefined,
                    last_name: ownerData.last_name.trim() || undefined,
                    phone_prefix: ownerPhonePrefix || "591",
                    phone: ownerPhone,
                    display_name: ownerData.display_name.trim() || undefined,
                    is_bookable: ownerData.is_bookable,
                },
            };

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
            setError(err instanceof Error ? err.message : t("superAdminShops.createFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
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
                        {error && (
                            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

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
                                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                            placeholder={t("superAdminShops.countryCodePlaceholder")}
                                            maxLength={2}
                                            className="uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">{t("superAdminShops.timezone")}</Label>
                                        <Select
                                            value={formData.timezone}
                                            onValueChange={(value) => setFormData({ ...formData, timezone: value })}
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
                            </div>
                        </div>

                        {/* Owner Profile */}
                        <div className="border-t pt-4 space-y-4">
                            <div>
                                <h3 className="font-medium">{t("superAdminShops.ownerProfileSection")}</h3>
                                <p className="text-sm text-slate-500">{t("superAdminShops.ownerProfileSectionHint")}</p>
                            </div>

                            <div className="grid gap-4">
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
                        <div className="flex gap-4 pt-4 border-t">
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
                                        {t("superAdminShops.creating")}
                                    </>
                                ) : (
                                    t("superAdminShops.createShop")
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
