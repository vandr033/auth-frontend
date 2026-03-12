"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    User,
    Scissors,
    DollarSign,
    Phone,
    Mail,
    X,
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { getImageUrl } from "@/utils/image-url";
import { notify } from "@/lib/notify";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface BookingRecord {
    id: number;
    shopName: string;
    shopId: number;
    clientName: string;
    clientEmail: string | null;
    clientPhone: string | null;
    clientPhonePrefix: string | null;
    startAt: string;
    endAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    totalPriceCents: number;
    staffName: string;
    staffId: number;
    services: { id: number; name: string; duration: number }[];
    notes: string | null;
    qrProofImageUrl: string | null;
    bookingType: string;
    createdAt: string;
}

interface ShopOption {
    id: number;
    name: string;
}

function toShopOptions(value: unknown): ShopOption[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const candidate = item as { id?: unknown; name?: unknown };
            if (typeof candidate.id !== "number" || typeof candidate.name !== "string") return null;
            return { id: candidate.id, name: candidate.name };
        })
        .filter((item): item is ShopOption => item !== null);
}

const PAGE_SIZE = 20;
const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_STYLES: Record<string, string> = {
    CONFIRMED: "bg-emerald-100 text-emerald-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-rose-100 text-rose-800",
    PENDING: "bg-amber-100 text-amber-800",
    NO_SHOW: "bg-gray-100 text-gray-800",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-800",
    UNPAID: "bg-slate-100 text-slate-800",
    PENDING_CONFIRMATION: "bg-amber-100 text-amber-800",
};

