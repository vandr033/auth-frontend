"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { getDashboardMetrics, type DashboardMetrics } from "../lib/adminApi";
import {
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    Loader2,
    Trophy,
    Users,
    Repeat,
    UserPlus,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(cents / 100);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function getBookingStatusTranslationKey(status: string) {
    if (status === "NO_SHOW") return "adminBookings.noShow";
    if (status === "PENDING") return "adminBookings.pending";
    if (status === "CONFIRMED") return "adminBookings.confirmed";
    if (status === "COMPLETED") return "adminBookings.completed";
    return "adminBookings.cancelled";
}

function getDayLabel(dayOfWeek: number) {
    const base = new Date(2024, 0, 7 + dayOfWeek);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(base);
}

function getMonthLabel(monthKey: string) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return monthKey;
    }
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, 1));
}

export default function DashboardHomePage() {
    const { companyName, role, companySlug } = useAdminAuth();
    const t = useT();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        getDashboardMetrics()
            .then(setMetrics)
            .catch((err) => {
                setLoadFailed(true);
                void notify.error(err instanceof Error ? err.message : t("adminHome.loadMetricsError"));
            })
            .finally(() => setLoading(false));
    }, [t]);

    const maxStatusCount = useMemo(() => {
        if (!metrics || metrics.bookingsByStatus.length === 0) return 0;
        return Math.max(...metrics.bookingsByStatus.map((item) => item.count));
    }, [metrics]);

    const maxCategoryCount = useMemo(() => {
        if (!metrics || metrics.bookingsByCategory.length === 0) return 0;
        return Math.max(...metrics.bookingsByCategory.map((item) => item.count));
    }, [metrics]);

    const maxTrendCount = useMemo(() => {
        if (!metrics || metrics.customerGrowthTrend.length === 0) return 0;
        return Math.max(...metrics.customerGrowthTrend.map((item) => item.newCustomers));
    }, [metrics]);

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
                    <h2 className="text-2xl font-bold text-slate-900">
                        {t("adminHome.welcome", { name: companyName || "" })}
                    </h2>
                </div>
                <p className="text-sm text-slate-500">{t("adminHome.loadMetricsError")}</p>
            </div>
        );
    }

    const primaryStatCards = [
        {
            label: t("adminHome.totalBookings"),
            value: metrics.bookings.total.toLocaleString(),
            sub: t("adminHome.thisMonthCount", { count: metrics.bookings.thisMonth }),
            icon: <Calendar className="h-5 w-5" />,
            color: "text-blue-600 bg-blue-50",
        },
        {
            label: t("adminHome.revenueThisMonth"),
            value: formatCurrency(metrics.revenue.thisMonth),
            sub: t("adminHome.revenueAllTime", { amount: formatCurrency(metrics.revenue.total) }),
            icon: <DollarSign className="h-5 w-5" />,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            label: t("adminHome.today"),
            value: metrics.bookings.today.toLocaleString(),
            sub: t("adminHome.todayRevenue", { amount: formatCurrency(metrics.revenue.today) }),
            icon: <TrendingUp className="h-5 w-5" />,
            color: "text-purple-600 bg-purple-50",
        },
        {
            label: t("adminHome.upcoming7Days"),
            value: metrics.bookings.upcoming7Days.toLocaleString(),
            sub: t("adminHome.avgPerBooking", { amount: formatCurrency(metrics.revenue.avgPerBooking) }),
            icon: <Clock className="h-5 w-5" />,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    const customerStatCards = [
        {
            label: t("adminHome.totalCustomers"),
            value: metrics.customerInsights.totalCustomers.toLocaleString(),
            sub: t("adminHome.newCustomersThisMonth", {
                count: metrics.customerInsights.newCustomersThisMonth,
            }),
            icon: <Users className="h-5 w-5" />,
            color: "text-cyan-700 bg-cyan-50",
        },
        {
            label: t("adminHome.returningCustomers"),
            value: metrics.customerInsights.returningCustomers.toLocaleString(),
            sub: t("adminHome.repeatRate", {
                rate: formatPercent(metrics.customerInsights.repeatRate),
            }),
            icon: <Repeat className="h-5 w-5" />,
            color: "text-slate-700 bg-slate-100",
        },
        {
            label: t("adminHome.newCustomersThisWeek"),
            value: metrics.customerInsights.newCustomersThisWeek.toLocaleString(),
            sub: t("adminHome.avgBookingsPerCustomer", {
                count: metrics.customerInsights.avgBookingsPerCustomer,
            }),
            icon: <UserPlus className="h-5 w-5" />,
            color: "text-rose-700 bg-rose-50",
        },
        {
            label: t("adminHome.bookingsByStatus"),
            value: metrics.bookingsByStatus.reduce((sum, item) => sum + item.count, 0).toLocaleString(),
            sub: t("adminHome.statusGroups", { count: metrics.bookingsByStatus.length }),
            icon: <BarChart3 className="h-5 w-5" />,
            color: "text-indigo-700 bg-indigo-50",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {t("adminHome.welcome", { name: companyName || "" })}
                </h2>
                <p className="text-slate-600">
                    {t("adminHome.role", { role: role?.toLowerCase() || "" })}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {primaryStatCards.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {stat.label}
                            </CardTitle>
                            <div className={cn("p-2 rounded-lg", stat.color)}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {customerStatCards.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {stat.label}
                            </CardTitle>
                            <div className={cn("p-2 rounded-lg", stat.color)}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            {t("adminHome.topServices")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topServices.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.topServices.map((service, i) => (
                                    <div key={service.id} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-slate-700 truncate">{service.name}</span>
                                                <span className="text-xs text-slate-500 ml-2 shrink-0">{t("adminHome.bookingsCount", { count: service.count })}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${service.percentage}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-blue-500" />
                            {t("adminHome.topStaffMembers")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topStaff.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.topStaff.map((staff, i) => (
                                    <div key={staff.id} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-700 truncate">{staff.name}</span>
                                                <div className="flex items-center gap-3 ml-2 shrink-0">
                                                    <span className="text-xs text-slate-500">{t("adminHome.bookingsCount", { count: staff.bookingCount })}</span>
                                                    <span className="text-xs font-medium text-emerald-600">{formatCurrency(staff.revenue)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminHome.bookingsByStatus")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.bookingsByStatus.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.bookingsByStatus.map((item) => {
                                    const width = maxStatusCount > 0 ? (item.count / maxStatusCount) * 100 : 0;
                                    return (
                                        <div key={item.status} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">{t(getBookingStatusTranslationKey(item.status))}</span>
                                                <span className="font-medium text-slate-800">{item.count}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminHome.bookingsByCategory")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.bookingsByCategory.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.bookingsByCategory.map((item, index) => {
                                    const width = maxCategoryCount > 0 ? (item.count / maxCategoryCount) * 100 : 0;
                                    return (
                                        <div key={`${item.categoryName || "uncategorized"}-${index}`} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">{item.categoryName || t("adminServices.uncategorized")}</span>
                                                <span className="font-medium text-slate-800">{item.count}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminHome.busiestMoments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                {t("adminHome.busiestDays")}
                            </p>
                            {metrics.busiestMoments.busiestDays.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                            ) : (
                                <div className="space-y-1 text-sm text-slate-700">
                                    {metrics.busiestMoments.busiestDays.map((entry) => (
                                        <p key={`day-${entry.dayOfWeek}`}>
                                            {getDayLabel(entry.dayOfWeek)}: {entry.count}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                {t("adminHome.busiestHours")}
                            </p>
                            {metrics.busiestMoments.busiestHours.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminHome.noBookingsYet")}</p>
                            ) : (
                                <div className="space-y-1 text-sm text-slate-700">
                                    {metrics.busiestMoments.busiestHours.map((entry) => (
                                        <p key={`hour-${entry.hour}`}>
                                            {t("adminHome.hourCount", { hour: `${entry.hour.toString().padStart(2, "0")}:00`, count: entry.count })}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminHome.customerGrowthTrend")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {metrics.customerGrowthTrend.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminHome.noDataYet")}</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {metrics.customerGrowthTrend.map((point) => {
                                const height = maxTrendCount > 0 ? Math.max(8, Math.round((point.newCustomers / maxTrendCount) * 48)) : 8;
                                return (
                                    <div key={point.month} className="rounded-md border border-slate-200 p-3">
                                        <p className="text-xs text-slate-500">{getMonthLabel(point.month)}</p>
                                        <div className="mt-2 flex items-end gap-2">
                                            <div className="w-2 rounded-full bg-cyan-500" style={{ height: `${height}px` }} />
                                            <p className="text-sm font-semibold text-slate-800">
                                                {point.newCustomers}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {companySlug && (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle>{t("adminHome.quickLinks")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-600">
                        <p>
                            {t("adminHome.publicShopPage")}{" "}
                            <a href={`/shop/${companySlug}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                                /shop/{companySlug}
                            </a>
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
