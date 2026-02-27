"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Users,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface StaffRecord {
    id: number;
    displayName: string;
    shopName: string;
    shopId: number;
    email: string;
    role: string;
    status: string;
    isBookable: boolean;
    startDate: string | null;
    endDate: string | null;
    totalBookings: number;
    createdAt: string;
}

interface ShopOption {
    id: number;
    name: string;
}

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    INACTIVE: "bg-slate-100 text-slate-600",
};

const ROLE_STYLES: Record<string, string> = {
    OWNER: "bg-violet-100 text-violet-800",
    ADMIN: "bg-blue-100 text-blue-800",
    STAFF: "bg-slate-100 text-slate-700",
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

function isExpired(endDate: string | null): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
}

export default function SuperAdminStaffPage() {
    const t = useT();

    const [staff, setStaff] = useState<StaffRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [shopFilter, setShopFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [shops, setShops] = useState<ShopOption[]>([]);

    // Fetch shops for dropdown
    useEffect(() => {
        fetch(getApiUrl("/api/super-admin/shops?limit=200"), { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                const shopsList = data.data?.shops || data.data || [];
                setShops(shopsList.map((s: any) => ({ id: s.id, name: s.name })));
            })
            .catch(() => {});
    }, []);

    const fetchData = useCallback(async (currentPage: number) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (shopFilter !== "all") params.set("shopId", shopFilter);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (roleFilter !== "all") params.set("role", roleFilter);

            const res = await fetch(getApiUrl(`/api/super-admin/staff?${params}`), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch staff");

            const json = await res.json();
            setStaff(json.data?.staff || []);
            const pagination = json.data?.pagination;
            if (pagination) {
                setTotalPages(pagination.totalPages || 1);
                setTotal(pagination.total || 0);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error loading staff");
        } finally {
            setLoading(false);
        }
    }, [shopFilter, statusFilter, roleFilter]);

    useEffect(() => {
        void fetchData(page);
    }, [page, fetchData]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
        void fetchData(1);
    }, [shopFilter, statusFilter, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminStaff.title")}</h1>
                <p className="text-slate-500">{t("superAdminStaff.subtitle")}</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="w-48">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminBookings.shop")}</label>
                    <Select value={shopFilter} onValueChange={(v) => setShopFilter(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("superAdminBookings.allShops")}</SelectItem>
                            {shops.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-40">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t("adminBookings.status")}</label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("superAdminBookings.allStatuses")}</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-40">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminStaff.role")}</label>
                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("superAdminStaff.allRoles")}</SelectItem>
                            <SelectItem value="OWNER">Owner</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
            )}

            {/* Table */}
            <Card>
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("superAdminStaff.name")}</TableHead>
                                    <TableHead>{t("superAdminBookings.shop")}</TableHead>
                                    <TableHead>{t("superAdminStaff.role")}</TableHead>
                                    <TableHead>{t("adminBookings.status")}</TableHead>
                                    <TableHead>{t("superAdminStaff.bookable")}</TableHead>
                                    <TableHead>{t("superAdminStaff.startDate")}</TableHead>
                                    <TableHead>{t("superAdminStaff.endDate")}</TableHead>
                                    <TableHead className="text-right">{t("superAdminStaff.totalBookings")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center text-slate-400">
                                                <Users className="h-10 w-10 mb-3" />
                                                <p className="text-sm">{t("superAdminStaff.noStaff")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staff.map((s) => {
                                        const expired = isExpired(s.endDate);
                                        return (
                                            <TableRow key={s.id} className={cn(expired && "bg-rose-50/50")}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <p className="font-medium">{s.displayName}</p>
                                                            <p className="text-xs text-slate-400">{s.email}</p>
                                                        </div>
                                                        {expired && (
                                                            <span title={t("superAdminStaff.expired")}>
                                                                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{s.shopName}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`border-0 text-xs ${ROLE_STYLES[s.role] || ""}`}>
                                                        {s.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`border-0 text-xs ${STATUS_STYLES[s.status] || ""}`}>
                                                        {s.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={s.isBookable ? "default" : "secondary"} className={cn(
                                                        "text-xs",
                                                        s.isBookable ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        {s.isBookable ? t("superAdminStaff.yes") : t("superAdminStaff.no")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-500">
                                                    {formatDate(s.startDate)}
                                                </TableCell>
                                                <TableCell className={cn("text-sm", expired ? "text-rose-500 font-medium" : "text-slate-500")}>
                                                    {formatDate(s.endDate)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {s.totalBookings}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
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
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t("superAdminShops.previous")}
                            </Button>
                            <span className="text-sm text-slate-600 px-2">
                                {t("superAdminShops.pageOf", { page, totalPages })}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                                {t("superAdminShops.next")}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
