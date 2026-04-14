"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    Loader2,
    Trophy,
    Store,
    Users,
    UserCheck,
    ArrowRight,
    Tags,
    Building2,
    BarChart3,
    MousePointerClick,
    Compass,
    MapPin,
    Search,
    MessageSquare,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { formatCurrencyFromCents } from "@/lib/currency";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const resolveUrl = (path: string) => {
    const base = API_BASE_URL.endsWith("/api")
        ? API_BASE_URL.replace(/\/api$/, "")
        : API_BASE_URL;
    return `${base}${path}`;
};

interface SuperAdminMetrics {
    bookings: { total: number; thisMonth: number; thisWeek: number; today: number; upcoming7Days: number };
    revenue: { total: number; thisMonth: number; thisWeek: number; today: number; avgPerBooking: number };
    topShopsByRevenue: { id: number; name: string; slug: string; revenue: number; bookingCount: number }[];
    topShopsByBookings: { id: number; name: string; slug: string; bookingCount: number; revenue: number }[];
    topServices: { id: number; name: string; shopName: string; count: number; percentage: number }[];
    entityCounts: { activeShops: number; totalStaff: number; totalCustomers: number };
    marketplace?: {
        range: { preset: "today" | "7d" | "30d"; start: string; end: string; label: string };
        bookingsBySource: {
            marketplace: number;
            salonSite: number;
            admin: number;
            manual: number;
            total: number;
            marketplaceShare: number;
        };
        funnel: {
            searches: number;
            resultsViewed: number;
            resultClicks: number;
            pinClicks: number;
            resultCardClicks: number;
            bookNowClicks: number;
            viewSalonClicks: number;
            bookingStarts: number;
            bookingConfirmed: number;
            bookingConfirmedEvents: number;
            noExactMatches: number;
            noExactRate: number;
            searchToClickRate: number;
            searchToBookNowRate: number;
            bookNowToStartRate: number;
            startToConfirmRate: number;
            searchToConfirmRate: number;
        };
        demand: {
            topSearchedServiceTypes: { serviceTypeId: number; name: string; count: number }[];
            topSearchedLocations: { label: string; city: string | null; zone: string | null; count: number }[];
            topSearchedDates: { date: string; count: number }[];
            demandByHour: { hour: number; count: number }[];
            peakDemandHour: { hour: number; count: number };
        };
        diagnostics: {
            trackedEventRows: number;
        };
    };
}

const formatCurrency = (cents: number) => formatCurrencyFromCents(cents);
const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
type DashboardRangePreset = "today" | "7d" | "30d";

