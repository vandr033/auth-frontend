"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Users, Check } from "lucide-react";

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
import type { SuperAdminShop, CompanyType } from "@/types/super-admin";

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
    is_active: boolean;
}

export default function EditShopPage() {
    const router = useRouter();
    const params = useParams();
    const shopId = params.id as string;
    const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAdminAuth();

    const [shop, setShop] = useState<SuperAdminShop | null>(null);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Fetch shop and company types
    const fetchData = useCallback(async () => {
        try {
            const [shopRes, typesRes] = await Promise.all([
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), { credentials: "include" }),
                fetch(getApiUrl("/api/super-admin/company-types"), { credentials: "include" }),
            ]);

            if (!shopRes.ok) throw new Error("Failed to fetch shop");

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
                company_type_id: shopInfo.company_type_id?.toString() || "",
                is_active: shopInfo.is_active,
            });
            setCompanyTypes(typesData.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shop");
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin && shopId) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, shopId, fetchData]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        setError(null);
        setSuccess(false);

        if (!formData.name.trim()) {
            setError("Shop name is required");
            return;
        }
        if (!formData.phone.trim()) {
            setError("Phone number is required");
            return;
        }

        setSubmitting(true);

        try {
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
                company_type_id: parseInt(formData.company_type_id),
                is_active: formData.is_active,
            };

            const response = await fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to update shop");
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update shop");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="ml-2 text-slate-600">Loading shop...</span>
            </div>
        );
    }

    if (!shop || !formData) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Shop not found</p>
                <Link href="/admin/super-admin/shops">
                    <Button variant="outline" className="mt-4">
                        Back to Shops
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
                            Back to Shops
                        </Button>
                    </Link>
                </div>
                <Link href={`/admin/super-admin/shops/${shopId}/users`}>
                    <Button variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Shop: {shop.name}</CardTitle>
                    <CardDescription>
                        Update shop information and settings
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

                        {success && (
                            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                                <Check className="h-4 w-4 flex-shrink-0" />
                                Shop updated successfully!
                            </div>
                        )}

                        {/* Status Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                            <div>
                                <Label>Shop Status</Label>
                                <p className="text-sm text-slate-500">
                                    {formData.is_active ? "Shop is visible to customers" : "Shop is hidden from customers"}
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
                                <Label htmlFor="name">Shop Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Awesome Barber Shop"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="awesome-barber-shop"
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">
                                    Shop URL: /shop/{formData.slug}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_type">Company Type</Label>
                                <Select
                                    value={formData.company_type_id}
                                    onValueChange={(value) => setFormData({ ...formData, company_type_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">Contact Information</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="phone_prefix">Country Code</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={formData.phone_prefix}
                                        onChange={(e) => setFormData({ ...formData, phone_prefix: e.target.value })}
                                        placeholder="591"
                                        className="w-24"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contact@shop.com"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-4">Location</h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Av. Principal #123"
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Santa Cruz"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State/Region</Label>
                                        <Input
                                            id="state"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            placeholder="Santa Cruz"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="country_code">Country Code</Label>
                                        <Input
                                            id="country_code"
                                            value={formData.country_code}
                                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                                            placeholder="BO"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Select
                                            value={formData.timezone}
                                            onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="America/La_Paz">America/La_Paz (Bolivia)</SelectItem>
                                                <SelectItem value="America/Lima">America/Lima (Peru)</SelectItem>
                                                <SelectItem value="America/Santiago">America/Santiago (Chile)</SelectItem>
                                                <SelectItem value="America/Buenos_Aires">America/Buenos_Aires (Argentina)</SelectItem>
                                                <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (Brazil)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4 border-t">
                            <Link href="/admin/super-admin/shops" className="flex-1">
                                <Button type="button" variant="outline" className="w-full">
                                    Cancel
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
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
