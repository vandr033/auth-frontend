"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    downloadCustomerImportTemplate,
    getCustomers,
    importCustomersFile,
    sendMassCustomerMessage,
    type CustomerRecord,
} from "../../lib/adminApi";
import { Search, Loader2, Mail, MessageCircle, Upload, Download, Users, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";

type Client = CustomerRecord & {
    createdAt?: string | null;
};

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

function toCSV(clients: Client[]) {
    const headers = ["Nombre", "Email", "Teléfono", "Fecha de registro"];
    const rows = clients.map((c) => [
        c.name ?? "",
        c.email ?? "",
        `${c.phonePrefix ? `+${c.phonePrefix} ` : ""}${c.phone ?? ""}`.trim(),
        c.createdAt ?? "",
    ].join(","));
    return [headers.join(","), ...rows].join("\n");
}

export default function CustomersPage() {
    const t = useT();
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isMassDialogOpen, setIsMassDialogOpen] = useState(false);
    const [massMessageBody, setMassMessageBody] = useState("");
    const [sendingMassMessage, setSendingMassMessage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await getCustomers(debouncedSearch || undefined);
            setCustomers(rows);
        } catch (err: unknown) {
            void notify.error(err instanceof Error ? err.message : "Failed to load customers");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    // Fetch customers
    useEffect(() => {
        void fetchCustomers();
    }, [fetchCustomers]);

    const handleDownloadTemplate = async () => {
        try {
            const blob = await downloadCustomerImportTemplate();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "customers-import-template.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            await notify.error(
                err instanceof Error ? err.message : t("adminCustomers.templateDownloadFailed"),
            );
        }
    };

    const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const result = await importCustomersFile(file);
            await notify.success(
                t("adminCustomers.importSuccess", {
                    imported: result.importedRows,
                    skipped: result.skippedRows,
                }),
            );
            await fetchCustomers();
        } catch (err: unknown) {
            await notify.error(err instanceof Error ? err.message : t("adminCustomers.importFailed"));
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSendMassMessage = async () => {
        const message = massMessageBody.trim();
        if (!message) {
            await notify.warning(t("adminCustomers.massMessageBodyRequired"));
            return;
        }

        setSendingMassMessage(true);
        try {
            const result = await sendMassCustomerMessage({
                message,
                search: debouncedSearch || undefined,
            });
            await notify.success(
                t("adminCustomers.massMessageSummary", {
                    sent: result.sent_total,
                    whatsapp: result.sent_whatsapp,
                    email: result.sent_email,
                    failed: result.failed,
                    noContact: result.skipped_no_contact,
                }),
            );
            setMassMessageBody("");
            setIsMassDialogOpen(false);
        } catch (err: unknown) {
            await notify.error(err instanceof Error ? err.message : t("adminCustomers.massMessageFailed"));
        } finally {
            setSendingMassMessage(false);
        }
    };

    const buildWhatsAppUrl = (customer: CustomerRecord) => {
        if (!customer.phone) return null;
        const phone = customer.phone.replace(/\D/g, "");
        const prefix = customer.phonePrefix?.replace(/\D/g, "") || "";
        return `https://wa.me/${prefix}${phone}`;
    };

    const handleDownloadClients = () => {
        const csv = toCSV(
            customers.map((c) => ({
                ...c,
                createdAt: c.lastBookingAt ?? "",
            })),
        );
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "clientes.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {t("adminNav.customers")}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t("adminCustomers.count", { count: customers.length })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleImportFileSelected}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDownloadClients}
                        disabled={loading || customers.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Clientes
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        disabled={importing}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {t("adminCustomers.downloadTemplate")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMassDialogOpen(true)}
                        disabled={loading || importing || sendingMassMessage}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        {t("adminCustomers.sendMassMessage")}
                    </Button>
                    <Button
                        type="button"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        {importing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        {importing ? t("adminCustomers.importing") : t("adminCustomers.importClients")}
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t("adminCustomers.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <Card className="border-slate-200">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users className="h-10 w-10 mb-3" />
                            <p className="text-sm">
                                {debouncedSearch
                                    ? t("adminCustomers.noSearchResults")
                                    : t("adminCustomers.noCustomers")}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 p-4 md:hidden">
                                {customers.map((customer) => {
                                    const waUrl = buildWhatsAppUrl(customer);
                                    const rowKey =
                                        customer.userId ||
                                        customer.email ||
                                        `${customer.phonePrefix || ""}${customer.phone || ""}` ||
                                        String(customer.id);
                                    return (
                                        <div key={rowKey} className="rounded-lg border border-slate-200 p-4">
                                            <p className="font-semibold text-slate-900">{customer.name}</p>
                                            <p className="mt-1 text-sm text-slate-600">{customer.email || "—"}</p>
                                            <p className="text-sm text-slate-600">
                                                {customer.phone
                                                    ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}`
                                                    : "—"}
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span>{t("adminCustomers.bookings")}: {customer.totalBookings}</span>
                                                <span className="text-right">{formatCurrency(customer.totalSpentCents)}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {t("adminCustomers.lastBooking")}: {formatDate(customer.lastBookingAt)}
                                            </p>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {customer.email ? (
                                                    <a
                                                        href={`mailto:${customer.email}`}
                                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                                                    >
                                                        <Mail className="h-4 w-4" />
                                                        {t("adminCustomers.sendEmail")}
                                                    </a>
                                                ) : (
                                                    <div />
                                                )}
                                                {waUrl ? (
                                                    <a
                                                        href={waUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-700"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                        {t("adminCustomers.whatsapp")}
                                                    </a>
                                                ) : (
                                                    <div />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("adminCustomers.name")}</TableHead>
                                        <TableHead>{t("adminCustomers.email")}</TableHead>
                                        <TableHead>{t("adminCustomers.phone")}</TableHead>
                                        <TableHead className="text-right">{t("adminCustomers.bookings")}</TableHead>
                                        <TableHead className="text-right">{t("adminCustomers.totalSpent")}</TableHead>
                                        <TableHead>{t("adminCustomers.lastBooking")}</TableHead>
                                        <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map((customer) => {
                                        const waUrl = buildWhatsAppUrl(customer);
                                        const rowKey =
                                            customer.userId ||
                                            customer.email ||
                                            `${customer.phonePrefix || ""}${customer.phone || ""}` ||
                                            String(customer.id);
                                        return (
                                            <TableRow key={rowKey}>
                                                <TableCell className="font-medium">
                                                    {customer.name}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {customer.email || "—"}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {customer.phone
                                                        ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}`
                                                        : "—"}
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
                                    })}
                                </TableBody>
                            </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isMassDialogOpen} onOpenChange={setIsMassDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("adminCustomers.sendMassMessageTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("adminCustomers.sendMassMessageDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t("adminCustomers.massMessageBodyLabel")}
                        </label>
                        <textarea
                            value={massMessageBody}
                            onChange={(e) => setMassMessageBody(e.target.value)}
                            placeholder={t("adminCustomers.massMessageBodyPlaceholder")}
                            rows={7}
                            maxLength={1500}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                            {t("adminCustomers.massMessageAudienceHint", { count: customers.length })}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMassDialogOpen(false)}
                            disabled={sendingMassMessage}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleSendMassMessage()}
                            disabled={sendingMassMessage || !massMessageBody.trim()}
                            className="bg-brand text-white hover:bg-brand-hover"
                        >
                            {sendingMassMessage ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            {t("adminCustomers.sendMassMessage")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