export default function SuperAdminDashboard() {
    const t = useT();
    const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("7d");

    useEffect(() => {
        setLoading(true);
        setLoadFailed(false);
        fetch(resolveUrl(`/api/super-admin/dashboard/metrics?range=${rangePreset}`), { credentials: "include" })
            .then(async (res) => {
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Request failed");
                setMetrics(json.data);
            })
            .catch((err) => {
                setLoadFailed(true);
                void notify.error(err instanceof Error ? err.message : t("superAdminDashboard.loadError"));
            })
            .finally(() => setLoading(false));
    }, [rangePreset, t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    if (loadFailed || !metrics) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminDashboard.title")}</h1>
                    <p className="text-slate-500">{t("superAdminDashboard.subtitle")}</p>
                </div>
                <p className="text-sm text-slate-500">{t("superAdminDashboard.loadError")}</p>
            </div>
        );
    }

    const statCards = [
        {
            label: t("superAdminDashboard.totalBookings"),
            value: metrics.bookings.total.toLocaleString(),
            sub: t("superAdminDashboard.thisMonthCount", { count: metrics.bookings.thisMonth }),
            icon: <Calendar className="h-5 w-5" />,
            color: "text-brand bg-brand-soft-bg",
        },
        {
            label: t("superAdminDashboard.revenueThisMonth"),
            value: formatCurrency(metrics.revenue.thisMonth),
            sub: t("superAdminDashboard.revenueAllTime", { amount: formatCurrency(metrics.revenue.total) }),
            icon: <DollarSign className="h-5 w-5" />,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            label: t("superAdminDashboard.today"),
            value: metrics.bookings.today.toLocaleString(),
            sub: t("superAdminDashboard.todayRevenue", { amount: formatCurrency(metrics.revenue.today) }),
            icon: <TrendingUp className="h-5 w-5" />,
            color: "text-blue-600 bg-blue-50",
        },
        {
            label: t("superAdminDashboard.upcoming7Days"),
            value: metrics.bookings.upcoming7Days.toLocaleString(),
            sub: t("superAdminDashboard.avgPerBooking", { amount: formatCurrency(metrics.revenue.avgPerBooking) }),
            icon: <Clock className="h-5 w-5" />,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    const secondaryCards = [
        {
            label: t("superAdminDashboard.activeShops"),
            value: metrics.entityCounts.activeShops,
            icon: <Store className="h-5 w-5" />,
            color: "text-brand bg-brand-soft-bg",
        },
        {
            label: t("superAdminDashboard.totalStaff"),
            value: metrics.entityCounts.totalStaff,
            icon: <UserCheck className="h-5 w-5" />,
            color: "text-sky-600 bg-sky-50",
        },
        {
            label: t("superAdminDashboard.totalCustomers"),
            value: metrics.entityCounts.totalCustomers,
            icon: <Users className="h-5 w-5" />,
            color: "text-pink-600 bg-pink-50",
        },
    ];

    const marketplace = metrics.marketplace;
    const rangeOptions: Array<{ value: DashboardRangePreset; label: string }> = [
        { value: "today", label: t("superAdminDashboard.rangeToday") },
        { value: "7d", label: t("superAdminDashboard.rangeLast7Days") },
        { value: "30d", label: t("superAdminDashboard.rangeLast30Days") },
    ];
    const maxDemandHourCount = Math.max(
        1,
        ...(marketplace?.demand.demandByHour.map((hour) => hour.count) || [0]),
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminDashboard.title")}</h1>
                    <p className="text-slate-500">{t("superAdminDashboard.subtitle")}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-1">
                    <div className="flex items-center gap-1">
                        {rangeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setRangePreset(option.value)}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    rangePreset === option.value
                                        ? "bg-brand text-white"
                                        : "text-slate-600 hover:bg-slate-100",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {marketplace && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{t("superAdminDashboard.marketplaceTitle")}</h2>
                            <p className="text-xs text-slate-500">
                                {t("superAdminDashboard.marketplaceRange", { range: marketplace.range.label })}
                            </p>
                        </div>
                        <p className="text-xs text-slate-500">
                            {t("superAdminDashboard.marketplaceEventsTracked", { count: marketplace.diagnostics.trackedEventRows })}
                        </p>
                    </div>
                </div>
            )}

            {/* Primary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardContent className="p-4">
                            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <span className={stat.color.split(" ")[0]}>{stat.icon}</span>
                                {stat.label}
                            </p>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Secondary Stat Cards */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <div className="grid grid-cols-1 gap-px sm:grid-cols-3">
                    {secondaryCards.map((stat) => (
                        <div key={stat.label} className="flex items-center gap-3 bg-white px-4 py-4">
                            <span className={stat.color.split(" ")[0]}>{stat.icon}</span>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                                <p className="mt-0.5 text-xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {marketplace && (
                <>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Compass className="h-4 w-4 text-brand" />
                                    {t("superAdminDashboard.bookingsBySource")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">{t("superAdminDashboard.marketplaceSource")}</span>
                                    <span className="font-semibold text-slate-900">{marketplace.bookingsBySource.marketplace}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">{t("superAdminDashboard.salonSiteSource")}</span>
                                    <span className="font-semibold text-slate-900">{marketplace.bookingsBySource.salonSite}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">{t("superAdminDashboard.otherSources")}</span>
                                    <span className="font-semibold text-slate-900">
                                        {marketplace.bookingsBySource.admin + marketplace.bookingsBySource.manual}
                                    </span>
                                </div>
                                <div className="mt-3 rounded-lg bg-brand-soft-bg px-3 py-2 text-xs text-brand">
                                    {t("superAdminDashboard.marketplaceShare", {
                                        percent: formatPercent(marketplace.bookingsBySource.marketplaceShare),
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="h-4 w-4 text-blue-500" />
                                    {t("superAdminDashboard.marketplaceFunnel")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">{t("superAdminDashboard.funnelSearches")}</p>
                                        <p className="text-lg font-bold text-slate-900">{marketplace.funnel.searches}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">{t("superAdminDashboard.funnelClicks")}</p>
                                        <p className="text-lg font-bold text-slate-900">{marketplace.funnel.resultClicks}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">{t("superAdminDashboard.funnelBookNow")}</p>
                                        <p className="text-lg font-bold text-slate-900">{marketplace.funnel.bookNowClicks}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">{t("superAdminDashboard.funnelBookingStarts")}</p>
                                        <p className="text-lg font-bold text-slate-900">{marketplace.funnel.bookingStarts}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">{t("superAdminDashboard.funnelConfirmed")}</p>
                                        <p className="text-lg font-bold text-slate-900">{marketplace.funnel.bookingConfirmed}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                                    <p>{t("superAdminDashboard.searchToClickRate", { percent: formatPercent(marketplace.funnel.searchToClickRate) })}</p>
                                    <p>{t("superAdminDashboard.searchToBookRate", { percent: formatPercent(marketplace.funnel.searchToBookNowRate) })}</p>
                                    <p>{t("superAdminDashboard.startToConfirmRate", { percent: formatPercent(marketplace.funnel.startToConfirmRate) })}</p>
                                    <p>{t("superAdminDashboard.searchToConfirmRate", { percent: formatPercent(marketplace.funnel.searchToConfirmRate) })}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Search className="h-4 w-4 text-brand" />
                                    {t("superAdminDashboard.topSearchedServiceTypes")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {marketplace.demand.topSearchedServiceTypes.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        {marketplace.demand.topSearchedServiceTypes.map((item, index) => (
                                            <div key={item.serviceTypeId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-700">
                                                    {index + 1}. {item.name}
                                                </span>
                                                <span className="font-semibold text-slate-900">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="h-4 w-4 text-emerald-500" />
                                    {t("superAdminDashboard.topSearchedLocations")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {marketplace.demand.topSearchedLocations.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        {marketplace.demand.topSearchedLocations.map((item, index) => (
                                            <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-700">{item.label}</span>
                                                <span className="font-semibold text-slate-900">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MousePointerClick className="h-4 w-4 text-amber-500" />
                                    {t("superAdminDashboard.noExactMatchesTitle")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="text-2xl font-bold text-slate-900">{marketplace.funnel.noExactMatches}</div>
                                <p className="text-sm text-slate-500">
                                    {t("superAdminDashboard.noExactMatchesRate", { percent: formatPercent(marketplace.funnel.noExactRate) })}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {t("superAdminDashboard.peakDemandHour", {
                                        hour: `${String(marketplace.demand.peakDemandHour.hour).padStart(2, "0")}:00`,
                                        count: marketplace.demand.peakDemandHour.count,
                                    })}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="h-4 w-4 text-indigo-500" />
                                    {t("superAdminDashboard.topSearchedDates")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {marketplace.demand.topSearchedDates.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        {marketplace.demand.topSearchedDates.map((item) => (
                                            <div key={item.date} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-700">{item.date}</span>
                                                <span className="font-semibold text-slate-900">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-4 w-4 text-rose-500" />
                                {t("superAdminDashboard.demandByHour")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                                {marketplace.demand.demandByHour.map((item) => {
                                    const ratio = item.count / maxDemandHourCount;
                                    return (
                                        <div key={item.hour} className="flex flex-col items-center gap-1">
                                            <div className="flex h-20 w-full items-end rounded bg-slate-100 p-1">
                                                <div
                                                    className="w-full rounded bg-rose-400 transition-all"
                                                    style={{ height: `${Math.max(4, ratio * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-500">{String(item.hour).padStart(2, "0")}</span>
                                            <span className="text-[10px] font-medium text-slate-700">{item.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Top Shops Tables */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Top Shops by Revenue */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            {t("superAdminDashboard.topShopsByRevenue")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topShopsByRevenue.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="text-left font-medium text-slate-500 pb-2">#</th>
                                            <th className="text-left font-medium text-slate-500 pb-2">{t("superAdminDashboard.shopName")}</th>
                                            <th className="text-right font-medium text-slate-500 pb-2">{t("superAdminDashboard.revenue")}</th>
                                            <th className="text-right font-medium text-slate-500 pb-2">{t("superAdminDashboard.bookings")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.topShopsByRevenue.map((shop, i) => (
                                            <tr key={shop.id} className="border-b border-slate-50 last:border-0">
                                                <td className="py-2 text-slate-400 font-bold">{i + 1}</td>
                                                <td className="py-2 font-medium text-slate-700">{shop.name}</td>
                                                <td className="py-2 text-right text-emerald-600 font-medium">{formatCurrency(shop.revenue)}</td>
                                                <td className="py-2 text-right text-slate-500">{shop.bookingCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Shops by Bookings */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            {t("superAdminDashboard.topShopsByBookings")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topShopsByBookings.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="text-left font-medium text-slate-500 pb-2">#</th>
                                            <th className="text-left font-medium text-slate-500 pb-2">{t("superAdminDashboard.shopName")}</th>
                                            <th className="text-right font-medium text-slate-500 pb-2">{t("superAdminDashboard.bookings")}</th>
                                            <th className="text-right font-medium text-slate-500 pb-2">{t("superAdminDashboard.revenue")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.topShopsByBookings.map((shop, i) => (
                                            <tr key={shop.id} className="border-b border-slate-50 last:border-0">
                                                <td className="py-2 text-slate-400 font-bold">{i + 1}</td>
                                                <td className="py-2 font-medium text-slate-700">{shop.name}</td>
                                                <td className="py-2 text-right text-blue-600 font-medium">{shop.bookingCount}</td>
                                                <td className="py-2 text-right text-slate-500">{formatCurrency(shop.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Services */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Trophy className="h-4 w-4 text-brand" />
                        {t("superAdminDashboard.topServices")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {metrics.topServices.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("superAdminDashboard.noDataYet")}</p>
                    ) : (
                        <div className="space-y-3">
                            {metrics.topServices.map((service, i) => (
                                <div key={service.id} className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="truncate">
                                                <span className="text-sm font-medium text-slate-700">{service.name}</span>
                                                <span className="text-xs text-slate-400 ml-2">{service.shopName}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 ml-2 shrink-0">
                                                {t("superAdminDashboard.bookingsCount", { count: service.count })}
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-brand-soft-bg0 transition-all"
                                                style={{ width: `${service.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {[
                    { href: "/admin/super-admin/shops", icon: <Store className="h-4 w-4 shrink-0 text-brand" />, label: t("superAdminDashboard.manageShops") },
                    { href: "/admin/super-admin/service-types", icon: <Tags className="h-4 w-4 shrink-0 text-brand" />, label: t("superAdminDashboard.manageServiceTypes") },
                    { href: "/admin/super-admin/company-types", icon: <Building2 className="h-4 w-4 shrink-0 text-brand" />, label: t("superAdminDashboard.manageCompanyTypes") },
                    { href: "/admin/super-admin/test-notifications", icon: <MessageSquare className="h-4 w-4 shrink-0 text-brand" />, label: t("superAdminDashboard.manageTestNotifications") },
                    { href: "/admin/super-admin/users", icon: <Users className="h-4 w-4 shrink-0 text-brand" />, label: t("superAdminDashboard.manageAllUsers") },
                ].map((item, i, arr) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900",
                            i < arr.length - 1 && "border-b border-slate-100",
                        )}
                    >
                        {item.icon}
                        {item.label}
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
