"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

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
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SuperAdminDashboard() {
    const t = useT();
    const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(resolveUrl("/api/super-admin/dashboard/metrics"), { credentials: "include" })
            .then(async (res) => {
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Request failed");
                setMetrics(json.data);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminDashboard.title")}</h1>
                    <p className="text-slate-500">{t("superAdminDashboard.subtitle")}</p>
                </div>
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="pt-6">
                        <p className="text-rose-700 text-sm">{error || t("superAdminDashboard.loadError")}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statCards = [
        {
            label: t("superAdminDashboard.totalBookings"),
            value: metrics.bookings.total.toLocaleString(),
            sub: t("superAdminDashboard.thisMonthCount", { count: metrics.bookings.thisMonth }),
            icon: <Calendar className="h-5 w-5" />,
            color: "text-violet-600 bg-violet-50",
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
            color: "text-violet-600 bg-violet-50",
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminDashboard.title")}</h1>
                <p className="text-slate-500">{t("superAdminDashboard.subtitle")}</p>
            </div>

            {/* Primary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">{stat.label}</CardTitle>
                            <div className={cn("p-2 rounded-lg", stat.color)}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Secondary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                {secondaryCards.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", stat.color)}>{stat.icon}</div>
                                <div>
                                    <p className="text-sm text-slate-500">{stat.label}</p>
                                    <p className="text-xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

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
                        <Trophy className="h-4 w-4 text-violet-500" />
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
                                                className="h-full rounded-full bg-violet-500 transition-all"
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
            <div className="grid gap-4 sm:grid-cols-3">
                <Link href="/admin/super-admin/shops">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Store className="h-5 w-5 text-violet-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{t("superAdminDashboard.manageShops")}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/super-admin/service-types">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Tags className="h-5 w-5 text-violet-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{t("superAdminDashboard.manageServiceTypes")}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/super-admin/company-types">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-violet-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{t("superAdminDashboard.manageCompanyTypes")}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
