"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    getInterestCaptureLeads,
    getCustomerGroupPayments,
    getCustomerHistory,
    getCustomers,
    importCustomersFile,
    sendMassCustomerMessage,
    type AdminGroupPaymentRow,
    type CustomerHistoryItem,
    type CustomerGroupPaymentsResponse,
    type CustomerRecord,
    type InterestCaptureLead,
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
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { formatCurrencyFromCents } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HISTORY_PAGE_SIZE = 10;

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
    const { companyUser, user } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const formatCurrency = (cents: number) => formatCurrencyFromCents(cents, currency);
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canImportExport = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "CUSTOMER_IMPORT_EXPORT");
    const canBulkMessaging = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "BULK_WHATSAPP_MESSAGING");
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [interestLeads, setInterestLeads] = useState<InterestCaptureLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [interestLoading, setInterestLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [interestSearchQuery, setInterestSearchQuery] = useState("");
    const [interestSourceFilter, setInterestSourceFilter] = useState<"ALL" | "EVENT" | "CLASS">("ALL");
    const [interestItemFilter, setInterestItemFilter] = useState("ALL");
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
    const [historyTab, setHistoryTab] = useState<"bookings" | "group-payments">("bookings");
    const [groupPaymentsData, setGroupPaymentsData] = useState<CustomerGroupPaymentsResponse | null>(null);
    const [groupPaymentsLoading, setGroupPaymentsLoading] = useState(false);
    const [groupPaymentsError, setGroupPaymentsError] = useState<string | null>(null);
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

    const fetchInterestLeads = useCallback(async () => {
        setInterestLoading(true);
        try {
            const rows = await getInterestCaptureLeads();
            setInterestLeads(rows);
        } catch (err: unknown) {
            void notify.error(err instanceof Error ? err.message : "No se pudo cargar la captación de interesados");
        } finally {
            setInterestLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchInterestLeads();
    }, [fetchInterestLeads]);

    const handleDownloadTemplate = async () => {
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }
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
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }

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
        if (!canBulkMessaging) {
            await notify.warning(t("planEnforcement.availableOnPro"));
            return;
        }

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
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }

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

    const loadCustomerGroupPayments = useCallback(async (customer: CustomerRecord) => {
        setGroupPaymentsLoading(true);
        setGroupPaymentsError(null);
        try {
            const response = await getCustomerGroupPayments(customer.customerKey, 1, 100);
            setGroupPaymentsData(response);
        } catch (err: unknown) {
            setGroupPaymentsError(err instanceof Error ? err.message : t("adminCustomers.groupPaymentsLoadFailed"));
        } finally {
            setGroupPaymentsLoading(false);
        }
    }, [t]);

    const handleOpenHistory = async (customer: CustomerRecord) => {
        setHistoryCustomer(customer);
        setHistoryTab("bookings");
        setHistoryItems([]);
        setHistoryPage(1);
        setHistoryTotal(0);
        setHistoryHasNextPage(false);
        setHistoryError(null);
        setGroupPaymentsData(null);
        setGroupPaymentsError(null);
        await Promise.all([
            loadCustomerHistory(customer, 1, false),
            loadCustomerGroupPayments(customer),
        ]);
    };

    const handleLoadMoreHistory = async () => {
        if (!historyCustomer || historyLoading || !historyHasNextPage) return;
        await loadCustomerHistory(historyCustomer, historyPage + 1, true);
    };

    const interestItemOptions = useMemo(() => {
        const options = new Map<string, { value: string; label: string }>();
        interestLeads.forEach((lead) => {
            if (interestSourceFilter !== "ALL" && lead.source !== interestSourceFilter) return;
            const value = `${lead.source}:${lead.itemId}`;
            options.set(value, { value, label: `${lead.sourceLabel}: ${lead.itemTitle}` });
        });
        return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [interestLeads, interestSourceFilter]);

    const filteredInterestLeads = useMemo(() => {
        const query = interestSearchQuery.trim().toLowerCase();
        return interestLeads.filter((lead) => {
            if (interestSourceFilter !== "ALL" && lead.source !== interestSourceFilter) return false;
            if (interestItemFilter !== "ALL" && `${lead.source}:${lead.itemId}` !== interestItemFilter) return false;
            if (!query) return true;
            return [
                lead.personName,
                lead.email,
                lead.phoneNumber,
                lead.itemTitle,
                lead.status,
            ].filter(Boolean).join(" ").toLowerCase().includes(query);
        });
    }, [interestItemFilter, interestLeads, interestSearchQuery, interestSourceFilter]);

    const exportInterestLeadsCsv = () => {
        const headers = ["name", "email", "phone", "type", "item", "created_at", "status"];
        const rows = filteredInterestLeads.map((lead) => [
            lead.personName || "",
            lead.email || "",
            lead.phonePrefix && lead.phoneNumber ? `+${lead.phonePrefix}${lead.phoneNumber}` : "",
            lead.sourceLabel,
            lead.itemTitle,
            lead.createdAt,
            lead.status,
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => {
                const text = String(cell).replace(/"/g, '""');
                return /[",\n]/.test(text) ? `"${text}"` : text;
            }).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `captacion-interesados-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const buildLeadWhatsAppUrl = (lead: InterestCaptureLead) => {
        if (!lead.phoneNumber) return null;
        const digits = `${lead.phonePrefix || ""}${lead.phoneNumber}`.replace(/\D/g, "");
        return digits ? `https://wa.me/${digits}` : null;
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
                        disabled={loading || customers.length === 0 || exporting || !canImportExport}
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
                        disabled={importing || !canImportExport}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {t("adminCustomers.downloadTemplate")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMassDialogOpen(true)}
                        disabled={loading || importing || sendingMassMessage || !canBulkMessaging}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        {t("adminCustomers.sendMassMessage")}
                    </Button>
                    <Button
                        type="button"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing || !canImportExport}
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

            {!canImportExport && (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="CUSTOMER_IMPORT_EXPORT"
                />
            )}
            {!canBulkMessaging && (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnPro")}
                    feature="BULK_WHATSAPP_MESSAGING"
                />
            )}

            <Tabs defaultValue="customers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="customers">Clientes</TabsTrigger>
                    <TabsTrigger value="interest-capture">Captación de interesados</TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="space-y-4">
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
                </TabsContent>

                <TabsContent value="interest-capture" className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="grid gap-2 md:grid-cols-[220px_260px_1fr]">
                            <Select
                                value={interestSourceFilter}
                                onValueChange={(value) => {
                                    setInterestSourceFilter(value as "ALL" | "EVENT" | "CLASS");
                                    setInterestItemFilter("ALL");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="EVENT">Eventos</SelectItem>
                                    <SelectItem value="CLASS">Clases</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={interestItemFilter} onValueChange={setInterestItemFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Evento o clase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos los eventos y clases</SelectItem>
                                    {interestItemOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nombre, correo, celular o evento"
                                    value={interestSearchQuery}
                                    onChange={(event) => setInterestSearchQuery(event.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportInterestLeadsCsv}
                            disabled={filteredInterestLeads.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar como CSV
                        </Button>
                    </div>

                    <Card className="border-slate-200">
                        <CardContent className="p-0">
                            {interestLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                                </div>
                            ) : filteredInterestLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Users className="mb-3 h-10 w-10" />
                                    <p className="text-sm">No hay interesados para estos filtros.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Contacto</TableHead>
                                                <TableHead>Origen</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredInterestLeads.map((lead) => {
                                                const waUrl = buildLeadWhatsAppUrl(lead);
                                                return (
                                                    <TableRow key={lead.id}>
                                                        <TableCell>
                                                            <p className="font-medium text-slate-900">{lead.personName || notAvailable}</p>
                                                            <p className="text-xs text-slate-500">{lead.email || notAvailable}</p>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {lead.phonePrefix && lead.phoneNumber ? `+${lead.phonePrefix} ${lead.phoneNumber}` : notAvailable}
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-sm font-medium text-slate-900">{lead.itemTitle}</p>
                                                            <p className="text-xs text-slate-500">{lead.sourceLabel}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{lead.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">{formatDateTime(lead.createdAt, notAvailable)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {lead.email ? (
                                                                    <a href={`mailto:${lead.email}`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                                                                        <Mail className="h-4 w-4" />
                                                                    </a>
                                                                ) : null}
                                                                {waUrl ? (
                                                                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700">
                                                                        <MessageCircle className="h-4 w-4" />
                                                                    </a>
                                                                ) : null}
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
                </TabsContent>
            </Tabs>

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

                    <Tabs value={historyTab} onValueChange={(value) => setHistoryTab(value as "bookings" | "group-payments")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="bookings">{t("adminCustomers.historyTabs.bookings")}</TabsTrigger>
                            <TabsTrigger value="group-payments">{t("adminCustomers.historyTabs.groupPayments")}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="bookings" className="mt-4">
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
                        </TabsContent>

                        <TabsContent value="group-payments" className="mt-4">
                            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                                {groupPaymentsLoading && !groupPaymentsData ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand" />
                                    </div>
                                ) : groupPaymentsError ? (
                                    <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                        {groupPaymentsError}
                                    </p>
                                ) : !groupPaymentsData || (groupPaymentsData.rows.length === 0 && groupPaymentsData.payment_plans.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                                        <Clock3 className="h-8 w-8 mb-2" />
                                        <p className="text-sm">{t("adminCustomers.noGroupPayments")}</p>
                                    </div>
                                ) : (
                                    <>
                                        {groupPaymentsData.payment_plans.length > 0 ? (
                                            <div className="space-y-3">
                                                {groupPaymentsData.payment_plans.map((plan) => (
                                                    <div key={plan.enrollment.id} className="rounded-md border border-slate-200 p-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">{plan.enrollment.group_class?.title || t("adminCustomers.groupPaymentsFallbackClass")}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {t("adminCustomers.groupPlanSummary", {
                                                                        paid: plan.summary.paid_count,
                                                                        total: plan.summary.total_installments,
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline">
                                                                {formatCurrency(plan.summary.paid_amount_cents)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="space-y-3">
                                            {groupPaymentsData.rows.map((row: AdminGroupPaymentRow) => (
                                                <div key={row.id} className="rounded-md border border-slate-200 p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{row.item_title}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {t(`adminGroup.payments.rowTypes.${row.row_type}`)}
                                                                {row.installment_number ? ` · ${t("adminGroup.payments.installmentNumber", { number: row.installment_number })}` : ""}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {t(`adminGroup.paymentStatus.${row.payment_status === "PENDING_CONFIRMATION" ? "pendingConfirmation" : row.payment_status.toLowerCase()}`)}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                                        <span>
                                                            {row.due_date
                                                                ? t("adminCustomers.groupPaymentDue", { date: formatDateTime(row.due_date, notAvailable) })
                                                                : t("adminCustomers.groupPaymentCreated", { date: formatDateTime(row.created_at, notAvailable) })}
                                                        </span>
                                                        <span className="font-medium text-emerald-600">
                                                            {formatCurrency(row.amount_cents)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex items-center justify-between">
                        <Button type="button" variant="outline" onClick={() => setHistoryCustomer(null)}>
                            {t("common.close")}
                        </Button>
                        {historyTab === "bookings" && historyHasNextPage && (
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
