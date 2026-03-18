"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    Mail,
    MessageCircle,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { notify } from "@/lib/notify";
import { formatCurrencyFromCents } from "@/lib/currency";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface CustomerRecord {
    id: number;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    phonePrefix: string | null;
    shops: { id: number; name: string }[];
    totalBookings: number;
    totalSpentCents: number;
    lastBookingAt: string | null;
}

interface ShopOption {
    id: number;
    name: string;
}

const PAGE_SIZE = 20;
const formatCurrency = (cents: number) => formatCurrencyFromCents(cents);

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export default function SuperAdminCustomersPage() {
    const t = useT();

    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchQuery, setSearchQuery] = useState("");
    const [shopFilter, setShopFilter] = useState<string>("all");
    const [shops, setShops] = useState<ShopOption[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch shops for dropdown
    useEffect(() => {
        fetch(getApiUrl("/api/super-admin/shops?limit=200"), { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                const shopsList = (data.data?.shops || data.data || []) as Array<{ id: number; name: string }>;
                setShops(shopsList.map((s) => ({ id: s.id, name: s.name })));
            })
            .catch(() => {});
    }, []);

    const fetchData = useCallback(async (currentPage: number, search: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (search.trim()) params.set("search", search.trim());
            if (shopFilter !== "all") params.set("shopId", shopFilter);

            const res = await fetch(getApiUrl(`/api/super-admin/customers?${params}`), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch customers");

            const json = await res.json();
            setCustomers(json.data?.customers || []);
            const pagination = json.data?.pagination;
            if (pagination) {
                setTotalPages(pagination.totalPages || 1);
                setTotal(pagination.total || 0);
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : "Error loading customers");
        } finally {
            setLoading(false);
        }
    }, [shopFilter]);

    useEffect(() => {
        void fetchData(page, searchQuery);
    }, [page, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            void fetchData(1, value);
        }, 300);
    };

    const handleShopFilterChange = (value: string) => {
        setShopFilter(value);
        setPage(1);
    };

    // Re-fetch when shop filter changes
    useEffect(() => {
        setPage(1);
        void fetchData(1, searchQuery);
    }, [shopFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const buildWhatsAppUrl = (customer: CustomerRecord) => {
        if (!customer.phone) return null;
        const phone = customer.phone.replace(/\D/g, "");
        const prefix = customer.phonePrefix?.replace(/\D/g, "") || "";
        return `https://wa.me/${prefix}${phone}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminCustomers.title")}</h1>
                <p className="text-slate-500">{t("superAdminCustomers.subtitle")}</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="relative max-w-sm flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={t("superAdminCustomers.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="w-48">
                    <Select value={shopFilter} onValueChange={handleShopFilterChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("superAdminBookings.allShops")}</SelectItem>
                            {shops.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <Card>
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminCustomers.name")}</TableHead>
                                    <TableHead>{t("adminCustomers.email")}</TableHead>
                                    <TableHead>{t("adminCustomers.phone")}</TableHead>
                                    <TableHead>{t("superAdminCustomers.shops")}</TableHead>
                                    <TableHead className="text-right">{t("adminCustomers.bookings")}</TableHead>
                                    <TableHead className="text-right">{t("adminCustomers.totalSpent")}</TableHead>
                                    <TableHead>{t("adminCustomers.lastBooking")}</TableHead>
                                    <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center text-slate-400">
                                                <Users className="h-10 w-10 mb-3" />
                                                <p className="text-sm">
                                                    {searchQuery
                                                        ? t("adminCustomers.noSearchResults")
                                                        : t("adminCustomers.noCustomers")}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => {
                                        const waUrl = buildWhatsAppUrl(customer);
                                        return (
                                            <TableRow key={`${customer.userId}-${customer.id}`}>
                                                <TableCell className="font-medium">{customer.name}</TableCell>
                                                <TableCell className="text-slate-600">{customer.email || "—"}</TableCell>
                                                <TableCell className="text-slate-600">
                                                    {customer.phone
                                                        ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {customer.shops.slice(0, 3).map((s) => (
                                                            <Badge key={s.id} variant="secondary" className="text-xs">
                                                                {s.name}
                                                            </Badge>
                                                        ))}
                                                        {customer.shops.length > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{customer.shops.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {customer.totalBookings}
                                                </TableCell>
                                                <TableCell className="text-right text-emerald-600 font-medium">
                                                    {formatCurrency(customer.totalSpentCents)}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {formatDate(customer.lastBookingAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {customer.email && (
                                                            <a
                                                                href={`mailto:${customer.email}`}
                                                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                                                                title={t("adminCustomers.sendEmail")}
                                                            >
                                                                <Mail className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                        {waUrl && (
                                                            <a
                                                                href={waUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors"
                                                                title={t("adminCustomers.whatsapp")}
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                    </div>
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
