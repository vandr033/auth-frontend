"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
    Copy,
    ExternalLink,
    Plus,
    Pencil,
    Trash2,
    Clock,
    DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    AdminPageHeader,
    AdminPageShell,
    ConfirmDialog,
    DataTable,
    DataToolbar,
    DataPagination,
    EmptyState,
    LoadingSkeleton,
    InlineActions,
    StatusBadge,
} from "@/components/admin/shared";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { CategoriesSection } from "./components/CategoriesSection";
import { notify } from "@/lib/notify";
import { formatCurrencyFromCents } from "@/lib/currency";
import { buildPublicServicePath, copyPublicUrl } from "@/lib/admin/public-links";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 10;

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
    created_at?: string;
    is_invite_only?: boolean;
    invite_token?: string | null;
    required_resources?: { staff_profile_id: number }[];
}

// Helper functions
function formatPrice(cents: number, currency?: string | null): string {
    return formatCurrencyFromCents(cents, currency);
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
    const { companyId, companyUser, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();
    const currency = companyUser?.company?.currency;
    const companySlug = companyUser?.company?.slug;

    // State
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | "PUBLIC" | "INVITE_ONLY">("ALL");
    const [page, setPage] = useState(1);

    // Delete confirmation remains a small destructive confirmation modal.
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingService, setDeletingService] = useState<Service | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Global service types
    const [globalServiceTypes, setGlobalServiceTypes] = useState<GlobalServiceType[]>([]);

    // Fetch services and categories
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);

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
            void notify.error(err instanceof Error ? err.message : t('adminServices.loadDataError'));
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
    const filteredServices = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return [...services]
            .filter((service) => {
                const matchesSearch = !query || [service.name, service.description ?? "", service.category?.name ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);
                const matchesCategory = categoryFilter === "ALL" || String(service.category_id) === categoryFilter;
                const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? service.is_active : !service.is_active);
                const matchesVisibility = visibilityFilter === "ALL" || (visibilityFilter === "INVITE_ONLY" ? service.is_invite_only : !service.is_invite_only);
                return matchesSearch && matchesCategory && matchesStatus && matchesVisibility;
            })
            .sort((a, b) => {
                if (a.created_at && b.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                return b.id - a.id;
            });
    }, [categoryFilter, searchQuery, services, statusFilter, visibilityFilter]);
    const pagedServices = useMemo(
        () => filteredServices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filteredServices, page],
    );

    useEffect(() => setPage(1), [categoryFilter, searchQuery, statusFilter, visibilityFilter]);

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
            void notify.error(err instanceof Error ? err.message : t('adminServices.deleteFailed'));
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
            void notify.error(err instanceof Error ? err.message : t('adminServices.updateStatusFailed'));
        }
    };

    const getServicePublicPath = (service: Service): string | null => {
        if (!companySlug) return null;
        if (!service.is_invite_only) return buildPublicServicePath(companySlug, service.id);
        if (!service.invite_token) return null;
        return `/shop/${encodeURIComponent(companySlug)}/book?invite=${encodeURIComponent(service.invite_token)}`;
    };

    const copyServiceLink = async (service: Service) => {
        const path = getServicePublicPath(service);
        if (!path) {
            await notify.error(t('adminServices.inviteLinkUnavailable'));
            return;
        }

        try {
            await copyPublicUrl(path);
            await notify.success(t('adminServices.inviteLinkCopied'));
        } catch {
            await notify.error(t('common.error'));
        }
    };

    // Loading state
    if (authLoading || loading) {
        return <LoadingSkeleton variant="page" rows={5} />;
    }

    const emptyServicesState = (
        <EmptyState
            title={t('adminServices.noServices')}
            description={searchQuery ? t('adminServices.searchPlaceholder') : t('adminServices.subtitle')}
            action={
                !searchQuery ? (
                    <Button asChild>
                        <Link href="/admin/dashboard/services/new">
                            <Plus className="h-4 w-4" />
                            {t('adminServices.addService')}
                        </Link>
                    </Button>
                ) : null
            }
        />
    );

    const serviceActions = (service: Service) => (
        <InlineActions
            items={[
                {
                    label: t('adminServices.copyInviteLink'),
                    icon: <Copy className="h-4 w-4" />,
                    onSelect: () => void copyServiceLink(service),
                    disabled: !getServicePublicPath(service),
                },
                {
                    label: t('adminGroup.actions.viewPublic'),
                    icon: <ExternalLink className="h-4 w-4" />,
                    href: getServicePublicPath(service) ?? undefined,
                    disabled: !getServicePublicPath(service),
                    target: "_blank",
                },
                {
                    label: t('adminServices.editService'),
                    icon: <Pencil className="h-4 w-4" />,
                    href: `/admin/dashboard/services/${service.id}/edit`,
                },
                {
                    label: t('common.delete'),
                    icon: <Trash2 className="h-4 w-4" />,
                    destructive: true,
                    separatorBefore: true,
                    onSelect: () => {
                        setDeletingService(service);
                        setIsDeleteDialogOpen(true);
                    },
                },
            ]}
        />
    );

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t('adminServices.title')}
                subtitle={t('adminServices.subtitle')}
                actions={
                    <Button asChild>
                        <Link href="/admin/dashboard/services/new">
                            <Plus className="h-4 w-4" />
                            {t('adminServices.addService')}
                        </Link>
                    </Button>
                }
            />

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t('adminServices.searchPlaceholder')}
                onSearchChange={setSearchQuery}
                summary={`${filteredServices.length} / ${services.length}`}
                filters={
                    <>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('adminServices.allCategories')}</SelectItem>
                                {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                            <SelectTrigger className="w-full sm:w-[145px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('adminGroup.filters.allStatuses')}</SelectItem>
                                <SelectItem value="ACTIVE">{t('adminServices.active')}</SelectItem>
                                <SelectItem value="INACTIVE">{t('adminServices.inactive')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}>
                            <SelectTrigger className="w-full sm:w-[165px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('adminGroup.filters.allVisibility')}</SelectItem>
                                <SelectItem value="PUBLIC">{t('adminGroup.filters.public')}</SelectItem>
                                <SelectItem value="INVITE_ONLY">{t('adminServices.inviteOnly')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/dashboard/services/new">
                            <Plus className="h-4 w-4" />
                            {t('adminServices.addService')}
                        </Link>
                    </Button>
                }
            />

            {/* Categories are kept in their current component to preserve category behavior during this foundational pass. */}
            <CategoriesSection
                categories={categories}
                globalServiceTypes={globalServiceTypes}
                companyId={companyId!}
                onCategoriesChange={fetchData}
                getApiUrl={getApiUrl}
            />

            <DataTable
                data={pagedServices}
                getRowKey={(service) => service.id}
                empty={emptyServicesState}
                columns={[
                    {
                        key: "service",
                        header: t('adminBookings.service'),
                        cell: (service) => (
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-slate-900">{service.name}</p>
                                    {service.is_invite_only ? (
                                        <StatusBadge tone="neutral">
                                            {t('adminServices.inviteOnly')}
                                        </StatusBadge>
                                    ) : null}
                                </div>
                                {service.description ? (
                                    <p className="line-clamp-1 text-sm text-slate-500">{service.description}</p>
                                ) : null}
                            </div>
                        ),
                    },
                    {
                        key: "category",
                        header: t('adminServices.category'),
                        cell: (service) => (
                            <StatusBadge tone="neutral">
                                {service.category?.name || t('adminServices.uncategorized')}
                            </StatusBadge>
                        ),
                    },
                    {
                        key: "price",
                        header: t('adminServices.price'),
                        className: "font-medium",
                        cell: (service) => (
                            <div className="flex flex-col">
                                <span>{formatPrice(service.pricing?.final_price_cents ?? service.price_cents, currency)}</span>
                                {service.pricing?.promo_applied && service.pricing.regular_price_cents ? (
                                    <span className="text-xs text-slate-500 line-through">
                                        {formatPrice(service.pricing.regular_price_cents, currency)}
                                    </span>
                                ) : null}
                            </div>
                        ),
                    },
                    {
                        key: "duration",
                        header: t('adminServices.duration'),
                        className: "text-slate-600",
                        cell: (service) => formatDuration(service.duration_minutes),
                    },
                    {
                        key: "status",
                        header: t('adminBookings.status'),
                        cell: (service) => (
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={service.is_active}
                                    onCheckedChange={() => toggleActiveStatus(service)}
                                />
                                <StatusBadge tone={service.is_active ? "success" : "neutral"} dot>
                                    {service.is_active ? t('adminServices.active') : t('adminServices.inactive')}
                                </StatusBadge>
                            </div>
                        ),
                    },
                    {
                        key: "actions",
                        header: t('adminServices.actions'),
                        headerClassName: "text-right",
                        className: "text-right",
                        cell: (service) => <div className="flex justify-end">{serviceActions(service)}</div>,
                    },
                ]}
                renderMobileItem={(service) => (
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-slate-950">{service.name}</h3>
                                    {service.is_invite_only ? (
                                        <StatusBadge tone="neutral">
                                            {t('adminServices.inviteOnly')}
                                        </StatusBadge>
                                    ) : null}
                                    <StatusBadge tone={service.is_active ? "success" : "neutral"} dot>
                                        {service.is_active ? t('adminServices.active') : t('adminServices.inactive')}
                                    </StatusBadge>
                                </div>
                                {service.description ? (
                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{service.description}</p>
                                ) : null}
                            </div>
                            {serviceActions(service)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 font-medium text-slate-900">
                                <DollarSign className="h-3 w-3" />
                                {formatPrice(service.pricing?.final_price_cents ?? service.price_cents, currency)}
                            </span>
                            {service.pricing?.promo_applied && service.pricing.regular_price_cents ? (
                                <span className="text-xs text-slate-500 line-through">
                                    {formatPrice(service.pricing.regular_price_cents, currency)}
                                </span>
                            ) : null}
                            <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="h-3 w-3" />
                                {formatDuration(service.duration_minutes)}
                            </span>
                            <StatusBadge tone="neutral">
                                {service.category?.name || t('adminServices.uncategorized')}
                            </StatusBadge>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-sm text-slate-500">{t('adminBookings.status')}</span>
                            <Switch
                                checked={service.is_active}
                                onCheckedChange={() => toggleActiveStatus(service)}
                            />
                        </div>
                    </div>
                )}
            />

            <DataPagination page={page} totalItems={filteredServices.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel={t('adminServices.title').toLowerCase()} />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setDeletingService(null);
                }}
                title={t('common.delete')}
                description={t('adminServices.deleteConfirm')}
                confirmLabel={submitting ? t('adminServices.deleting') : t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="destructive"
                loading={submitting}
                onConfirm={handleDelete}
            />

        </AdminPageShell>
    );
}
