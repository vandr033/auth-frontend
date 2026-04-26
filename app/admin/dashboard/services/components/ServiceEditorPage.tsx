"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminPageHeader, AdminPageShell, ErrorState, LoadingSkeleton } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useI18n, useT } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { notify } from "@/lib/notify";

interface GlobalServiceType {
    id: number;
    key: string;
    name: string;
    name_i18n?: Record<string, string>;
    description?: string;
    description_i18n?: Record<string, string>;
}

interface Category {
    id: number;
    name: string;
    company_id: number;
    global_service_type_id?: number;
    global_service_type?: GlobalServiceType;
}

interface Service {
    id: number;
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
    is_active: boolean;
    category_id: number;
    category?: Category;
    display_order: number;
    required_resources?: { staff_profile_id: number }[];
}

interface StaffOption {
    id: number;
    display_name: string;
    resource_type?: "PERSON" | "ROOM" | "EQUIPMENT";
}

interface ServiceFormData {
    name: string;
    description: string;
    category_id: number | null;
    price: string;
    duration_minutes: number;
    is_active: boolean;
    required_resource_ids: number[];
}

const initialFormData: ServiceFormData = {
    name: "",
    description: "",
    category_id: null,
    price: "",
    duration_minutes: 30,
    is_active: true,
    required_resource_ids: [],
};

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export function ServiceEditorPage({ serviceId }: { serviceId?: number }) {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();
    const router = useRouter();
    const t = useT();
    const { locale } = useI18n();
    const isEditing = Number.isInteger(serviceId);

    const [categories, setCategories] = useState<Category[]>([]);
    const [globalServiceTypes, setGlobalServiceTypes] = useState<GlobalServiceType[]>([]);
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
    const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryServiceTypeId, setNewCategoryServiceTypeId] = useState<number | null>(null);
    const [creatingCategory, setCreatingCategory] = useState(false);

    const getServiceTypeName = (type: GlobalServiceType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    const loadData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const [servicesRes, categoriesRes, serviceTypesRes, staffRes] = await Promise.all([
                fetch(getApiUrl(`/api/admin/services?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/categories?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl("/api/admin/categories/global-service-types"), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/staff?company_id=${companyId}`), {
                    credentials: "include",
                }),
            ]);

            if (!servicesRes.ok) throw new Error(t("adminServices.fetchServicesError"));
            if (!categoriesRes.ok) throw new Error(t("adminServices.fetchCategoriesError"));
            if (!serviceTypesRes.ok) throw new Error(t("adminServices.fetchServiceTypesError"));

            const servicesData = await servicesRes.json();
            const categoriesData = await categoriesRes.json();
            const serviceTypesData = await serviceTypesRes.json();
            const services: Service[] = servicesData.data || servicesData || [];
            const nextCategories = categoriesData.data || categoriesData || [];

            setCategories(nextCategories);
            setGlobalServiceTypes(serviceTypesData.data || serviceTypesData || []);

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                setStaffOptions(staffData.data || staffData || []);
            }

            if (isEditing && serviceId) {
                const service = services.find((item) => item.id === serviceId);
                if (!service) {
                    throw new Error(t("adminServices.fetchServicesError"));
                }
                setFormData({
                    name: service.name,
                    description: service.description || "",
                    category_id: service.category_id,
                    price: (service.price_cents / 100).toFixed(2),
                    duration_minutes: service.duration_minutes,
                    is_active: service.is_active,
                    required_resource_ids: service.required_resources?.map((resource) => resource.staff_profile_id) ?? [],
                });
            } else {
                setFormData(initialFormData);
            }
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminServices.loadDataError"));
        } finally {
            setLoading(false);
        }
    }, [companyId, isEditing, serviceId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void loadData();
        }
    }, [isAuthenticated, companyId, loadData]);

    const selectedResourceCount = useMemo(
        () => formData.required_resource_ids.length,
        [formData.required_resource_ids.length],
    );

    const handleSubmit = async () => {
        if (!companyId) return;

        if (!formData.name.trim()) {
            setFormError(t("adminServices.serviceNameRequired"));
            return;
        }
        if (!formData.category_id) {
            setFormError(t("adminServices.selectCategoryRequired"));
            return;
        }
        const priceValue = Number.parseFloat(formData.price);
        if (Number.isNaN(priceValue) || priceValue < 0) {
            setFormError(t("adminServices.validPriceRequired"));
            return;
        }

        setSubmitting(true);
        setFormError(null);
        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                category_id: formData.category_id,
                price_cents: Math.round(priceValue * 100),
                duration_minutes: formData.duration_minutes,
                is_active: formData.is_active,
                company_id: companyId,
                required_resource_ids: formData.required_resource_ids,
            };

            const response = await fetch(
                isEditing && serviceId
                    ? getApiUrl(`/api/admin/services/${serviceId}`)
                    : getApiUrl("/api/admin/services"),
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || t("adminServices.saveServiceError"));
            }

            router.push("/admin/dashboard/services");
            router.refresh();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : t("adminServices.saveServiceError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim() || !companyId) return;

        setCreatingCategory(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/categories"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: newCategoryName.trim(),
                    company_id: companyId,
                    global_service_type_id: newCategoryServiceTypeId || undefined,
                }),
            });

            if (!response.ok) throw new Error(t("adminServices.createCategoryFailed"));

            const newCategory = await response.json();
            const created = newCategory.data || newCategory;
            setCategories((prev) => [...prev, created]);
            setFormData((prev) => ({ ...prev, category_id: created.id }));
            setNewCategoryName("");
            setNewCategoryServiceTypeId(null);
            setIsCategoryModalOpen(false);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : t("adminServices.createCategoryFailed"));
        } finally {
            setCreatingCategory(false);
        }
    };

    if (authLoading || loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={6} />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={isEditing ? t("adminServices.editService") : t("adminServices.addService")}
                subtitle={isEditing ? t("adminServices.updateServiceDescription") : t("adminServices.createServiceDescription")}
                actions={
                    <Button asChild variant="outline">
                        <Link href="/admin/dashboard/services">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("common.cancel")}
                        </Link>
                    </Button>
                }
            />

            {formError ? (
                <ErrorState title={t("adminServices.saveServiceError")} description={formError} className="min-h-0 py-6" />
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.name")}</CardTitle>
                            <CardDescription>{t("adminServices.createServiceDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("adminServices.name")} *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder={t("adminServices.namePlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t("adminServices.description")}</Label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                    placeholder={t("adminServices.descriptionPlaceholder")}
                                    className="admin-textarea min-h-[120px] resize-y"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.category")}</CardTitle>
                            <CardDescription>{t("adminServices.categoriesSubtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="category">{t("adminServices.category")} *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t("adminServices.addCategory")}
                                </Button>
                            </div>
                            <Select
                                value={formData.category_id?.toString() || ""}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: Number.parseInt(value, 10) }))}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue placeholder={t("adminServices.selectCategory")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.price")} / {t("adminServices.duration")}</CardTitle>
                            <CardDescription>{t("adminServices.durationHint")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="price">{t("adminServices.price")} *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                                    placeholder={t("adminServices.pricePlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">{t("adminServices.duration")} *</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    min={1}
                                    max={480}
                                    value={formData.duration_minutes}
                                    onChange={(event) => setFormData((prev) => ({
                                        ...prev,
                                        duration_minutes: Number.parseInt(event.target.value, 10) || 1,
                                    }))}
                                    placeholder={t("adminServices.durationPlaceholder")}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.requiredResources")}</CardTitle>
                            <CardDescription>{t("adminServices.requiredResourcesHint")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {staffOptions.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminServices.noResourcesAvailable")}</p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {staffOptions.map((staff) => (
                                        <label key={staff.id} className="flex items-center gap-2 rounded-md border border-admin-border px-3 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.required_resource_ids.includes(staff.id)}
                                                onChange={(event) => setFormData((prev) => ({
                                                    ...prev,
                                                    required_resource_ids: event.target.checked
                                                        ? [...prev.required_resource_ids, staff.id]
                                                        : prev.required_resource_ids.filter((id) => id !== staff.id),
                                                }))}
                                            />
                                            <span>{staff.display_name}</span>
                                            <span className="text-xs text-slate-400">
                                                {staff.resource_type === "ROOM"
                                                    ? `(${t("adminStaff.resourceTypeRoom")})`
                                                    : staff.resource_type === "EQUIPMENT"
                                                        ? `(${t("adminStaff.resourceTypeEquipment")})`
                                                        : `(${t("adminStaff.resourceTypePerson")})`}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminBookings.status")}</CardTitle>
                            <CardDescription>{t("adminServices.visibilityHint")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between rounded-md border border-admin-border px-3 py-2">
                                <Label htmlFor="is_active">{t("adminServices.active")}</Label>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.requiredResources")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600">
                            {selectedResourceCount === 0
                                ? t("adminServices.noResourcesAvailable")
                                : `${selectedResourceCount} ${t("adminServices.selectRequiredResources")}`}
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t("adminServices.addCategory")}</DialogTitle>
                        <DialogDescription>{t("adminServices.createCategoryDescription")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">{t("adminServices.categoryNameRequiredLabel")}</Label>
                            <Input
                                id="category-name"
                                value={newCategoryName}
                                onChange={(event) => setNewCategoryName(event.target.value)}
                                placeholder={t("adminServices.categoryNamePlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-type">{t("adminServices.serviceTypeOptional")}</Label>
                            <Select
                                value={newCategoryServiceTypeId?.toString() || "none"}
                                onValueChange={(value) => setNewCategoryServiceTypeId(value === "none" ? null : Number.parseInt(value, 10))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("adminServices.selectServiceType")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t("adminServices.noSpecificType")}</SelectItem>
                                    {globalServiceTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {getServiceTypeName(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">{t("adminServices.serviceTypeHint")}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCategoryModalOpen(false);
                                setNewCategoryServiceTypeId(null);
                            }}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleCreateCategory}
                            disabled={creatingCategory || !newCategoryName.trim()}
                            className="bg-admin-brand hover:bg-admin-brand-hover"
                        >
                            {creatingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("adminServices.addCategory")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StickyFormActions
                onSave={handleSubmit}
                loading={submitting}
                saveLabel={isEditing ? t("adminServices.updateService") : t("adminServices.createService")}
                loadingLabel={t("adminServices.saving")}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
                onCancel={() => router.push("/admin/dashboard/services")}
                cancelLabel={t("common.cancel")}
            />
        </AdminPageShell>
    );
}
