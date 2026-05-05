"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { useI18n } from "@/lib/i18n";
import { getDashboardMetrics, type DashboardMetrics } from "../lib/adminApi";
import { isEntitlementApiError } from "@/lib/api-error";
import {
    ArrowRight,
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    Trophy,
    Users,
    Repeat,
    UserPlus,
    BarChart3,
    CircleSlash,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { canUseEntitledFeature } from "@/lib/plans/capabilities";
import { formatCurrencyFromCents } from "@/lib/currency";
import { getAdminNavigationForEntitlements, getDefaultAdminHref } from "@/lib/admin/navigation";
import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
import {
    AdminMetricGrid,
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    ErrorState,
    LoadingSkeleton,
    StatCard,
} from "@/components/admin/shared";

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function getBookingStatusTranslationKey(status: string) {
    if (status === "NO_SHOW") return "adminBookings.noShow";
    if (status === "PENDING") return "adminBookings.pending";
    if (status === "CONFIRMED") return "adminBookings.confirmed";
    if (status === "COMPLETED") return "adminBookings.completed";
    return "adminBookings.cancelled";
}

function getDayLabel(dayOfWeek: number, locale: string) {
    const base = new Date(2024, 0, 7 + dayOfWeek);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(base);
}

function getMonthLabel(monthKey: string, locale: string) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return monthKey;
    }
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, 1));
}

