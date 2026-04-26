"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Clock3,
    Download,
    Eye,
    Loader2,
    Mail,
    MessageCircle,
    Search,
    Send,
    Upload,
    Users,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    type AdminGroupPaymentRow,
    downloadCustomerImportTemplate,
    downloadCustomersExport,
    getCustomerGroupPayments,
    getCustomerHistory,
    getCustomers,
    getInterestCaptureLeads,
    importCustomersFile,
    sendMassCustomerMessage,
    type CustomerGroupPaymentsResponse,
    type CustomerHistoryItem,
    type CustomerRecord,
    type InterestCaptureLead,
} from "@/app/admin/lib/adminApi";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import {
    ActionMenu,
    AdminMetricGrid,
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    AdminTabNav,
    DataTable,
    DataToolbar,
    ErrorState,
    EmptyState,
    LoadingSkeleton,
    StatCard,
    StatusBadge,
} from "@/components/admin/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyFromCents } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUsePlanFeature } from "@/lib/plans/capabilities";

const HISTORY_PAGE_SIZE = 10;

function encodeCustomerPath(customerKey: string) {
    return `/admin/dashboard/customers/${encodeURIComponent(customerKey)}`;
}

function normalizeCustomerKey(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function formatDate(dateStr: string | null, fallback: string, locale: string) {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(dateStr: string | null, fallback: string, locale: string) {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

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

function buildWhatsAppUrl(phone: string | null, phonePrefix: string | null) {
    if (!phone) return null;
    const digits = `${phonePrefix || ""}${phone}`.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function CustomersSectionNav() {
    const { t } = useI18n();
    const pathname = usePathname() || "";
    return (
        <AdminTabNav
            items={[
                {
                    key: "records",
                    href: "/admin/dashboard/customers",
                    label: t("adminCustomers.nav.records"),
                    active: pathname === "/admin/dashboard/customers" || /^\/admin\/dashboard\/customers\/[^/]+$/.test(pathname),
                },
                {
                    key: "communications",
                    href: "/admin/dashboard/customers/communications",
                    label: t("adminCustomers.nav.communications"),
                    active: pathname.startsWith("/admin/dashboard/customers/communications"),
                },
                {
                    key: "import-export",
                    href: "/admin/dashboard/customers/import-export",
                    label: t("adminCustomers.nav.importExport"),
                    active: pathname.startsWith("/admin/dashboard/customers/import-export"),
                },
            ]}
        />
    );
}

function CustomerActions({ customer, showLabel = false }: { customer: CustomerRecord; showLabel?: boolean }) {
    const { t } = useI18n();
    const waUrl = buildWhatsAppUrl(customer.phone, customer.phonePrefix);

    return (
        <ActionMenu
            label={t("adminCustomers.actions")}
            showLabel={showLabel}
            items={[
                {
                    label: t("adminCustomers.viewProfile"),
                    icon: <Eye className="h-4 w-4" />,
                    href: encodeCustomerPath(customer.customerKey),
                },
                ...(customer.email
                    ? [{
                        label: t("adminCustomers.sendEmail"),
                        icon: <Mail className="h-4 w-4" />,
                        onSelect: () => {
                            window.location.href = `mailto:${customer.email}`;
                        },
                    }]
                    : []),
                ...(waUrl
                    ? [{
                        label: t("adminCustomers.whatsapp"),
                        icon: <MessageCircle className="h-4 w-4" />,
                        onSelect: () => window.open(waUrl, "_blank", "noopener,noreferrer"),
                    }]
                    : []),
            ]}
        />
    );
}

function InterestLeadActions({ lead, showLabel = false }: { lead: InterestCaptureLead; showLabel?: boolean }) {
    const { t } = useI18n();
    const waUrl = buildWhatsAppUrl(lead.phoneNumber, lead.phonePrefix);
    const items = [
        ...(lead.email
            ? [{
                label: t("adminCustomers.sendEmail"),
                icon: <Mail className="h-4 w-4" />,
                onSelect: () => {
                    window.location.href = `mailto:${lead.email}`;
                },
            }]
            : []),
        ...(waUrl
            ? [{
                label: t("adminCustomers.whatsapp"),
                icon: <MessageCircle className="h-4 w-4" />,
                onSelect: () => window.open(waUrl, "_blank", "noopener,noreferrer"),
            }]
            : []),
    ];

    if (items.length === 0) return null;
    return <ActionMenu label={t("adminCustomers.actions")} showLabel={showLabel} items={items} />;
}

export function CustomersRecordsSurface() {
    const { t, locale } = useI18n();
    const { companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const formatCurrency = (cents: number) => formatCurrencyFromCents(cents, currency);
    const notAvailable = t("adminCustomers.notAvailable");

    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await getCustomers(debouncedSearch || undefined);
            setCustomers(rows);
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.loadCustomersFailed"));
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, t]);

    useEffect(() => {
        void fetchCustomers();
    }, [fetchCustomers]);

    const totalSpent = useMemo(
        () => customers.reduce((sum, customer) => sum + customer.totalSpentCents, 0),
        [customers],
    );
    const returningCustomers = useMemo(
        () => customers.filter((customer) => customer.completedBookings > 1).length,
        [customers],
    );
    const upcomingCustomers = useMemo(
        () => customers.filter((customer) => Boolean(customer.nextBookingAt)).length,
        [customers],
    );

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminNav.customers")}
                subtitle={t("adminCustomers.recordsSubtitle")}
                meta={t("adminCustomers.count", { count: customers.length })}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/customers/communications">{t("adminCustomers.openCommunications")}</Link>
                        </Button>
                        <Button asChild className="bg-admin-brand text-white hover:bg-admin-brand-hover">
                            <Link href="/admin/dashboard/customers/import-export">{t("adminCustomers.openImportExport")}</Link>
                        </Button>
                    </>
                }
            />

            <CustomersSectionNav />

            <AdminMetricGrid className="xl:grid-cols-3">
                <StatCard label={t("adminCustomers.stats.records")} value={customers.length} hint={t("adminCustomers.stats.recordsHint")} icon={<Users className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.stats.returning")} value={returningCustomers} hint={t("adminCustomers.stats.returningHint")} icon={<Clock3 className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.stats.revenue")} value={formatCurrency(totalSpent)} hint={t("adminCustomers.stats.revenueHint", { count: upcomingCustomers })} icon={<Download className="h-5 w-5" />} />
            </AdminMetricGrid>

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("adminCustomers.searchPlaceholder")}
                onSearchChange={setSearchQuery}
                summary={t("adminCustomers.count", { count: customers.length })}
            />

            {loading ? (
                <LoadingSkeleton rows={5} variant="table" />
            ) : (
                <DataTable
                    data={customers}
                    getRowKey={(customer) => customer.customerKey}
                    mobileBreakpoint="lg"
                    empty={(
                        <EmptyState
                            icon={Users}
                            title={debouncedSearch ? t("adminCustomers.noSearchResults") : t("adminCustomers.noCustomers")}
                            description={debouncedSearch ? t("adminCustomers.emptySearchDescription") : t("adminCustomers.emptyRecordsDescription")}
                        />
                    )}
                    renderMobileItem={(customer) => {
                        const preference = getCustomerPreference(customer, t("adminCustomers.noPreference"));
                        return (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-950">{customer.name}</p>
                                        <p className="truncate text-sm text-slate-600">{customer.email || notAvailable}</p>
                                        <p className="text-sm text-slate-600">
                                            {customer.phone ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}` : notAvailable}
                                        </p>
                                    </div>
                                    <CustomerActions customer={customer} showLabel />
                                </div>
                                <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">{t("adminCustomers.preferenceLabel")}</span>
                                        <span className="text-right font-medium text-slate-800">{preference}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">{t("adminCustomers.bookings")}</span>
                                        <span className="font-medium text-slate-800">{customer.totalBookings}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">{t("adminCustomers.totalSpent")}</span>
                                        <span className="font-medium text-emerald-700">{formatCurrency(customer.totalSpentCents)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                    columns={[
                        {
                            key: "customer",
                            header: t("adminCustomers.name"),
                            cell: (customer) => (
                                <div className="min-w-0 max-w-[220px]">
                                    <Link href={encodeCustomerPath(customer.customerKey)} className="font-medium text-slate-900 hover:text-admin-brand">
                                        {customer.name}
                                    </Link>
                                    <p className="text-xs text-slate-500">{customer.email || notAvailable}</p>
                                </div>
                            ),
                        },
                        {
                            key: "preference",
                            header: t("adminCustomers.preferenceLabel"),
                            cell: (customer) => (
                                <span className="text-sm text-slate-700">
                                    {getCustomerPreference(customer, t("adminCustomers.noPreference"))}
                                </span>
                            ),
                        },
                        {
                            key: "activity",
                            header: t("adminCustomers.bookingsSummary"),
                            cell: (customer) => (
                                <div className="space-y-0.5 text-xs text-slate-600">
                                    <p>{t("adminCustomers.totalBookingsLabel", { count: customer.totalBookings })}</p>
                                    <p>{t("adminCustomers.completedBookingsLabel", { count: customer.completedBookings })}</p>
                                    <p>{t("adminCustomers.cancelledBookingsLabel", { count: customer.cancelledBookings })}</p>
                                    <p>{t("adminCustomers.noShowBookingsLabel", { count: customer.noShowBookings })}</p>
                                </div>
                            ),
                        },
                        {
                            key: "spend",
                            header: t("adminCustomers.spendSummary"),
                            headerClassName: "text-right",
                            className: "text-right",
                            cell: (customer) => (
                                <div>
                                    <p className="font-medium text-emerald-700">{formatCurrency(customer.totalSpentCents)}</p>
                                    <p className="text-xs text-slate-500">
                                        {t("adminCustomers.avgTicket", { amount: formatCurrency(customer.avgTicketCents) })}
                                    </p>
                                </div>
                            ),
                        },
                        {
                            key: "schedule",
                            header: t("adminCustomers.scheduleSummary"),
                            cell: (customer) => (
                                <div className="space-y-0.5 text-xs text-slate-600">
                                        <p>{t("adminCustomers.lastBooking")}: {formatDate(customer.lastBookingAt, notAvailable, locale)}</p>
                                        <p>{t("adminCustomers.nextBooking")}: {formatDate(customer.nextBookingAt, notAvailable, locale)}</p>
                                        <p>{t("adminCustomers.frequencyLabel", { value: customer.bookingFrequencyPerMonth })}</p>
                                    </div>
                                ),
                        },
                        {
                            key: "actions",
                            header: <span className="sr-only">{t("adminCustomers.actions")}</span>,
                            className: "text-right",
                            cell: (customer) => <CustomerActions customer={customer} />,
                        },
                    ]}
                />
            )}
        </AdminPageShell>
    );
}

export function CustomersCommunicationsSurface() {
    const { t, locale } = useI18n();
    const { companyUser, user } = useAdminAuth();
    const canBulkMessaging = Boolean(user?.is_super_admin) || canUsePlanFeature(companyUser?.company, "BULK_WHATSAPP_MESSAGING");
    const notAvailable = t("adminCustomers.notAvailable");

    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [interestLeads, setInterestLeads] = useState<InterestCaptureLead[]>([]);
    const [interestLoading, setInterestLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [interestSearchQuery, setInterestSearchQuery] = useState("");
    const [interestSourceFilter, setInterestSourceFilter] = useState<"ALL" | "EVENT" | "CLASS">("ALL");
    const [interestItemFilter, setInterestItemFilter] = useState("ALL");
    const [isMassDialogOpen, setIsMassDialogOpen] = useState(false);
    const [massMessageBody, setMassMessageBody] = useState("");
    const [sendingMassMessage, setSendingMassMessage] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const fetchCustomers = useCallback(async () => {
        setCustomersLoading(true);
        try {
            const rows = await getCustomers(debouncedSearch || undefined);
            setCustomers(rows);
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.loadCustomersFailed"));
        } finally {
            setCustomersLoading(false);
        }
    }, [debouncedSearch, t]);

    const fetchInterestLeads = useCallback(async () => {
        setInterestLoading(true);
        try {
            const rows = await getInterestCaptureLeads();
            setInterestLeads(rows);
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.interestLoadFailed"));
        } finally {
            setInterestLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchCustomers();
    }, [fetchCustomers]);

    useEffect(() => {
        void fetchInterestLeads();
    }, [fetchInterestLeads]);

    const reachableCustomers = useMemo(
        () => customers.filter((customer) => Boolean(customer.email || customer.phone)).length,
        [customers],
    );
    const interestItemOptions = useMemo(() => {
        const options = new Map<string, { value: string; label: string }>();
        interestLeads.forEach((lead) => {
            if (interestSourceFilter !== "ALL" && lead.source !== interestSourceFilter) return;
            const value = `${lead.source}:${lead.itemId}`;
            options.set(value, { value, label: `${lead.sourceLabel}: ${lead.itemTitle}` });
        });
        return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
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
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [interestItemFilter, interestLeads, interestSearchQuery, interestSourceFilter]);

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
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.massMessageFailed"));
        } finally {
            setSendingMassMessage(false);
        }
    };

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
            .map((row) =>
                row
                    .map((cell) => {
                        const text = String(cell).replace(/"/g, '""');
                        return /[",\n]/.test(text) ? `"${text}"` : text;
                    })
                    .join(","),
            )
            .join("\n");

        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `captacion-interesados-${Date.now()}.csv`);
    };

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminCustomers.communicationsTitle")}
                subtitle={t("adminCustomers.communicationsSubtitle")}
                meta={t("adminCustomers.communicationsAudienceMeta", { count: customers.length })}
                actions={
                    <Button
                        type="button"
                        onClick={() => setIsMassDialogOpen(true)}
                        className="bg-admin-brand text-white hover:bg-admin-brand-hover"
                        disabled={!canBulkMessaging || customersLoading || sendingMassMessage}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        {t("adminCustomers.sendMassMessage")}
                    </Button>
                }
            />

            <CustomersSectionNav />

            {!canBulkMessaging ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnPro")}
                    feature="BULK_WHATSAPP_MESSAGING"
                />
            ) : null}

            <AdminMetricGrid className="xl:grid-cols-3">
                <StatCard label={t("adminCustomers.communicationsStats.audience")} value={customers.length} hint={t("adminCustomers.communicationsStats.audienceHint")} icon={<Send className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.communicationsStats.reachable")} value={reachableCustomers} hint={t("adminCustomers.communicationsStats.reachableHint")} icon={<Mail className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.communicationsStats.interest")} value={filteredInterestLeads.length} hint={t("adminCustomers.communicationsStats.interestHint")} icon={<Users className="h-5 w-5" />} />
            </AdminMetricGrid>

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("adminCustomers.searchPlaceholder")}
                onSearchChange={setSearchQuery}
                summary={customersLoading ? t("adminCustomers.loadingAudience") : t("adminCustomers.communicationsAudienceSummary", { count: customers.length })}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <AdminSectionCard
                    title={t("adminCustomers.sendMassMessageTitle")}
                    description={t("adminCustomers.communicationsAudienceDescription")}
                    contentClassName="space-y-4"
                >
                        <div className="rounded-lg border border-admin-border bg-admin-surface-subtle p-4">
                            <p className="text-sm font-medium text-slate-900">{t("adminCustomers.currentAudience")}</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {customersLoading
                                    ? t("adminCustomers.loadingCustomers")
                                    : t("adminCustomers.massMessageAudienceHint", { count: customers.length })}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {customersLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("adminCustomers.loadingAudiencePreview")}
                                </div>
                            ) : customers.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title={t("adminCustomers.noCustomers")}
                                    description={t("adminCustomers.emptyAudienceDescription")}
                                />
                            ) : (
                                customers.slice(0, 5).map((customer) => (
                                    <div key={customer.customerKey} className="flex items-center justify-between gap-3 rounded-lg border border-admin-border p-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-900">{customer.name}</p>
                                            <p className="truncate text-xs text-slate-500">{customer.email || notAvailable}</p>
                                        </div>
                                        <CustomerActions customer={customer} />
                                    </div>
                                ))
                            )}
                        </div>
                </AdminSectionCard>

                <AdminSectionCard
                    title={t("adminCustomers.interestCaptureTitle")}
                    description={t("adminCustomers.interestCaptureDescription")}
                    contentClassName="space-y-4"
                >
                        <div className="grid gap-2 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)]">
                            <Select
                                value={interestSourceFilter}
                                onValueChange={(value) => {
                                    setInterestSourceFilter(value as "ALL" | "EVENT" | "CLASS");
                                    setInterestItemFilter("ALL");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("adminCustomers.interestType")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t("adminCustomers.interestAll")}</SelectItem>
                                    <SelectItem value="EVENT">{t("adminCustomers.interestEvents")}</SelectItem>
                                    <SelectItem value="CLASS">{t("adminCustomers.interestClasses")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={interestItemFilter} onValueChange={setInterestItemFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("adminCustomers.interestItem")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t("adminCustomers.interestAllItems")}</SelectItem>
                                    {interestItemOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={interestSearchQuery}
                                    onChange={(event) => setInterestSearchQuery(event.target.value)}
                                    placeholder={t("adminCustomers.interestSearchPlaceholder")}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={exportInterestLeadsCsv} disabled={filteredInterestLeads.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                {t("adminCustomers.exportCsv")}
                            </Button>
                        </div>

                        {interestLoading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("adminCustomers.loadingLeadActivity")}
                            </div>
                        ) : (
                            <DataTable
                                data={filteredInterestLeads}
                                getRowKey={(lead) => lead.id}
                                mobileBreakpoint="lg"
                                empty={(
                                    <EmptyState
                                        icon={Users}
                                        title={t("adminCustomers.noInterestLeadsTitle")}
                                        description={t("adminCustomers.noInterestLeadsDescription")}
                                    />
                                )}
                                renderMobileItem={(lead) => (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{lead.personName || notAvailable}</p>
                                                <p className="truncate text-sm text-slate-600">{lead.email || notAvailable}</p>
                                            </div>
                                            <InterestLeadActions lead={lead} showLabel />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline">{lead.status}</Badge>
                                            <Badge variant="secondary">{lead.sourceLabel}</Badge>
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            <p className="font-medium text-slate-900">{lead.itemTitle}</p>
                                            <p>{lead.phonePrefix && lead.phoneNumber ? `+${lead.phonePrefix} ${lead.phoneNumber}` : notAvailable}</p>
                                            <p className="text-xs text-slate-500">{formatDateTime(lead.createdAt, notAvailable, locale)}</p>
                                        </div>
                                    </div>
                                )}
                                columns={[
                                    {
                                        key: "person",
                                        header: t("adminCustomers.person"),
                                        cell: (lead) => (
                                            <div>
                                                <p className="font-medium text-slate-900">{lead.personName || notAvailable}</p>
                                                <p className="text-xs text-slate-500">{lead.email || notAvailable}</p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: "contact",
                                        header: t("adminCustomers.contact"),
                                        cell: (lead) => (
                                            <span className="text-sm text-slate-600">
                                                {lead.phonePrefix && lead.phoneNumber ? `+${lead.phonePrefix} ${lead.phoneNumber}` : notAvailable}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "source",
                                        header: t("adminCustomers.origin"),
                                        cell: (lead) => (
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{lead.itemTitle}</p>
                                                <p className="text-xs text-slate-500">{lead.sourceLabel}</p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: "status",
                                        header: t("adminBookings.status"),
                                        cell: (lead) => <Badge variant="outline">{lead.status}</Badge>,
                                    },
                                    {
                                        key: "created",
                                        header: t("adminCustomers.created"),
                                        cell: (lead) => <span className="text-sm text-slate-600">{formatDateTime(lead.createdAt, notAvailable, locale)}</span>,
                                    },
                                    {
                                        key: "actions",
                                        header: <span className="sr-only">{t("adminCustomers.actions")}</span>,
                                        className: "text-right",
                                        cell: (lead) => <InterestLeadActions lead={lead} />,
                                    },
                                ]}
                            />
                        )}
                </AdminSectionCard>
            </div>

            <Dialog open={isMassDialogOpen} onOpenChange={setIsMassDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("adminCustomers.sendMassMessageTitle")}</DialogTitle>
                        <DialogDescription>{t("adminCustomers.sendMassMessageDescription")}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t("adminCustomers.massMessageBodyLabel")}</label>
                        <textarea
                            value={massMessageBody}
                            onChange={(event) => setMassMessageBody(event.target.value)}
                            placeholder={t("adminCustomers.massMessageBodyPlaceholder")}
                            rows={7}
                            maxLength={1500}
                            className="admin-textarea min-h-36 resize-y"
                        />
                        <p className="text-xs text-slate-500">
                            {t("adminCustomers.massMessageAudienceHint", { count: customers.length })}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsMassDialogOpen(false)} disabled={sendingMassMessage}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleSendMassMessage()}
                            disabled={sendingMassMessage || !massMessageBody.trim()}
                            className="bg-admin-brand text-white hover:bg-admin-brand-hover"
                        >
                            {sendingMassMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {t("adminCustomers.sendMassMessage")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPageShell>
    );
}

export function CustomersImportExportSurface() {
    const { t } = useI18n();
    const { companyUser, user } = useAdminAuth();
    const canImportExport = Boolean(user?.is_super_admin) || canUsePlanFeature(companyUser?.company, "CUSTOMER_IMPORT_EXPORT");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await getCustomers(debouncedSearch || undefined);
            setCustomers(rows);
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.loadCustomersFailed"));
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, t]);

    useEffect(() => {
        void fetchCustomers();
    }, [fetchCustomers]);

    const handleDownloadTemplate = async () => {
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }

        try {
            const blob = await downloadCustomerImportTemplate();
            downloadBlob(blob, "customers-import-template.xlsx");
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.templateDownloadFailed"));
        }
    };

    const handleDownloadExport = async () => {
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }

        setExporting(true);
        try {
            const { blob, fileName } = await downloadCustomersExport(debouncedSearch || undefined);
            downloadBlob(blob, fileName || `customers-${Date.now()}.csv`);
            await notify.success(t("adminCustomers.exportSuccess", { count: customers.length }));
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.exportFailed"));
        } finally {
            setExporting(false);
        }
    };

    const handleImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!canImportExport) {
            await notify.warning(t("planEnforcement.availableOnBusiness"));
            return;
        }

        const file = event.target.files?.[0];
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
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminCustomers.importFailed"));
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminCustomers.importExportTitle")}
                subtitle={t("adminCustomers.importExportSubtitle")}
                meta={loading ? t("adminCustomers.loadingCustomerCounts") : t("adminCustomers.importExportMeta", { count: customers.length })}
                actions={
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleImportFileSelected}
                    />
                }
            />

            <CustomersSectionNav />

            {!canImportExport ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="CUSTOMER_IMPORT_EXPORT"
                />
            ) : null}

            <AdminMetricGrid className="xl:grid-cols-3">
                <StatCard label={t("adminCustomers.importExportStats.filtered")} value={customers.length} hint={t("adminCustomers.importExportStats.filteredHint")} icon={<Users className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.importExportStats.template")} value={t("adminCustomers.importExportStats.ready")} hint={t("adminCustomers.importExportStats.templateHint")} icon={<Download className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.importExportStats.status")} value={importing ? t("adminCustomers.importExportStats.running") : t("adminCustomers.importExportStats.idle")} hint={t("adminCustomers.importExportStats.statusHint")} icon={<Upload className="h-5 w-5" />} />
            </AdminMetricGrid>

            <AdminSectionCard
                title={t("adminCustomers.exportCustomersTitle")}
                description={t("adminCustomers.exportCustomersDescription")}
                contentClassName="space-y-4"
            >
                    <DataToolbar
                        searchValue={searchQuery}
                        searchPlaceholder={t("adminCustomers.searchPlaceholder")}
                        onSearchChange={setSearchQuery}
                        summary={loading ? t("adminCustomers.loadingExportPreview") : t("adminCustomers.exportPreviewCount", { count: customers.length })}
                        actions={(
                            <Button type="button" variant="outline" onClick={() => void handleDownloadExport()} disabled={!canImportExport || exporting || loading}>
                                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {t("adminCustomers.downloadClients")}
                            </Button>
                        )}
                    />
            </AdminSectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
                <AdminSectionCard
                    title={t("adminCustomers.importCustomersTitle")}
                    description={t("adminCustomers.importCustomersDescription")}
                    contentClassName="space-y-4"
                >
                        <p className="text-sm text-slate-600">
                            {t("adminCustomers.importCustomersFormats")}
                        </p>
                        <Button
                            type="button"
                            className="bg-admin-brand text-white hover:bg-admin-brand-hover"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canImportExport || importing}
                        >
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {importing ? t("adminCustomers.importing") : t("adminCustomers.importClients")}
                        </Button>
                </AdminSectionCard>

                <AdminSectionCard
                    title={t("adminCustomers.templateTitle")}
                    description={t("adminCustomers.templateDescription")}
                >
                        <Button type="button" variant="outline" onClick={() => void handleDownloadTemplate()} disabled={!canImportExport || importing}>
                            <Download className="mr-2 h-4 w-4" />
                            {t("adminCustomers.downloadTemplate")}
                        </Button>
                </AdminSectionCard>
            </div>
        </AdminPageShell>
    );
}

export function CustomerProfileSurface({ customerKey }: { customerKey: string }) {
    const { t, locale } = useI18n();
    const { companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const formatCurrency = (cents: number) => formatCurrencyFromCents(cents, currency);
    const notAvailable = t("adminCustomers.notAvailable");
    const normalizedCustomerKey = useMemo(() => normalizeCustomerKey(customerKey), [customerKey]);

    const [customer, setCustomer] = useState<CustomerRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historyItems, setHistoryItems] = useState<CustomerHistoryItem[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyHasNextPage, setHistoryHasNextPage] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [groupPaymentsData, setGroupPaymentsData] = useState<CustomerGroupPaymentsResponse | null>(null);
    const [groupPaymentsLoading, setGroupPaymentsLoading] = useState(false);
    const [groupPaymentsError, setGroupPaymentsError] = useState<string | null>(null);

    const loadCustomerHistory = useCallback(async (targetCustomerKey: string, page: number, append: boolean) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const response = await getCustomerHistory(targetCustomerKey, page, HISTORY_PAGE_SIZE);
            setHistoryItems((current) => (append ? [...current, ...response.items] : response.items));
            setHistoryPage(response.pagination.page);
            setHistoryTotal(response.pagination.total);
            setHistoryHasNextPage(response.pagination.hasNextPage);
        } catch (fetchError: unknown) {
            setHistoryError(fetchError instanceof Error ? fetchError.message : t("adminCustomers.historyLoadFailed"));
        } finally {
            setHistoryLoading(false);
        }
    }, [t]);

    const loadCustomerGroupPayments = useCallback(async (targetCustomerKey: string) => {
        setGroupPaymentsLoading(true);
        setGroupPaymentsError(null);
        try {
            const response = await getCustomerGroupPayments(targetCustomerKey, 1, 100);
            setGroupPaymentsData(response);
        } catch (fetchError: unknown) {
            setGroupPaymentsError(fetchError instanceof Error ? fetchError.message : t("adminCustomers.groupPaymentsLoadFailed"));
        } finally {
            setGroupPaymentsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const rows = await getCustomers();
                const selectedCustomer = rows.find((row) => row.customerKey === normalizedCustomerKey) || null;
                if (!selectedCustomer) {
                    if (isMounted) {
                        setCustomer(null);
                        setError(t("adminCustomers.customerNotFound"));
                    }
                    return;
                }

                if (isMounted) {
                    setCustomer(selectedCustomer);
                }

                await Promise.all([
                    loadCustomerHistory(normalizedCustomerKey, 1, false),
                    loadCustomerGroupPayments(normalizedCustomerKey),
                ]);
            } catch (fetchError: unknown) {
                if (isMounted) {
                    setError(fetchError instanceof Error ? fetchError.message : t("adminCustomers.loadCustomersFailed"));
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            isMounted = false;
        };
    }, [loadCustomerGroupPayments, loadCustomerHistory, normalizedCustomerKey, t]);

    const favoriteContactUrl = customer ? buildWhatsAppUrl(customer.phone, customer.phonePrefix) : null;

    if (loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={6} />
            </AdminPageShell>
        );
    }

    if (error || !customer) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("adminCustomers.profileTitle")}
                    subtitle={t("adminCustomers.profileLoadFailedSubtitle")}
                    actions={(
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/customers">{t("adminCustomers.backToRecords")}</Link>
                        </Button>
                    )}
                />
                <CustomersSectionNav />
                <ErrorState
                    icon={Users}
                    title={t("adminCustomers.customerNotFound")}
                    description={error || t("adminCustomers.customerNotFoundDescription")}
                />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={customer.name}
                subtitle={t("adminCustomers.profileSubtitle")}
                meta={customer.email || notAvailable}
                actions={(
                    <>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/customers">{t("adminCustomers.backToRecords")}</Link>
                        </Button>
                        {customer.email ? (
                            <Button type="button" variant="outline" onClick={() => { window.location.href = `mailto:${customer.email}`; }}>
                                <Mail className="mr-2 h-4 w-4" />
                                {t("adminCustomers.sendEmail")}
                            </Button>
                        ) : null}
                        {favoriteContactUrl ? (
                            <Button type="button" className="bg-admin-brand text-white hover:bg-admin-brand-hover" onClick={() => window.open(favoriteContactUrl, "_blank", "noopener,noreferrer")}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                {t("adminCustomers.whatsapp")}
                            </Button>
                        ) : null}
                    </>
                )}
            />

            <CustomersSectionNav />

            <div className="grid gap-3 md:grid-cols-4">
                <StatCard label={t("adminCustomers.bookings")} value={customer.totalBookings} hint={t("adminCustomers.completedBookingsLabel", { count: customer.completedBookings })} icon={<Clock3 className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.totalSpent")} value={formatCurrency(customer.totalSpentCents)} hint={t("adminCustomers.avgTicket", { amount: formatCurrency(customer.avgTicketCents) })} icon={<Download className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.lastBooking")} value={formatDate(customer.lastBookingAt, notAvailable, locale)} hint={`${t("adminCustomers.nextBooking")}: ${formatDate(customer.nextBookingAt, notAvailable, locale)}`} icon={<Clock3 className="h-5 w-5" />} />
                <StatCard label={t("adminCustomers.favoriteStaff")} value={customer.favoriteStaffName || notAvailable} hint={t("adminCustomers.frequencyLabel", { value: customer.bookingFrequencyPerMonth })} icon={<Users className="h-5 w-5" />} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <AdminSectionCard
                    title={t("adminCustomers.profileSectionTitle")}
                    description={t("adminCustomers.profileSectionDescription")}
                    contentClassName="grid gap-4 sm:grid-cols-2"
                >
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminCustomers.email")}</p>
                            <p className="mt-1 text-sm text-slate-800">{customer.email || notAvailable}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminCustomers.phone")}</p>
                            <p className="mt-1 text-sm text-slate-800">
                                {customer.phone ? `${customer.phonePrefix ? `+${customer.phonePrefix} ` : ""}${customer.phone}` : notAvailable}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminCustomers.preferenceLabel")}</p>
                            <p className="mt-1 text-sm text-slate-800">{getCustomerPreference(customer, t("adminCustomers.noPreference"))}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminCustomers.favoriteStaff")}</p>
                            <p className="mt-1 text-sm text-slate-800">{customer.favoriteStaffName || notAvailable}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminCustomers.recentActivity")}</p>
                            <div className="mt-2 rounded-lg border border-admin-border bg-admin-surface-subtle p-3 text-sm text-slate-700">
                                <p>{formatDateTime(customer.recentActivity.happenedAt, notAvailable, locale)}</p>
                                <p className="mt-1 text-slate-500">
                                    {customer.recentActivity.serviceName || customer.recentActivity.staffName || notAvailable}
                                </p>
                            </div>
                        </div>
                        {customer.notes ? (
                            <div className="sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminBookings.notes")}</p>
                                <p className="mt-1 text-sm text-slate-800">{customer.notes}</p>
                            </div>
                        ) : null}
                </AdminSectionCard>

                <AdminSectionCard
                    title={t("adminCustomers.activityTitle")}
                    description={t("adminCustomers.activityDescription")}
                >
                        <Tabs defaultValue="bookings" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="bookings">{t("adminCustomers.historyTabs.bookings")}</TabsTrigger>
                                <TabsTrigger value="group-payments">{t("adminCustomers.historyTabs.groupPayments")}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="bookings" className="space-y-3">
                                {historyLoading && historyItems.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("adminCustomers.loadingHistory")}
                                    </div>
                                ) : historyError ? (
                                    <ErrorState title={t("adminCustomers.historyLoadFailed")} description={historyError} className="min-h-0 py-6" />
                                ) : historyItems.length === 0 ? (
                                    <EmptyState icon={Clock3} title={t("adminCustomers.noHistory")} description={t("adminCustomers.noHistoryDescription")} />
                                ) : (
                                    <>
                                        {historyItems.map((item) => {
                                            const serviceSummary = item.services
                                                .map((service) => service.serviceName || service.categoryName)
                                                .filter((value): value is string => Boolean(value))
                                                .slice(0, 3)
                                                .join(", ");

                                            return (
                                                <div key={item.id} className="rounded-lg border border-admin-border p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{formatDateTime(item.startAt, notAvailable, locale)}</p>
                                                            <p className="text-xs text-slate-500">{t("adminCustomers.staff")}: {item.staffName || notAvailable}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">{t(getSourceTranslationKey(item.source))}</Badge>
                                                            <Badge variant="secondary">{t(getStatusTranslationKey(item.status))}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                                        <span>{t("adminCustomers.services")}: {serviceSummary || t("adminCustomers.noServiceInfo")}</span>
                                                        <span className="font-medium text-emerald-700">{formatCurrency(item.totalPriceCents)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {historyHasNextPage ? (
                                            <Button type="button" variant="outline" onClick={() => void loadCustomerHistory(normalizedCustomerKey, historyPage + 1, true)} disabled={historyLoading}>
                                                {historyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("adminCustomers.loadMoreHistory")}
                                            </Button>
                                        ) : null}
                                        <p className="text-xs text-slate-500">{t("adminCustomers.fullHistoryDescription", { total: historyTotal })}</p>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="group-payments" className="space-y-4">
                                {groupPaymentsLoading && !groupPaymentsData ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("adminCustomers.loadingGroupPayments")}
                                    </div>
                                ) : groupPaymentsError ? (
                                    <ErrorState title={t("adminCustomers.groupPaymentsLoadFailed")} description={groupPaymentsError} className="min-h-0 py-6" />
                                ) : !groupPaymentsData || (groupPaymentsData.rows.length === 0 && groupPaymentsData.payment_plans.length === 0) ? (
                                    <EmptyState icon={Clock3} title={t("adminCustomers.noGroupPayments")} description={t("adminCustomers.noGroupPaymentsDescription")} />
                                ) : (
                                    <>
                                        {groupPaymentsData.payment_plans.length > 0 ? (
                                            <div className="space-y-3">
                                                {groupPaymentsData.payment_plans.map((plan) => (
                                                    <div key={plan.enrollment.id} className="rounded-lg border border-admin-border p-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">
                                                                    {plan.enrollment.group_class?.title || t("adminCustomers.groupPaymentsFallbackClass")}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {t("adminCustomers.groupPlanSummary", {
                                                                        paid: plan.summary.paid_count,
                                                                        total: plan.summary.total_installments,
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <StatusBadge tone="success">{formatCurrency(plan.summary.paid_amount_cents)}</StatusBadge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="space-y-3">
                                            {groupPaymentsData.rows.map((row: AdminGroupPaymentRow) => (
                                                <div key={row.id} className="rounded-lg border border-admin-border p-3">
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
                                                                ? t("adminCustomers.groupPaymentDue", { date: formatDateTime(row.due_date, notAvailable, locale) })
                                                                : t("adminCustomers.groupPaymentCreated", { date: formatDateTime(row.created_at, notAvailable, locale) })}
                                                        </span>
                                                        <span className="font-medium text-emerald-700">{formatCurrency(row.amount_cents)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                </AdminSectionCard>
            </div>
        </AdminPageShell>
    );
}