export default function SuperAdminBookingsPage() {
    const t = useT();

    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [shopFilter, setShopFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Shops list for filter
    const [shops, setShops] = useState<ShopOption[]>([]);

    // Detail sheet
    const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);

    // Fetch shops for dropdown
    useEffect(() => {
        fetch(getApiUrl("/api/super-admin/shops?limit=200"), { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                const shopsList = data.data?.shops || data.data || [];
                setShops(toShopOptions(shopsList));
            })
            .catch(() => {});
    }, []);

    const fetchData = useCallback(async (currentPage: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (shopFilter !== "all") params.set("shopId", shopFilter);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter);
            if (startDate) params.set("startDate", new Date(startDate).toISOString());
            if (endDate) params.set("endDate", new Date(endDate + "T23:59:59").toISOString());

            const res = await fetch(getApiUrl(`/api/super-admin/bookings?${params}`), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch bookings");

            const json = await res.json();
            setBookings(json.data?.bookings || []);
            const pagination = json.data?.pagination;
            if (pagination) {
                setTotalPages(pagination.totalPages || 1);
                setTotal(pagination.total || 0);
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : "Error loading bookings");
        } finally {
            setLoading(false);
        }
    }, [shopFilter, statusFilter, paymentStatusFilter, startDate, endDate]);

    useEffect(() => {
        void fetchData(page);
    }, [page, fetchData]);

    const clearFilters = () => {
        setShopFilter("all");
        setStatusFilter("all");
        setPaymentStatusFilter("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const hasFilters = shopFilter !== "all" || statusFilter !== "all" || paymentStatusFilter !== "all" || startDate || endDate;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminBookings.title")}</h1>
                <p className="text-slate-500">{t("superAdminBookings.subtitle")}</p>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="w-48">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminBookings.shop")}</label>
                        <Select value={shopFilter} onValueChange={(v) => { setShopFilter(v); setPage(1); }}>
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
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("superAdminBookings.allStatuses")}</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-44">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminBookings.paymentStatus")}</label>
                        <Select value={paymentStatusFilter} onValueChange={(v) => { setPaymentStatusFilter(v); setPage(1); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("superAdminBookings.allPayment")}</SelectItem>
                                <SelectItem value="UNPAID">Unpaid</SelectItem>
                                <SelectItem value="PENDING_CONFIRMATION">Pending</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminBookings.from")}</label>
                        <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t("superAdminBookings.to")}</label>
                        <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                    </div>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                            <X className="h-4 w-4 mr-1" />
                            {t("superAdminBookings.clearFilters")}
                        </Button>
                    )}
                </div>
            </Card>

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
                                    <TableHead>{t("superAdminBookings.shop")}</TableHead>
                                    <TableHead>{t("superAdminBookings.client")}</TableHead>
                                    <TableHead>{t("superAdminBookings.dateTime")}</TableHead>
                                    <TableHead>{t("superAdminBookings.services")}</TableHead>
                                    <TableHead>{t("superAdminBookings.staff")}</TableHead>
                                    <TableHead>{t("adminBookings.status")}</TableHead>
                                    <TableHead>{t("superAdminBookings.payment")}</TableHead>
                                    <TableHead className="text-right">{t("superAdminBookings.total")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                            {t("superAdminBookings.noBookings")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bookings.map((b) => (
                                        <TableRow
                                            key={b.id}
                                            className="cursor-pointer hover:bg-slate-50"
                                            onClick={() => setSelectedBooking(b)}
                                        >
                                            <TableCell className="font-medium text-sm">{b.shopName}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{b.clientName}</span>
                                                    <span className="text-xs text-slate-400">{b.clientEmail || b.clientPhone || ""}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{format(parseISO(b.startAt), "MMM d, yyyy")}</span>
                                                    <span className="text-xs text-slate-400">
                                                        {format(parseISO(b.startAt), "h:mm a")} - {format(parseISO(b.endAt), "h:mm a")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    {b.services.slice(0, 2).map((s) => (
                                                        <span key={s.id} className="text-xs">{s.name}</span>
                                                    ))}
                                                    {b.services.length > 2 && (
                                                        <span className="text-xs text-slate-400">+{b.services.length - 2} more</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{b.staffName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border-0 text-xs ${STATUS_STYLES[b.status] || ""}`}>
                                                    {b.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border-0 text-xs ${PAYMENT_STATUS_STYLES[b.paymentStatus] || ""}`}>
                                                    {b.paymentStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm">
                                                {formatCurrency(b.totalPriceCents)}
                                            </TableCell>
                                        </TableRow>
                                    ))
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

            {/* Booking Detail Sheet */}
            <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-md w-full">
                    {selectedBooking && (
                        <>
                            <SheetHeader className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="uppercase tracking-wider">#{selectedBooking.id}</Badge>
                                    <Badge className={STATUS_STYLES[selectedBooking.status] || ""}>
                                        {selectedBooking.status}
                                    </Badge>
                                </div>
                                <SheetTitle>{t("adminBookings.details")}</SheetTitle>
                                <SheetDescription>{selectedBooking.shopName}</SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Time & Staff */}
                                <div className="grid gap-4 p-4 rounded-lg bg-slate-50 border">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium">{t("adminBookings.date")}</p>
                                            <p className="text-sm text-slate-500">
                                                {format(parseISO(selectedBooking.startAt), "EEEE, MMMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium">{t("adminBookings.time")}</p>
                                            <p className="text-sm text-slate-500">
                                                {format(parseISO(selectedBooking.startAt), "h:mm a")} - {format(parseISO(selectedBooking.endAt), "h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium">{t("adminBookings.staffMember")}</p>
                                            <p className="text-sm text-slate-500">{selectedBooking.staffName}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">{t("adminBookings.customerInfo")}</h3>
                                    <div className="grid gap-3 p-4 rounded-lg bg-slate-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">{t("adminBookings.name")}</span>
                                            <span className="text-sm font-medium">{selectedBooking.clientName}</span>
                                        </div>
                                        {selectedBooking.clientPhone && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {t("adminSettings.phone")}
                                                </span>
                                                <span className="text-sm">{selectedBooking.clientPhonePrefix ? `+${selectedBooking.clientPhonePrefix} ` : ""}{selectedBooking.clientPhone}</span>
                                            </div>
                                        )}
                                        {selectedBooking.clientEmail && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                                    <Mail className="h-3 w-3" /> {t("adminSettings.email")}
                                                </span>
                                                <span className="text-sm">{selectedBooking.clientEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Services */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">{t("shopBooking.services")}</h3>
                                    <div className="border rounded-lg divide-y">
                                        {selectedBooking.services.map((service) => (
                                            <div key={service.id} className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Scissors className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-medium">{service.name}</span>
                                                </div>
                                                <span className="text-sm text-slate-500">{service.duration} min</span>
                                            </div>
                                        ))}
                                        <div className="p-3 bg-slate-50 flex items-center justify-between font-semibold">
                                            <span className="text-sm">{t("adminBookings.totalPrice")}</span>
                                            <span className="flex items-center">
                                                <DollarSign className="h-4 w-4" />
                                                {(selectedBooking.totalPriceCents / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">{t("adminBookings.paymentInfo")}</h3>
                                    <div className="grid gap-3 p-4 rounded-lg bg-slate-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">{t("adminBookings.method")}</span>
                                            <Badge variant="outline">{selectedBooking.paymentMethod}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">{t("superAdminBookings.paymentStatus")}</span>
                                            <Badge variant="outline" className={PAYMENT_STATUS_STYLES[selectedBooking.paymentStatus] || ""}>
                                                {selectedBooking.paymentStatus}
                                            </Badge>
                                        </div>
                                        {selectedBooking.paymentMethod === "QR" && selectedBooking.qrProofImageUrl && (
                                            <div className="mt-2 text-center">
                                                <p className="text-xs text-slate-500 mb-2 text-left">{t("adminBookings.paymentProof")}</p>
                                                <a
                                                    href={getImageUrl(selectedBooking.qrProofImageUrl) || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block rounded-lg overflow-hidden border hover:ring-2 ring-brand/50 transition-all group"
                                                >
                                                    <img
                                                        src={getImageUrl(selectedBooking.qrProofImageUrl) || ""}
                                                        alt={t("adminBookings.paymentProof")}
                                                        className="h-32 w-auto object-cover"
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedBooking.notes && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-2">{t("superAdminBookings.notes")}</h3>
                                        <p className="text-sm text-slate-600 p-3 rounded-lg bg-slate-50">{selectedBooking.notes}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