export default function DashboardHomePage() {
    const { companyId, companyName, role, companySlug, companyUser, user } = useAdminAuth();
    const router = useRouter();
    const { t, locale } = useI18n();
    const currency = companyUser?.company?.currency;
    const formatCurrency = (cents: number) => formatCurrencyFromCents(cents, currency);
    const navigationRole = role as "OWNER" | "ADMIN" | "STAFF" | null;
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [metricsLocked, setMetricsLocked] = useState(false);
    const dashboardFeature = "OPERATIONAL_DASHBOARD" as const;
    const canAccessDashboard = Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, dashboardFeature);
    const defaultAdminHref = useMemo(
        () => getDefaultAdminHref(companyUser?.company?.capabilities, navigationRole),
        [companyUser?.company?.capabilities, navigationRole],
    );
    const navigationGroups = useMemo(
        () => getAdminNavigationForEntitlements(companyUser?.company?.capabilities),
        [companyUser?.company?.capabilities],
    );
    const activeModules = useMemo(
        () =>
            navigationGroups
                .flatMap((group) => group.items)
                .filter((item) =>
                    item.state === "active" &&
                    !["dashboard", "hours", "staff", "business-settings", "profile"].includes(item.id),
                )
                .slice(0, 6),
        [navigationGroups],
    );
    const requestableModules = useMemo(
        () =>
            navigationGroups
                .flatMap((group) => group.items)
                .filter((item) => item.state === "locked"),
        [navigationGroups],
    );

    useEffect(() => {
        if (defaultAdminHref === "/admin/dashboard") return;
        router.replace(defaultAdminHref);
    }, [defaultAdminHref, router]);

    useEffect(() => {
        if (defaultAdminHref !== "/admin/dashboard") {
            setLoading(false);
            setMetrics(null);
            setLoadFailed(false);
            setMetricsLocked(false);
            return;
        }

        setLoading(true);
        setLoadFailed(false);
        setMetricsLocked(false);

        if (!canAccessDashboard) {
            setLoading(false);
            setMetrics(null);
            setLoadFailed(false);
            return;
        }

        getDashboardMetrics()
            .then(setMetrics)
            .catch((err) => {
                if (isEntitlementApiError(err)) {
                    setMetricsLocked(true);
                    setMetrics(null);
                    return;
                }
                setLoadFailed(true);
                void notify.error(err instanceof Error ? err.message : t("adminHome.loadMetricsError"));
            })
            .finally(() => setLoading(false));
    }, [canAccessDashboard, companyId, defaultAdminHref, t]);

    const shouldRenderMetricsLockedState = !canAccessDashboard || metricsLocked;

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

    if (defaultAdminHref !== "/admin/dashboard") {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={4} variant="page" />
            </AdminPageShell>
        );
    }

    if (loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={6} variant="page" />
            </AdminPageShell>
        );
    }

    if (shouldRenderMetricsLockedState) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("adminNav.dashboard")}
                    subtitle={t("adminHome.metricsFallbackSubtitle")}
                />

                <div className="space-y-6">
                    <EntitlementLockedCard
                        title={t("entitlements.metricsLockedTitle")}
                        description={t("entitlements.metricsLockedDescription")}
                        capability="METRICAS_OPERATIONAL_DASHBOARD"
                        source="ADMIN_LOCKED_PAGE"
                    />

                    <AdminSectionCard
                        title={t("adminHome.activeModules")}
                        description={t("adminHome.activeModulesDescription")}
                    >
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {activeModules.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-admin-brand/30 hover:shadow-sm"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{t(item.labelKey)}</p>
                                    <p className="mt-1 text-sm text-slate-500">{t("adminHome.moduleEnabled")}</p>
                                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-admin-brand">
                                        {t("adminModules.openModuleLink")}
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </AdminSectionCard>

                    {requestableModules.length > 0 ? (
                        <AdminSectionCard
                            title={t("adminHome.availableAddOns")}
                            description={t("adminHome.availableAddOnsDescription")}
                        >
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {requestableModules.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 transition hover:bg-amber-50"
                                    >
                                        <p className="text-sm font-semibold text-slate-900">{t(item.labelKey)}</p>
                                        <p className="mt-1 text-sm text-slate-600">{t("adminHome.moduleAvailable")}</p>
                                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-700">
                                            {t("productAccessRequest.requires", { productName: t(item.labelKey) })}
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </AdminSectionCard>
                    ) : null}
                </div>
            </AdminPageShell>
        );
    }

    if (loadFailed || !metrics) {
        return (
            <AdminPageShell>
                <AdminPageHeader title={t("adminHome.welcome", { name: companyName || "" })} />
                <ErrorState
                    icon={CircleSlash}
                    title={t("adminHome.loadMetricsError")}
                    description={t("common.error")}
                />
            </AdminPageShell>
        );
    }

    const primaryStatCards = [
        {
            label: t("adminHome.totalBookings"),
            value: metrics.bookings.total.toLocaleString(),
            hint: t("adminHome.thisMonthCount", { count: metrics.bookings.thisMonth }),
            icon: <Calendar className="h-5 w-5 shrink-0" />,
            color: "text-admin-brand-soft-text bg-admin-brand-soft",
        },
        {
            label: t("adminHome.revenueThisMonth"),
            value: formatCurrency(metrics.revenue.thisMonth),
            hint: t("adminHome.revenueAllTime", { amount: formatCurrency(metrics.revenue.total) }),
            icon: <DollarSign className="h-5 w-5 shrink-0" />,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            label: t("adminHome.today"),
            value: metrics.bookings.today.toLocaleString(),
            hint: t("adminHome.todayRevenue", { amount: formatCurrency(metrics.revenue.today) }),
            icon: <TrendingUp className="h-5 w-5 shrink-0" />,
            color: "text-slate-700 bg-slate-100",
        },
        {
            label: t("adminHome.upcoming7Days"),
            value: metrics.bookings.upcoming7Days.toLocaleString(),
            hint: t("adminHome.avgPerBooking", { amount: formatCurrency(metrics.revenue.avgPerBooking) }),
            icon: <Clock className="h-5 w-5 shrink-0" />,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    const customerStatCards = [
        {
            label: t("adminHome.totalCustomers"),
            value: metrics.customerInsights.totalCustomers.toLocaleString(),
            hint: t("adminHome.newCustomersThisMonth", {
                count: metrics.customerInsights.newCustomersThisMonth,
            }),
            icon: <Users className="h-5 w-5 shrink-0" />,
            color: "text-admin-brand-soft-text bg-admin-brand-soft",
        },
        {
            label: t("adminHome.returningCustomers"),
            value: metrics.customerInsights.returningCustomers.toLocaleString(),
            hint: t("adminHome.repeatRate", {
                rate: formatPercent(metrics.customerInsights.repeatRate),
            }),
            icon: <Repeat className="h-5 w-5 shrink-0" />,
            color: "text-slate-700 bg-slate-100",
        },
        {
            label: t("adminHome.newCustomersThisWeek"),
            value: metrics.customerInsights.newCustomersThisWeek.toLocaleString(),
            hint: t("adminHome.avgBookingsPerCustomer", {
                count: metrics.customerInsights.avgBookingsPerCustomer,
            }),
            icon: <UserPlus className="h-5 w-5 shrink-0" />,
            color: "text-rose-700 bg-rose-50",
        },
        {
            label: t("adminHome.bookingsByStatus"),
            value: metrics.bookingsByStatus.reduce((sum, item) => sum + item.count, 0).toLocaleString(),
            hint: t("adminHome.statusGroups", { count: metrics.bookingsByStatus.length }),
            icon: <BarChart3 className="h-5 w-5 shrink-0" />,
            color: "text-slate-700 bg-slate-100",
        },
    ];

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminHome.welcome", { name: companyName || "" })}
                subtitle={t("adminHome.role", { role: role?.toLowerCase() || "" })}
            />

            <AdminMetricGrid>
                {primaryStatCards.map((stat) => (
                    <StatCard
                        key={String(stat.label)}
                        label={stat.label}
                        value={stat.value}
                        hint={stat.hint}
                        icon={stat.icon}
                        iconClassName={stat.color}
                    />
                ))}
            </AdminMetricGrid>

            <AdminMetricGrid>
                {customerStatCards.map((stat) => (
                    <StatCard
                        key={String(stat.label)}
                        label={stat.label}
                        value={stat.value}
                        hint={stat.hint}
                        icon={stat.icon}
                        iconClassName={stat.color}
                    />
                ))}
            </AdminMetricGrid>

            <div className="grid gap-6 md:grid-cols-2">
                <AdminSectionCard
                    title={(
                        <span className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            {t("adminHome.topServices")}
                        </span>
                    )}
                >
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
                                                <div className="h-full rounded-full bg-admin-brand transition-all" style={{ width: `${service.percentage}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </AdminSectionCard>

                <AdminSectionCard
                    title={(
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-admin-brand" />
                            {t("adminHome.topStaffMembers")}
                        </span>
                    )}
                >
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
                </AdminSectionCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <AdminSectionCard title={t("adminHome.bookingsByStatus")} className="lg:col-span-1">
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
                                                <div className="h-full rounded-full bg-admin-brand" style={{ width: `${width}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </AdminSectionCard>

                <AdminSectionCard title={t("adminHome.bookingsByCategory")} className="lg:col-span-1">
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
                </AdminSectionCard>

                <AdminSectionCard title={t("adminHome.busiestMoments")} className="lg:col-span-1" contentClassName="space-y-4">
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
                                            {getDayLabel(entry.dayOfWeek, locale)}: {entry.count}
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
                </AdminSectionCard>
            </div>

            <AdminSectionCard title={t("adminHome.customerGrowthTrend")}>
                    {metrics.customerGrowthTrend.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminHome.noDataYet")}</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {metrics.customerGrowthTrend.map((point) => {
                                const height = maxTrendCount > 0 ? Math.max(8, Math.round((point.newCustomers / maxTrendCount) * 48)) : 8;
                                return (
                                    <div key={point.month} className="rounded-md border border-admin-border bg-admin-surface-subtle p-3">
                                        <p className="text-xs text-slate-500">{getMonthLabel(point.month, locale)}</p>
                                        <div className="mt-2 flex items-end gap-2">
                                            <div className="w-2 rounded-full bg-admin-brand" style={{ height: `${height}px` }} />
                                            <p className="text-sm font-semibold text-slate-800">
                                                {point.newCustomers}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
            </AdminSectionCard>

            {companySlug && (
                <AdminSectionCard title={t("adminHome.quickLinks")} contentClassName="text-slate-600">
                        <p>
                            {t("adminHome.publicShopPage")}{" "}
                            <a href={`/shop/${companySlug}`} target="_blank" rel="noopener noreferrer" className="text-admin-brand hover:underline">
                                /shop/{companySlug}
                            </a>
                        </p>
                </AdminSectionCard>
            )}
        </AdminPageShell>
    );
}
