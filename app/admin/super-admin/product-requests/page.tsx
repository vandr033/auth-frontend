"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { useT } from "@/lib/i18n";
import { resolveBackendUrl } from "@/lib/api-url";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ProductAccessRequestRow, ProductCode } from "@/types/product-access";

const PRODUCT_OPTIONS: Array<{ value: ProductCode; label: string }> = [
    { value: "RESERVAS", label: "Reservas" },
    { value: "EVENTOS", label: "Eventos" },
    { value: "CLASES", label: "Clases" },
    { value: "PERSONALIZACION", label: "Personalización" },
    { value: "CRM", label: "CRM" },
    { value: "MENSAJERIA", label: "Mensajería" },
    { value: "METRICAS", label: "Métricas" },
    { value: "MARKETPLACE", label: "Marketplace" },
];

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-BO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(resolveBackendUrl(path), {
        credentials: "include",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(
            (typeof payload?.message === "string" && payload.message) ||
            `Request failed: ${response.status}`,
        );
    }

    return payload as T;
}

export default function SuperAdminProductRequestsPage() {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<ProductAccessRequestRow[]>([]);
    const [search, setSearch] = useState("");
    const [productCode, setProductCode] = useState<string>("all");
    const [status, setStatus] = useState<string>("PENDING");
    const [actingId, setActingId] = useState<number | null>(null);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (search.trim()) query.set("search", search.trim());
            if (productCode !== "all") query.set("productCode", productCode);
            if (status !== "all") query.set("status", status);

            const data = await fetchJson<{ data: { rows: ProductAccessRequestRow[] } }>(
                `/api/super-admin/product-requests?${query.toString()}`,
            );
            setRows(data.data.rows);
        } catch (error) {
            await notify.error(
                error instanceof Error ? error.message : t("superAdminProductRequests.loadError"),
            );
        } finally {
            setLoading(false);
        }
    }, [productCode, search, status, t]);

    useEffect(() => {
        void loadRows();
    }, [loadRows]);

    const handleAction = useCallback(async (
        requestId: number,
        action: "approve" | "reject" | "cancel",
    ) => {
        const confirmCopy = {
            approve: t("superAdminProductRequests.confirmApprove"),
            reject: t("superAdminProductRequests.confirmReject"),
            cancel: t("superAdminProductRequests.confirmCancel"),
        };

        const confirmation = await notify.confirm(confirmCopy[action], undefined, {
            confirmButtonText: t("common.confirm"),
            cancelButtonText: t("common.cancel"),
            variant: action === "approve" ? "default" : "destructive",
        });

        if (!confirmation.isConfirmed) return;

        setActingId(requestId);
        try {
            await fetchJson(`/api/super-admin/product-requests/${requestId}/${action}`, {
                method: "POST",
                body: JSON.stringify({}),
            });
            await notify.success(t("superAdminProductRequests.actionSuccess"));
            await loadRows();
        } catch (error) {
            await notify.error(
                error instanceof Error ? error.message : t("superAdminProductRequests.actionError"),
            );
        } finally {
            setActingId(null);
        }
    }, [loadRows, t]);

    const hasRows = rows.length > 0;
    const statusItems = useMemo(() => ([
        { value: "all", label: t("superAdminProductRequests.allStatuses") },
        { value: "PENDING", label: t("superAdminProductRequests.pendingOnly") },
        { value: "APPROVED", label: t("superAdminProductRequests.approved") },
        { value: "REJECTED", label: t("superAdminProductRequests.rejected") },
        { value: "CANCELLED", label: t("superAdminProductRequests.cancelled") },
    ]), [t]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminProductRequests.title")}</h1>
                    <p className="text-sm text-slate-500">{t("superAdminProductRequests.subtitle")}</p>
                </div>
                <Button variant="outline" onClick={() => void loadRows()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("superAdminProductRequests.refresh")}
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr_0.7fr]">
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("superAdminProductRequests.searchPlaceholder")}
                />
                <Select value={productCode} onValueChange={setProductCode}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("superAdminProductRequests.allProducts")}</SelectItem>
                        {PRODUCT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statusItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
                </div>
            ) : !hasRows ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                    {t("superAdminProductRequests.empty")}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("superAdminProductRequests.company")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.requester")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.product")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.source")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.status")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.createdAt")}</TableHead>
                                <TableHead>{t("superAdminProductRequests.message")}</TableHead>
                                <TableHead className="text-right">{t("superAdminProductRequests.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const isPending = row.status === "PENDING";
                                const requesterName =
                                    row.requestedByUser?.name ||
                                    [row.requestedByUser?.firstName, row.requestedByUser?.lastName].filter(Boolean).join(" ") ||
                                    row.requestedByUser?.email ||
                                    "—";

                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            {row.company?.name || `#${row.companyId}`}
                                        </TableCell>
                                        <TableCell>{requesterName}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{row.recommendation.requestLabel}</div>
                                            <div className="text-xs text-slate-500">{row.capability}</div>
                                        </TableCell>
                                        <TableCell>{row.source}</TableCell>
                                        <TableCell>{row.status}</TableCell>
                                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                                        <TableCell className="max-w-xs whitespace-pre-wrap text-sm text-slate-600">
                                            {row.message || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => void handleAction(row.id, "approve")}
                                                    disabled={!isPending || actingId === row.id}
                                                >
                                                    {actingId === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    {t("superAdminProductRequests.approve")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => void handleAction(row.id, "reject")}
                                                    disabled={!isPending || actingId === row.id}
                                                >
                                                    {t("superAdminProductRequests.reject")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => void handleAction(row.id, "cancel")}
                                                    disabled={!isPending || actingId === row.id}
                                                >
                                                    {t("superAdminProductRequests.cancel")}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
