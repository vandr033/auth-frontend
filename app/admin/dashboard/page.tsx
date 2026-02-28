"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { getDashboardMetrics, type DashboardMetrics } from "../lib/adminApi";
import { Calendar, DollarSign, TrendingUp, Clock, Loader2, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
                void notify.error(err instanceof Error ? err.message : t('adminHome.loadMetricsError'));
            })
            .finally(() => setLoading(false));
    }, [t]);

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
                        {t('adminHome.welcome', { name: companyName || '' })}
                    </h2>
                </div>
                <p className="text-sm text-slate-500">{t('adminHome.loadMetricsError')}</p>
            </div>
        );
    }

    const statCards = [
        {
            label: t('adminHome.totalBookings'),
            value: metrics.bookings.total.toLocaleString(),
            sub: t('adminHome.thisMonthCount', { count: metrics.bookings.thisMonth }),
            icon: <Calendar className="h-5 w-5" />,
            color: "text-blue-600 bg-blue-50",
        },
        {
            label: t('adminHome.revenueThisMonth'),
            value: formatCurrency(metrics.revenue.thisMonth),
            sub: t('adminHome.revenueAllTime', { amount: formatCurrency(metrics.revenue.total) }),
            icon: <DollarSign className="h-5 w-5" />,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            label: t('adminHome.today'),
            value: metrics.bookings.today.toLocaleString(),
            sub: t('adminHome.todayRevenue', { amount: formatCurrency(metrics.revenue.today) }),
            icon: <TrendingUp className="h-5 w-5" />,
            color: "text-purple-600 bg-purple-50",
        },
        {
            label: t('adminHome.upcoming7Days'),
            value: metrics.bookings.upcoming7Days.toLocaleString(),
            sub: t('adminHome.avgPerBooking', { amount: formatCurrency(metrics.revenue.avgPerBooking) }),
            icon: <Clock className="h-5 w-5" />,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {t('adminHome.welcome', { name: companyName || '' })}
                </h2>
                <p className="text-slate-600">
                    {t('adminHome.role', { role: role?.toLowerCase() || '' })}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
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

            {/* Top Services & Top Staff */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            {t('adminHome.topServices')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topServices.length === 0 ? (
                            <p className="text-sm text-slate-500">{t('adminHome.noBookingsYet')}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.topServices.map((service, i) => (
                                    <div key={service.id} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-slate-700 truncate">{service.name}</span>
                                                <span className="text-xs text-slate-500 ml-2 shrink-0">{t('adminHome.bookingsCount', { count: service.count })}</span>
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
                            {t('adminHome.topStaffMembers')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.topStaff.length === 0 ? (
                            <p className="text-sm text-slate-500">{t('adminHome.noBookingsYet')}</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.topStaff.map((staff, i) => (
                                    <div key={staff.id} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-700 truncate">{staff.name}</span>
                                                <div className="flex items-center gap-3 ml-2 shrink-0">
                                                    <span className="text-xs text-slate-500">{t('adminHome.bookingsCount', { count: staff.bookingCount })}</span>
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

            {/* Quick Links */}
            {companySlug && (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle>{t('adminHome.quickLinks')}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-600">
                        <p>
                            {t('adminHome.publicShopPage')}{" "}
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
