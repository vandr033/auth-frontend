"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
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
import { canUseEntitledFeature } from "@/lib/plans/capabilities";

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
    promo_price_cents?: number | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
    promo_label?: string | null;
    pricing?: {
        regular_price_cents?: number | null;
        base_price_cents: number;
        final_price_cents: number;
        promo_applied: boolean;
        promo_label?: string | null;
        promo_starts_at?: string | null;
        promo_ends_at?: string | null;
    };
    duration_minutes: number;
    is_active: boolean;
    category_id: number;
    category?: Category;
    display_order: number;
    is_multi_session?: boolean;
    session_count?: number | null;
    session_duration_minutes?: number | null;
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
    promo_price: string;
    promo_starts_at: string;
    promo_ends_at: string;
    promo_label: string;
    duration_minutes: string;
    is_multi_session: boolean;
    session_count: string;
    session_duration_minutes: string;
    is_active: boolean;
    required_resource_ids: number[];
}

const initialFormData: ServiceFormData = {
    name: "",
    description: "",
    category_id: null,
    price: "",
    promo_price: "",
    promo_starts_at: "",
    promo_ends_at: "",
    promo_label: "",
    duration_minutes: "30",
    is_multi_session: false,
    session_count: "4",
    session_duration_minutes: "90",
    is_active: true,
    required_resource_ids: [],
};

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export function ServiceEditorPage({ serviceId }: { serviceId?: number }) {
    const { companyId, companyUser, user, isAuthenticated, loading: authLoading } = useAdminAuth();
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
    const [existingMultiSessionService, setExistingMultiSessionService] = useState(false);

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
                setExistingMultiSessionService(service.is_multi_session === true);
                setFormData({
                    name: service.name,
                    description: service.description || "",
                    category_id: service.category_id,
                    price: (service.price_cents / 100).toFixed(2),
                    promo_price: service.promo_price_cents != null ? (service.promo_price_cents / 100).toFixed(2) : "",
                    promo_starts_at: service.promo_starts_at ? service.promo_starts_at.slice(0, 16) : "",
                    promo_ends_at: service.promo_ends_at ? service.promo_ends_at.slice(0, 16) : "",
                    promo_label: service.promo_label || "",
                    duration_minutes: String(service.duration_minutes),
                    is_multi_session: service.is_multi_session === true,
                    session_count: service.session_count ? String(service.session_count) : "4",
                    session_duration_minutes: service.session_duration_minutes
                        ? String(service.session_duration_minutes)
                        : "90",
                    is_active: service.is_active,
                    required_resource_ids: service.required_resources?.map((resource) => resource.staff_profile_id) ?? [],
                });
            } else {
                setExistingMultiSessionService(false);
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
    const canUseMultiSession = Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, "BOOKING_FLOW_CUSTOMIZATION");
    const canUseServicePromotions =
        Boolean(user?.is_super_admin) ||
        companyUser?.company?.capabilities?.productCapabilities?.RESERVAS_SERVICE_PROMOTIONS === true;
    const shouldPreserveLockedMultiSession =
        isEditing &&
        existingMultiSessionService &&
        !canUseMultiSession;
    const sessionCountValue = Number.parseInt(formData.session_count, 10);
    const sessionDurationValue = Number.parseInt(formData.session_duration_minutes, 10);
    const computedMultiSessionDuration =
        formData.is_multi_session &&
        Number.isFinite(sessionCountValue) &&
        sessionCountValue > 0 &&
        Number.isFinite(sessionDurationValue) &&
        sessionDurationValue > 0
            ? sessionCountValue * sessionDurationValue
            : null;

    useEffect(() => {
        if (!canUseMultiSession && !shouldPreserveLockedMultiSession && formData.is_multi_session) {
            setFormData((prev) => ({
                ...prev,
                is_multi_session: false,
                session_count: initialFormData.session_count,
                session_duration_minutes: initialFormData.session_duration_minutes,
            }));
        }
    }, [canUseMultiSession, formData.is_multi_session, shouldPreserveLockedMultiSession]);

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
        const durationValue = Number.parseInt(formData.duration_minutes, 10);
        if (Number.isNaN(durationValue) || durationValue < 1) {
            setFormError(t("adminServices.durationRequired"));
            return;
        }
        const promoPriceValue = formData.promo_price.trim()
            ? Number.parseFloat(formData.promo_price)
            : null;
        if (promoPriceValue !== null && (Number.isNaN(promoPriceValue) || promoPriceValue < 0)) {
            setFormError(t("adminServices.validPromoPriceRequired"));
            return;
        }
        if (
            canUseServicePromotions &&
            promoPriceValue === null &&
            (formData.promo_starts_at || formData.promo_ends_at || formData.promo_label.trim())
        ) {
            setFormError(t("adminServices.promoPriceRequired"));
            return;
        }
        const multiSessionEnabled = canUseMultiSession
            ? formData.is_multi_session
            : shouldPreserveLockedMultiSession;
        const sessionCount = Number.parseInt(formData.session_count, 10);
        const sessionDuration = Number.parseInt(formData.session_duration_minutes, 10);
        if (multiSessionEnabled && (Number.isNaN(sessionCount) || sessionCount <= 1)) {
            setFormError("La cantidad de sesiones debe ser mayor a 1.");
            return;
        }
        if (multiSessionEnabled && (Number.isNaN(sessionDuration) || sessionDuration <= 0)) {
            setFormError("La duración por sesión debe ser mayor a 0.");
            return;
        }

        setSubmitting(true);
        setFormError(null);
        try {
            const promotionPayload = canUseServicePromotions
                ? {
                    promo_price_cents:
                        promoPriceValue !== null ? Math.round(promoPriceValue * 100) : null,
                    promo_starts_at: formData.promo_starts_at || null,
                    promo_ends_at: formData.promo_ends_at || null,
                    promo_label: formData.promo_label.trim() || null,
                }
                : {};
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                category_id: formData.category_id,
                price_cents: Math.round(priceValue * 100),
                ...promotionPayload,
                duration_minutes: multiSessionEnabled
                    ? computedMultiSessionDuration ?? durationValue
                    : durationValue,
                is_multi_session: multiSessionEnabled,
                session_count: multiSessionEnabled ? sessionCount : null,
                session_duration_minutes: multiSessionEnabled ? sessionDuration : null,
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
                                    value={
                                        formData.is_multi_session && computedMultiSessionDuration
                                            ? String(computedMultiSessionDuration)
                                            : formData.duration_minutes
                                    }
                                    disabled={formData.is_multi_session}
                                    onChange={(event) => setFormData((prev) => ({
                                        ...prev,
                                        duration_minutes: event.target.value,
                                    }))}
                                    placeholder={t("adminServices.durationPlaceholder")}
                                />
                                {formData.is_multi_session ? (
                                    <p className="text-xs text-slate-500">
                                        La duración total se calcula automáticamente.
                                    </p>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminServices.promotionsTitle")}</CardTitle>
                            <CardDescription>{t("adminServices.promotionsDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!canUseServicePromotions ? (
                                <EntitlementLockedCard
                                    title={t("adminServices.promotionsTitle")}
                                    description={t("adminServices.promotionsDescription")}
                                    capability="RESERVAS_SERVICE_PROMOTIONS"
                                    source="SETTINGS_LOCKED_CONTROL"
                                    notice={t("entitlements.reservationsProLocked")}
                                    compact
                                />
                            ) : null}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="promo_price">{t("adminServices.promoPrice")}</Label>
                                    <Input
                                        id="promo_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled={!canUseServicePromotions}
                                        value={formData.promo_price}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                promo_price: event.target.value,
                                            }))
                                        }
                                        placeholder={t("adminServices.promoPricePlaceholder")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="promo_label">{t("adminServices.promoLabel")}</Label>
                                    <Input
                                        id="promo_label"
                                        disabled={!canUseServicePromotions}
                                        value={formData.promo_label}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                promo_label: event.target.value,
                                            }))
                                        }
                                        placeholder={t("adminServices.promoLabelPlaceholder")}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="promo_starts_at">{t("adminServices.promoStartsAt")}</Label>
                                    <Input
                                        id="promo_starts_at"
                                        type="datetime-local"
                                        disabled={!canUseServicePromotions}
                                        value={formData.promo_starts_at}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                promo_starts_at: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="promo_ends_at">{t("adminServices.promoEndsAt")}</Label>
                                    <Input
                                        id="promo_ends_at"
                                        type="datetime-local"
                                        disabled={!canUseServicePromotions}
                                        value={formData.promo_ends_at}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                promo_ends_at: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {canUseServicePromotions ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-start px-0 text-sm text-slate-500 hover:text-slate-900"
                                    onClick={() =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            promo_price: "",
                                            promo_starts_at: "",
                                            promo_ends_at: "",
                                            promo_label: "",
                                        }))
                                    }
                                >
                                    {t("adminServices.clearPromotion")}
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle className="text-base">Servicio con múltiples sesiones</CardTitle>
                            <CardDescription>
                                Disponible en Reservas Pro. El cliente elige fecha y hora para cada sesión.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-md border border-admin-border px-3 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Activar servicio con múltiples sesiones</p>
                                    <p className="text-xs text-slate-500">
                                        Mismo personal y recurso en todas las sesiones.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_multi_session}
                                    disabled={!canUseMultiSession}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_multi_session: checked,
                                        }))
                                    }
                                />
                            </div>

                            {!canUseMultiSession ? (
                                <EntitlementLockedCard
                                    title="Servicio con múltiples sesiones"
                                    description="Configura paquetes de sesiones donde el cliente agenda cada sesión por separado."
                                    capability="RESERVAS_PRO"
                                    source="SETTINGS_LOCKED_CONTROL"
                                    notice={t("entitlements.reservationsProLocked")}
                                    compact
                                />
                            ) : null}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="session_count">Cantidad de sesiones</Label>
                                    <Input
                                        id="session_count"
                                        type="number"
                                        min={2}
                                        disabled={!formData.is_multi_session || !canUseMultiSession}
                                        value={formData.session_count}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                session_count: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="session_duration_minutes">Duración por sesión (min)</Label>
                                    <Input
                                        id="session_duration_minutes"
                                        type="number"
                                        min={1}
                                        disabled={!formData.is_multi_session || !canUseMultiSession}
                                        value={formData.session_duration_minutes}
                                        onChange={(event) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                session_duration_minutes: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {formData.is_multi_session ? (
                                <div className="rounded-md border border-admin-border bg-admin-soft px-3 py-3 text-sm text-slate-700">
                                    Duración total calculada: {computedMultiSessionDuration ?? 0} minutos.
                                </div>
                            ) : null}
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
