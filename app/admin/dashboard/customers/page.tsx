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
    type CustomerRecord,
} from "../../lib/adminApi";
import { Search, Loader2, Mail, MessageCircle, Upload, Download, Users } from "lucide-react";
import { useT } from "@/lib/i18n";

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export default function CustomersPage() {
    const t = useT();
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importSummary, setImportSummary] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await getCustomers(debouncedSearch || undefined);
            setCustomers(rows);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load customers");
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
        } catch {
            setError(t("adminCustomers.templateDownloadFailed"));
        }
    };

    const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportSummary(null);
        setError(null);
        setImporting(true);
        try {
            const result = await importCustomersFile(file);
            setImportSummary(
                t("adminCustomers.importSuccess", {
                    imported: result.importedRows,
                    skipped: result.skippedRows,
                }),
            );
            await fetchCustomers();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("adminCustomers.importFailed"));
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const buildWhatsAppUrl = (customer: CustomerRecord) => {
        if (!customer.phone) return null;
        const phone = customer.phone.replace(/\D/g, "");
        const prefix = customer.phonePrefix?.replace(/\D/g, "") || "";
        return `https://wa.me/${prefix}${phone}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {t("adminNav.customers")}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t("adminCustomers.count", { count: customers.length })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                        onClick={handleDownloadTemplate}
                        disabled={importing}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {t("adminCustomers.downloadTemplate")}
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

            {/* Error */}
            {error && (
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="pt-6">
                        <p className="text-rose-700 text-sm">{error}</p>
                    </CardContent>
                </Card>
            )}

            {importSummary && (
                <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="pt-6">
                        <p className="text-emerald-700 text-sm">{importSummary}</p>
                    </CardContent>
                </Card>
            )}

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
                        <div className="overflow-x-auto">
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
