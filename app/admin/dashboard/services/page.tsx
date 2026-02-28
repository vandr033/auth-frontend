"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    Clock,
    DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import { CategoriesSection } from "./components/CategoriesSection";

// Types
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
}

interface ServiceFormData {
    name: string;
    description: string;
    category_id: number | null;
    price: string; // String for input handling
    duration_minutes: number;
    is_active: boolean;
}

const initialFormData: ServiceFormData = {
    name: "",
    description: "",
    category_id: null,
    price: "",
    duration_minutes: 30,
    is_active: true,
};

// Helper functions
function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    // Remove leading /api from path if base already includes /api
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function ServicesPage() {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();
    const { locale } = useI18n();

    // State
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deletingService, setDeletingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Category modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryServiceTypeId, setNewCategoryServiceTypeId] = useState<number | null>(null);
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Global service types
    const [globalServiceTypes, setGlobalServiceTypes] = useState<GlobalServiceType[]>([]);

    const getServiceTypeName = (type: GlobalServiceType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    // Fetch services and categories
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const [servicesRes, categoriesRes, serviceTypesRes] = await Promise.all([
                fetch(getApiUrl(`/api/admin/services?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/categories?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/categories/global-service-types`), {
                    credentials: "include",
                }),
            ]);

            if (!servicesRes.ok) throw new Error(t('adminServices.fetchServicesError'));
            if (!categoriesRes.ok) throw new Error(t('adminServices.fetchCategoriesError'));
            if (!serviceTypesRes.ok) throw new Error(t('adminServices.fetchServiceTypesError'));
            
            const servicesData = await servicesRes.json();
            const categoriesData = await categoriesRes.json();
            const serviceTypesData = await serviceTypesRes.json();

            setServices(servicesData.data || servicesData || []);
            setCategories(categoriesData.data || categoriesData || []);
            setGlobalServiceTypes(serviceTypesData.data || serviceTypesData || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('adminServices.loadDataError'));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Filtered services
    const filteredServices = services.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Open modal for add/edit
    const openAddModal = () => {
        setEditingService(null);
        setFormData(initialFormData);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || "",
            category_id: service.category_id,
            price: (service.price_cents / 100).toFixed(2),
            duration_minutes: service.duration_minutes,
            is_active: service.is_active,
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;

        // Validation
        if (!formData.name.trim()) {
            setFormError(t('adminServices.serviceNameRequired'));
            return;
        }
        if (!formData.category_id) {
            setFormError(t('adminServices.selectCategoryRequired'));
            return;
        }
        const priceValue = parseFloat(formData.price);
        if (isNaN(priceValue) || priceValue < 0) {
            setFormError(t('adminServices.validPriceRequired'));
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
            };

            const url = editingService
                ? getApiUrl(`/api/admin/services/${editingService.id}`)
                : getApiUrl("/api/admin/services");

            const response = await fetch(url, {
                method: editingService ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || t('adminServices.saveServiceError'));
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t('adminServices.saveServiceError'));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingService) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/admin/services/${deletingService.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) throw new Error(t('adminServices.deleteFailed'));

            setIsDeleteDialogOpen(false);
            setDeletingService(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('adminServices.deleteFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle active status
    const toggleActiveStatus = async (service: Service) => {
        try {
            const response = await fetch(getApiUrl(`/api/admin/services/${service.id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ is_active: !service.is_active }),
            });

            if (!response.ok) throw new Error(t('adminServices.updateStatusFailed'));

            setServices((prev) =>
                prev.map((s) =>
                    s.id === service.id ? { ...s, is_active: !s.is_active } : s
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : t('adminServices.updateStatusFailed'));
        }
    };

    // Create category
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

            if (!response.ok) throw new Error(t('adminServices.createCategoryFailed'));

            const newCategory = await response.json();
            setCategories((prev) => [...prev, newCategory.data || newCategory]);
            setFormData((prev) => ({
                ...prev,
                category_id: (newCategory.data || newCategory).id,
            }));
            setNewCategoryName("");
            setNewCategoryServiceTypeId(null);
            setIsCategoryModalOpen(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t('adminServices.createCategoryFailed'));
        } finally {
            setCreatingCategory(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">{t('common.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('adminServices.title')}</h1>
                    <p className="text-slate-500">{t('adminServices.subtitle')}</p>
                </div>
                <Button onClick={openAddModal} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('adminServices.addService')}
                </Button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-2"
                    >
                        {t('imageUpload.dismiss')}
                    </Button>
                </div>
            )}

            {/* Categories Section */}
            <CategoriesSection
                categories={categories}
                globalServiceTypes={globalServiceTypes}
                companyId={companyId!}
                onCategoriesChange={fetchData}
                getApiUrl={getApiUrl}
            />

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t('adminServices.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('adminBookings.service')}</TableHead>
                                <TableHead>{t('adminServices.category')}</TableHead>
                                <TableHead>{t('adminServices.price')}</TableHead>
                                <TableHead>{t('adminServices.duration')}</TableHead>
                                <TableHead>{t('adminBookings.status')}</TableHead>
                                <TableHead className="text-right">{t('adminServices.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        {searchQuery ? t('adminServices.noServices') : t('adminServices.noServices')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredServices.map((service) => (
                                    <TableRow key={service.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">{service.name}</p>
                                                {service.description && (
                                                    <p className="text-sm text-slate-500 line-clamp-1">
                                                        {service.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                {service.category?.name || t('adminServices.uncategorized')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatPrice(service.price_cents)}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {formatDuration(service.duration_minutes)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={service.is_active}
                                                    onCheckedChange={() => toggleActiveStatus(service)}
                                                />
                                                <span
                                                    className={cn(
                                                        "text-sm",
                                                        service.is_active ? "text-emerald-600" : "text-slate-400"
                                                    )}
                                                >
                                                    {service.is_active ? t('adminServices.active') : t('adminServices.inactive')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(service)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setDeletingService(service);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredServices.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-slate-500">
                            {searchQuery ? t('adminServices.noServices') : t('adminServices.noServices')}
                        </CardContent>
                    </Card>
                ) : (
                    filteredServices.map((service) => (
                        <Card key={service.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900">{service.name}</h3>
                                            <span
                                                className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
                                                    service.is_active
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-slate-100 text-slate-500"
                                                )}
                                            >
                                                {service.is_active ? t('adminServices.active') : t('adminServices.inactive')}
                                            </span>
                                        </div>
                                        {service.description && (
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                                                {service.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                                                <DollarSign className="h-3 w-3" />
                                                {formatPrice(service.price_cents)}
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Clock className="h-3 w-3" />
                                                {formatDuration(service.duration_minutes)}
                                            </span>
                                            <span className="text-slate-400">
                                                {service.category?.name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditModal(service)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingService(service);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                            className="text-rose-500 hover:text-rose-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                    <span className="text-sm text-slate-500">{t('adminBookings.status')}</span>
                                    <Switch
                                        checked={service.is_active}
                                        onCheckedChange={() => toggleActiveStatus(service)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Service Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingService ? t('adminServices.editService') : t('adminServices.addService')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingService
                                ? t('adminServices.updateServiceDescription')
                                : t('adminServices.createServiceDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">{t('adminServices.name')} *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('adminServices.namePlaceholder')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('adminServices.description')}</Label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('adminServices.descriptionPlaceholder')}
                                className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="category">{t('adminServices.category')} *</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="text-orange-500 hover:text-orange-600 text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {t('adminServices.addCategory')}
                                </Button>
                            </div>
                            <Select
                                value={formData.category_id?.toString() || ""}
                                onValueChange={(val) => setFormData({ ...formData, category_id: parseInt(val) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('adminServices.selectCategory')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">{t('adminServices.price')} *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder={t('adminServices.pricePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">{t('adminServices.duration')} *</Label>
                                <Select
                                    value={formData.duration_minutes.toString()}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, duration_minutes: parseInt(val) })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((min) => (
                                            <SelectItem key={min} value={min.toString()}>
                                                {formatDuration(min)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Label htmlFor="is_active">{t('adminServices.active')}</Label>
                                <p className="text-xs text-slate-500">
                                    {t('adminServices.visibilityHint')}
                                </p>
                            </div>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_active: checked })
                                }
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t('adminServices.saving')}
                                    </>
                                ) : editingService ? (
                                    t('adminServices.updateService')
                                ) : (
                                    t('adminServices.createService')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('common.delete')}</DialogTitle>
                        <DialogDescription>
                            {t('adminServices.deleteConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingService(null);
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={submitting}
                            className="bg-rose-500 hover:bg-rose-600"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('adminServices.deleting')}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Category Modal */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('adminServices.addCategory')}</DialogTitle>
                        <DialogDescription>
                            {t('adminServices.createCategoryDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">{t('adminServices.categoryNameRequiredLabel')}</Label>
                            <Input
                                id="category-name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder={t('adminServices.categoryNamePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-type">{t('adminServices.serviceTypeOptional')}</Label>
                            <Select
                                value={newCategoryServiceTypeId?.toString() || "none"}
                                onValueChange={(val) => setNewCategoryServiceTypeId(val === "none" ? null : parseInt(val))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('adminServices.selectServiceType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('adminServices.noSpecificType')}</SelectItem>
                                    {globalServiceTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {getServiceTypeName(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                {t('adminServices.serviceTypeHint')}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => {
                            setIsCategoryModalOpen(false);
                            setNewCategoryServiceTypeId(null);
                        }}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateCategory}
                            disabled={creatingCategory || !newCategoryName.trim()}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {creatingCategory ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('adminServices.creating')}
                                </>
                            ) : (
                                t('adminServices.addCategory')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
