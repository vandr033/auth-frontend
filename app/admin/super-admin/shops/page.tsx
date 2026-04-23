"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Users,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    LogIn,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActionMenu, ConfirmDialog, DataTable, DataToolbar, EmptyState, StatusBadge } from "@/components/admin/shared";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { useRouter } from "next/navigation";
import type { SuperAdminShop } from "@/types/super-admin";
import { notify } from "@/lib/notify";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

const PAGE_SIZE = 20;

export default function ShopsPage() {
    const t = useT();
    const { locale } = useI18n();
    const { isAuthenticated, isSuperAdmin, loading: authLoading, refreshSession } = useAdminAuth();
    const router = useRouter();

    const getCompanyTypeName = (shop: SuperAdminShop): string =>
        getLocalizedText({
            text: shop.company_type?.name,
            translations: shop.company_type?.name_i18n,
            locale,
        });

    // State
    const [shops, setShops] = useState<SuperAdminShop[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingShop, setDeletingShop] = useState<SuperAdminShop | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Debounce timer ref
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch shops with server-side pagination and search
    const fetchData = useCallback(async (currentPage: number, search: string) => {
        setLoading(true);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (search.trim()) {
                params.set("search", search.trim());
            }

            const response = await fetch(getApiUrl(`/api/super-admin/shops?${params}`), {
                credentials: "include",
            });

            if (!response.ok) throw new Error(t("superAdminShops.fetchShopsError"));

            const data = await response.json();
            const shopsList = data.data?.shops || data.data || [];
            const pagination = data.data?.pagination;

            setShops(shopsList);
            if (pagination) {
                setTotalPages(pagination.totalPages || 1);
                setTotal(pagination.total || 0);
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminShops.loadShopsError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchData(page, searchQuery);
        }
    }, [isAuthenticated, isSuperAdmin, page, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced search: reset to page 1 on search change
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            void fetchData(1, value);
        }, 300);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingShop) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/super-admin/shops/${deletingShop.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminShops.deleteFailed"));
            }

            setIsDeleteDialogOpen(false);
            setDeletingShop(null);
            await fetchData(page, searchQuery);
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminShops.deleteFailed"));
            setIsDeleteDialogOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Impersonate shop
    const handleImpersonate = async (shopId: number) => {
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
            void notify.error(err instanceof Error ? err.message : t("superAdminShops.impersonateFailed"));
        }
    };

    // Loading state (only show full-page loader on initial auth load)
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
                <span className="ml-2 text-slate-600">{t("superAdminShops.loadingShops")}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminShops.title")}</h1>
                    <p className="text-slate-500">{t("superAdminShops.subtitle")}</p>
                </div>
                <Link href="/admin/super-admin/shops/new">
                    <Button className="bg-admin-brand hover:bg-admin-brand-hover text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("superAdminShops.createShop")}
                    </Button>
                </Link>
            </div>

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("superAdminShops.searchPlaceholder")}
                onSearchChange={handleSearchChange}
                summary={t("superAdminShops.showing", {
                    from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
                    to: Math.min(page * PAGE_SIZE, total),
                    total,
                })}
            />

            <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
                        </div>
                    )}
                    <DataTable
                        data={shops}
                        getRowKey={(shop) => shop.id}
                        empty={
                            <EmptyState
                                title={searchQuery ? t("superAdminShops.noSearchResults") : t("superAdminShops.noShops")}
                            />
                        }
                        columns={[
                            {
                                key: "shop",
                                header: t("superAdminShops.shop"),
                                cell: (shop) => (
                                    <div>
                                        <p className="font-medium text-slate-900">{shop.name}</p>
                                        <p className="text-sm text-slate-500">{shop.slug}</p>
                                    </div>
                                ),
                            },
                            {
                                key: "location",
                                header: t("superAdminShops.location"),
                                className: "text-slate-600",
                                cell: (shop) => shop.city || shop.state || t("superAdminShops.notSet"),
                            },
                            {
                                key: "type",
                                header: t("superAdminShops.type"),
                                cell: (shop) => (
                                    <StatusBadge tone="neutral">
                                        {getCompanyTypeName(shop) || t("superAdminShops.unknown")}
                                    </StatusBadge>
                                ),
                            },
                            {
                                key: "users",
                                header: t("superAdminShops.users"),
                                cell: (shop) => (
                                    <StatusBadge tone="neutral">
                                        {t("superAdminShops.usersCount", { count: shop.user_count || 0 })}
                                    </StatusBadge>
                                ),
                            },
                            {
                                key: "status",
                                header: t("adminBookings.status"),
                                cell: (shop) => (
                                    <StatusBadge tone={shop.is_active ? "success" : "neutral"}>
                                        {shop.is_active ? t("adminServices.active") : t("adminServices.inactive")}
                                    </StatusBadge>
                                ),
                            },
                            {
                                key: "actions",
                                header: t("adminCustomers.actions"),
                                headerClassName: "text-right",
                                className: "text-right",
                                cell: (shop) => (
                                    <div className="flex justify-end">
                                        <ActionMenu
                                            label={t("adminCustomers.actions")}
                                            items={[
                                                {
                                                    label: t("superAdminShops.enterShop"),
                                                    icon: <LogIn className="h-4 w-4" />,
                                                    onSelect: () => void handleImpersonate(shop.id),
                                                },
                                                {
                                                    label: t("superAdminShops.manageUsers"),
                                                    icon: <Users className="h-4 w-4" />,
                                                    href: `/admin/super-admin/shops/${shop.id}/users`,
                                                },
                                                {
                                                    label: t("superAdminShops.editShop"),
                                                    icon: <Pencil className="h-4 w-4" />,
                                                    href: `/admin/super-admin/shops/${shop.id}`,
                                                },
                                                {
                                                    label: t("superAdminShops.viewPublicPage"),
                                                    icon: <ExternalLink className="h-4 w-4" />,
                                                    onSelect: () => window.open(`/shop/${shop.slug}`, "_blank", "noopener,noreferrer"),
                                                },
                                                {
                                                    label: t("superAdminShops.deleteShop"),
                                                    icon: <Trash2 className="h-4 w-4" />,
                                                    destructive: true,
                                                    separatorBefore: true,
                                                    onSelect: () => {
                                                        setDeletingShop(shop);
                                                        setIsDeleteDialogOpen(true);
                                                    },
                                                },
                                            ]}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                        renderMobileItem={(shop) => (
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-950">{shop.name}</h3>
                                        <p className="text-xs text-slate-500">{shop.slug}</p>
                                    </div>
                                    <ActionMenu
                                        label={t("adminCustomers.actions")}
                                        showLabel
                                        items={[
                                            {
                                                label: t("superAdminShops.enterShop"),
                                                icon: <LogIn className="h-4 w-4" />,
                                                onSelect: () => void handleImpersonate(shop.id),
                                            },
                                            {
                                                label: t("superAdminShops.manageUsers"),
                                                icon: <Users className="h-4 w-4" />,
                                                href: `/admin/super-admin/shops/${shop.id}/users`,
                                            },
                                            {
                                                label: t("superAdminShops.editShop"),
                                                icon: <Pencil className="h-4 w-4" />,
                                                href: `/admin/super-admin/shops/${shop.id}`,
                                            },
                                            {
                                                label: t("superAdminShops.viewPublicPage"),
                                                icon: <ExternalLink className="h-4 w-4" />,
                                                onSelect: () => window.open(`/shop/${shop.slug}`, "_blank", "noopener,noreferrer"),
                                            },
                                            {
                                                label: t("superAdminShops.deleteShop"),
                                                icon: <Trash2 className="h-4 w-4" />,
                                                destructive: true,
                                                separatorBefore: true,
                                                onSelect: () => {
                                                    setDeletingShop(shop);
                                                    setIsDeleteDialogOpen(true);
                                                },
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone={shop.is_active ? "success" : "neutral"}>
                                        {shop.is_active ? t("adminServices.active") : t("adminServices.inactive")}
                                    </StatusBadge>
                                    <StatusBadge tone="neutral">
                                        {getCompanyTypeName(shop) || t("superAdminShops.unknown")}
                                    </StatusBadge>
                                    <StatusBadge tone="neutral">
                                        {t("superAdminShops.usersCount", { count: shop.user_count || 0 })}
                                    </StatusBadge>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {t("superAdminShops.location")}: {shop.city || shop.state || t("superAdminShops.notSet")}
                                </p>
                            </div>
                        )}
                    />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            {t("superAdminShops.showing", {
                                from: (page - 1) * PAGE_SIZE + 1,
                                to: Math.min(page * PAGE_SIZE, total),
                                total,
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t("superAdminShops.previous")}
                            </Button>
                            <span className="text-sm text-slate-600 px-2">
                                {t("superAdminShops.pageOf", { page, totalPages })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                            >
                                {t("superAdminShops.next")}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setDeletingShop(null);
                }}
                title={t("superAdminShops.deleteShop")}
                description={t("superAdminShops.deleteConfirm", { name: deletingShop?.name || "" })}
                confirmLabel={submitting ? t("superAdminShops.deleting") : t("common.delete")}
                cancelLabel={t("common.cancel")}
                variant="destructive"
                loading={submitting}
                onConfirm={handleDelete}
            />
        </div>
    );
}
