"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    AlertCircle,
    Users,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    LogIn,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { useRouter } from "next/navigation";
import type { SuperAdminShop } from "@/types/super-admin";

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
    const [error, setError] = useState<string | null>(null);
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
        setError(null);

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
            setError(err instanceof Error ? err.message : t("superAdminShops.loadShopsError"));
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
            setError(err instanceof Error ? err.message : t("superAdminShops.deleteFailed"));
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
            setError(err instanceof Error ? err.message : t("superAdminShops.impersonateFailed"));
        }
    };

    // Loading state (only show full-page loader on initial auth load)
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
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
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("superAdminShops.createShop")}
                    </Button>
                </Link>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-auto"
                    >
                        {t("imageUpload.dismiss")}
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t("superAdminShops.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Table */}
            <Card>
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("superAdminShops.shop")}</TableHead>
                                <TableHead>{t("superAdminShops.location")}</TableHead>
                                <TableHead>{t("superAdminShops.type")}</TableHead>
                                <TableHead>{t("superAdminShops.users")}</TableHead>
                                <TableHead>{t("adminBookings.status")}</TableHead>
                                <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shops.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        {searchQuery ? t("superAdminShops.noSearchResults") : t("superAdminShops.noShops")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shops.map((shop) => (
                                    <TableRow key={shop.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{shop.name}</p>
                                                <p className="text-sm text-slate-500">{shop.slug}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {shop.city || shop.state || t("superAdminShops.notSet")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {getCompanyTypeName(shop) || t("superAdminShops.unknown")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {t("superAdminShops.usersCount", { count: shop.user_count || 0 })}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={shop.is_active
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                            }>
                                                {shop.is_active ? t("adminServices.active") : t("adminServices.inactive")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleImpersonate(shop.id)}
                                                    className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                                    title={t("superAdminShops.enterShop")}
                                                >
                                                    <LogIn className="h-4 w-4" />
                                                </Button>
                                                <Link href={`/admin/super-admin/shops/${shop.id}/users`}>
                                                    <Button variant="ghost" size="sm" title={t("superAdminShops.manageUsers")}>
                                                        <Users className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/admin/super-admin/shops/${shop.id}`}>
                                                    <Button variant="ghost" size="sm" title={t("superAdminShops.editShop")}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/shop/${shop.slug}`} target="_blank">
                                                    <Button variant="ghost" size="sm" title={t("superAdminShops.viewPublicPage")}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setDeletingShop(shop);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    title={t("superAdminShops.deleteShop")}
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
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
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
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("superAdminShops.deleteShop")}</DialogTitle>
                        <DialogDescription>
                            {t("superAdminShops.deleteConfirm", { name: deletingShop?.name || "" })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingShop(null);
                            }}
                        >
                            {t("common.cancel")}
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
                                    {t("superAdminShops.deleting")}
                                </>
                            ) : (
                                t("common.delete")
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
