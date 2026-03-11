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
    downloadCustomersExport,
    getCustomerHistory,
    getCustomers,
    importCustomersFile,
    sendMassCustomerMessage,
    type CustomerHistoryItem,
    type CustomerRecord,
} from "../../lib/adminApi";
import {
    Search,
    Loader2,
    Mail,
    MessageCircle,
    Upload,
    Download,
    Users,
    Send,
    Eye,
    Clock3,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

const HISTORY_PAGE_SIZE = 10;

const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(cents / 100);
};

const formatDate = (dateStr: string | null, fallback: string) => {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatDateTime = (dateStr: string, fallback: string) => {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

function getCustomerPreference(customer: CustomerRecord, fallback: string) {
    return customer.preferredServiceName || customer.preferredCategoryName || fallback;
}

function getStatusTranslationKey(status: CustomerHistoryItem["status"]) {
    if (status === "NO_SHOW") return "adminBookings.noShow";
    if (status === "PENDING") return "adminBookings.pending";
    if (status === "CONFIRMED") return "adminBookings.confirmed";
    if (status === "COMPLETED") return "adminBookings.completed";
    return "adminBookings.cancelled";
}

function getSourceTranslationKey(source: CustomerHistoryItem["source"]) {
    if (source === "MARKETPLACE") return "adminCustomers.bookingSourceMarketplace";
    if (source === "ADMIN") return "adminCustomers.bookingSourceAdmin";
    if (source === "MANUAL") return "adminCustomers.bookingSourceManual";
    return "adminCustomers.bookingSourceSalonSite";
}

export default function CustomersPage() {
    const t = useT();
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isMassDialogOpen, setIsMassDialogOpen] = useState(false);
    const [massMessageBody, setMassMessageBody] = useState("");
    const [sendingMassMessage, setSendingMassMessage] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState<CustomerRecord | null>(null);
    const [historyItems, setHistoryItems] = useState<CustomerHistoryItem[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyHasNextPage, setHistoryHasNextPage] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            void notify.error(err instanceof Error ? err.message : t("adminCustomers.loadCustomersFailed"));
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, t]);

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

    const handleDownloadClients = async () => {
        setExporting(true);
        try {
            const { blob, fileName } = await downloadCustomersExport(debouncedSearch || undefined);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || `customers-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            await notify.success(
                t("adminCustomers.exportSuccess", { count: customers.length }),
            );
        } catch (err: unknown) {
            await notify.error(err instanceof Error ? err.message : t("adminCustomers.exportFailed"));
        } finally {
            setExporting(false);
        }
    };

    const loadCustomerHistory = useCallback(async (customer: CustomerRecord, page: number, append: boolean) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const response = await getCustomerHistory(customer.customerKey, page, HISTORY_PAGE_SIZE);
            setHistoryItems((prev) => (append ? [...prev, ...response.items] : response.items));
            setHistoryPage(response.pagination.page);
            setHistoryTotal(response.pagination.total);
            setHistoryHasNextPage(response.pagination.hasNextPage);
        } catch (err: unknown) {
            setHistoryError(err instanceof Error ? err.message : t("adminCustomers.historyLoadFailed"));
        } finally {
            setHistoryLoading(false);
        }
    }, [t]);

    const handleOpenHistory = async (customer: CustomerRecord) => {
        setHistoryCustomer(customer);
        setHistoryItems([]);
        setHistoryPage(1);
        setHistoryTotal(0);
        setHistoryHasNextPage(false);
        setHistoryError(null);
        await loadCustomerHistory(customer, 1, false);
    };

    const handleLoadMoreHistory = async () => {
        if (!historyCustomer || historyLoading || !historyHasNextPage) return;
        await loadCustomerHistory(historyCustomer, historyPage + 1, true);
    };

    const notAvailable = t("adminCustomers.notAvailable");

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
                        onClick={() => void handleDownloadClients()}
                        disabled={loading || customers.length === 0 || exporting}
                    >
                        {exporting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {t("adminCustomers.downloadClients")}
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

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t("adminCustomers.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

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
                                    const preference = getCustomerPreference(customer, t("adminCustomers.noPreference"));

                                    return (
                                        <div key={rowKey} className="rounded-lg border border-slate-200 p-4">
                                            <p className="font-semibold text-slate-900">{customer.name}</p>
                                            <p className="mt-1 text-sm text-slate-600">{customer.email || notAvailable}</p>
                                            <p className="text-sm text-slate-600">
                                                {customer.phone
                                                    ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}`
                                                    : notAvailable}
                                            </p>
                                            <p className="mt-2 text-xs text-slate-500">
                                                {t("adminCustomers.preferenceLabel")}: {preference}
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span>{t("adminCustomers.bookings")}: {customer.totalBookings}</span>
                                                <span className="text-right">{formatCurrency(customer.totalSpentCents)}</span>
                                                <span>{t("adminCustomers.completedBookings")}: {customer.completedBookings}</span>
                                                <span className="text-right">{t("adminCustomers.cancelledBookings")}: {customer.cancelledBookings}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {t("adminCustomers.lastBooking")}: {formatDate(customer.lastBookingAt, notAvailable)}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {t("adminCustomers.nextBooking")}: {formatDate(customer.nextBookingAt, notAvailable)}
                                            </p>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void handleOpenHistory(customer)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {t("adminCustomers.viewFullHistory")}
                                                </Button>
                                                {waUrl ? (
                                                    <a
                                                        href={waUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-700"
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
                                            <TableHead>{t("adminCustomers.preferenceLabel")}</TableHead>
                                            <TableHead>{t("adminCustomers.bookingsSummary")}</TableHead>
                                            <TableHead className="text-right">{t("adminCustomers.spendSummary")}</TableHead>
                                            <TableHead>{t("adminCustomers.scheduleSummary")}</TableHead>
                                            <TableHead>{t("adminCustomers.favoriteStaff")}</TableHead>
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
                                            const preference = getCustomerPreference(customer, t("adminCustomers.noPreference"));

                                            return (
                                                <TableRow key={rowKey}>
                                                    <TableCell>
                                                        <p className="font-medium text-slate-900">{customer.name}</p>
                                                        <p className="text-xs text-slate-500">{customer.email || notAvailable}</p>
                                                    </TableCell>
                                                    <TableCell className="text-slate-700">
                                                        {preference}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs text-slate-600">
                                                            <p>{t("adminCustomers.totalBookingsLabel", { count: customer.totalBookings })}</p>
                                                            <p>{t("adminCustomers.completedBookingsLabel", { count: customer.completedBookings })}</p>
                                                            <p>{t("adminCustomers.cancelledBookingsLabel", { count: customer.cancelledBookings })}</p>
                                                            <p>{t("adminCustomers.noShowBookingsLabel", { count: customer.noShowBookings })}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className="font-medium text-emerald-600">{formatCurrency(customer.totalSpentCents)}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {t("adminCustomers.avgTicket", { amount: formatCurrency(customer.avgTicketCents) })}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs text-slate-600">
                                                            <p>{t("adminCustomers.lastBooking")}: {formatDate(customer.lastBookingAt, notAvailable)}</p>
                                                            <p>{t("adminCustomers.nextBooking")}: {formatDate(customer.nextBookingAt, notAvailable)}</p>
                                                            <p>{t("adminCustomers.frequencyLabel", { value: customer.bookingFrequencyPerMonth })}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-sm">
                                                        {customer.favoriteStaffName || notAvailable}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => void handleOpenHistory(customer)}
                                                                title={t("adminCustomers.viewFullHistory")}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
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

            <Dialog open={Boolean(historyCustomer)} onOpenChange={(open) => !open && setHistoryCustomer(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t("adminCustomers.fullHistoryTitle", { name: historyCustomer?.name || "" })}
                        </DialogTitle>
                        <DialogDescription>
                            {t("adminCustomers.fullHistoryDescription", { total: historyTotal })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        {historyLoading && historyItems.length === 0 ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                            </div>
                        ) : historyError ? (
                            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {historyError}
                            </p>
                        ) : historyItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                                <Clock3 className="h-8 w-8 mb-2" />
                                <p className="text-sm">{t("adminCustomers.noHistory")}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {historyItems.map((item) => {
                                    const serviceSummary = item.services
                                        .map((service) => service.serviceName || service.categoryName)
                                        .filter((value): value is string => Boolean(value))
                                        .slice(0, 3)
                                        .join(", ");

                                    return (
                                        <div key={item.id} className="rounded-md border border-slate-200 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {formatDateTime(item.startAt, notAvailable)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {t("adminCustomers.staff")}: {item.staffName || notAvailable}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {t(getSourceTranslationKey(item.source))}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {t(getStatusTranslationKey(item.status))}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                                <span>
                                                    {t("adminCustomers.services")}: {serviceSummary || t("adminCustomers.noServiceInfo")}
                                                </span>
                                                <span className="font-medium text-emerald-600">
                                                    {formatCurrency(item.totalPriceCents)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between">
                        <Button type="button" variant="outline" onClick={() => setHistoryCustomer(null)}>
                            {t("common.close")}
                        </Button>
                        {historyHasNextPage && (
                            <Button
                                type="button"
                                onClick={() => void handleLoadMoreHistory()}
                                disabled={historyLoading}
                            >
                                {historyLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                {t("adminCustomers.loadMoreHistory")}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
