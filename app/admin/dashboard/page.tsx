"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
    Package,
    ShoppingBag,
    Store,
    Receipt,
    MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { canUsePlanFeature, getRequiredPlanForFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { formatCurrencyFromCents, formatFixedCurrencyFromCents } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { isStoreOnlyCompany, resolveCompanyModules } from "@/lib/company-modules";

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

type StoreBootstrapSummary = {
    settings?: {
        supports_pickup?: boolean;
        supports_delivery?: boolean;
    };
    categories?: Array<{ id: number }>;
    products?: Array<{ id: number; is_featured?: boolean; is_active?: boolean }>;
    points_of_sale?: Array<{ id: number; is_active?: boolean; pickup_enabled?: boolean; delivery_enabled?: boolean }>;
    delivery_rules_source?: "explicit" | "company_hours";
};

type StoreOrderSummary = {
    id: number;
    guest_name?: string;
    created_at?: string;
    fulfillment_type?: string;
    order_type?: string;
    status: string;
    total_cents: number;
    payment_status?: string;
    point_of_sale?: {
        id: number;
        name: string;
        city: string;
    } | null;
    items?: Array<{ id: number }>;
};

function resolveAdminApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

function getStoreOrderStatusTone(status: string) {
    switch (status) {
        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "CANCELLED":
            return "bg-rose-50 text-rose-700 border-rose-200";
        case "READY":
        case "SENT":
            return "bg-sky-50 text-sky-700 border-sky-200";
        case "IN_PROCESS":
        case "ASSIGNED":
            return "bg-amber-50 text-amber-700 border-amber-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

function getStorePaymentTone(status?: string | null) {
    switch (status) {
        case "PAID":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "REJECTED":
            return "bg-rose-50 text-rose-700 border-rose-200";
        case "PENDING_CONFIRMATION":
            return "bg-amber-50 text-amber-700 border-amber-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

export default function DashboardHomePage() {
    const { companyId, companyName, role, companySlug, companyUser, user } = useAdminAuth();
    const t = useT();
    const currency = companyUser?.company?.currency;
    const formatCurrency = (cents: number) => formatCurrencyFromCents(cents, currency);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const modules = resolveCompanyModules(companyUser?.company?.modules);
    const isStoreOnly = isStoreOnlyCompany(modules);
    const dashboardFeature = "OPERATIONAL_DASHBOARD" as const;
    const canAccessDashboard = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, dashboardFeature);

    useEffect(() => {
        if (isStoreOnly) {
            setLoading(false);
            setMetrics(null);
            setLoadFailed(false);
            return;
        }

        setLoading(true);
        setLoadFailed(false);

        if (!canAccessDashboard) {
            setLoading(false);
            setMetrics(null);
            setLoadFailed(false);
            return;
        }

        getDashboardMetrics()
            .then(setMetrics)
            .catch((err) => {
                setLoadFailed(true);
                void notify.error(err instanceof Error ? err.message : t("adminHome.loadMetricsError"));
            })
            .finally(() => setLoading(false));
    }, [canAccessDashboard, companyId, isStoreOnly, t]);

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

    if (!canAccessDashboard) {
        const requiredPlan = getRequiredPlanForFeature(dashboardFeature);
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">{t("adminNav.dashboard")}</h2>
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={
                        requiredPlan === "PRO"
                            ? t("planEnforcement.availableOnPro")
                            : t("planEnforcement.availableOnBusiness")
                    }
                    feature={dashboardFeature}
                    currentPlan={plan}
                    requiredPlan={requiredPlan}
                    fullPage
                />
            </div>
        );
    }

    if (isStoreOnly) {
        return (
            <StoreOnlyDashboard
                companyName={companyName}
                companySlug={companySlug}
                currency={currency}
            />
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
            icon: <Calendar className="h-5 w-5 shrink-0" />,
            color: "text-blue-600 bg-blue-50",
        },
        {
            label: t("adminHome.revenueThisMonth"),
            value: formatCurrency(metrics.revenue.thisMonth),
            sub: t("adminHome.revenueAllTime", { amount: formatCurrency(metrics.revenue.total) }),
            icon: <DollarSign className="h-5 w-5 shrink-0" />,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            label: t("adminHome.today"),
            value: metrics.bookings.today.toLocaleString(),
            sub: t("adminHome.todayRevenue", { amount: formatCurrency(metrics.revenue.today) }),
            icon: <TrendingUp className="h-5 w-5 shrink-0" />,
            color: "text-purple-600 bg-purple-50",
        },
        {
            label: t("adminHome.upcoming7Days"),
            value: metrics.bookings.upcoming7Days.toLocaleString(),
            sub: t("adminHome.avgPerBooking", { amount: formatCurrency(metrics.revenue.avgPerBooking) }),
            icon: <Clock className="h-5 w-5 shrink-0" />,
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
            icon: <Users className="h-5 w-5 shrink-0" />,
            color: "text-cyan-700 bg-cyan-50",
        },
        {
            label: t("adminHome.returningCustomers"),
            value: metrics.customerInsights.returningCustomers.toLocaleString(),
            sub: t("adminHome.repeatRate", {
                rate: formatPercent(metrics.customerInsights.repeatRate),
            }),
            icon: <Repeat className="h-5 w-5 shrink-0" />,
            color: "text-slate-700 bg-slate-100",
        },
        {
            label: t("adminHome.newCustomersThisWeek"),
            value: metrics.customerInsights.newCustomersThisWeek.toLocaleString(),
            sub: t("adminHome.avgBookingsPerCustomer", {
                count: metrics.customerInsights.avgBookingsPerCustomer,
            }),
            icon: <UserPlus className="h-5 w-5 shrink-0" />,
            color: "text-rose-700 bg-rose-50",
        },
        {
            label: t("adminHome.bookingsByStatus"),
            value: metrics.bookingsByStatus.reduce((sum, item) => sum + item.count, 0).toLocaleString(),
            sub: t("adminHome.statusGroups", { count: metrics.bookingsByStatus.length }),
            icon: <BarChart3 className="h-5 w-5 shrink-0" />,
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

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
                    {customerStatCards.map((stat) => (
                        <div key={stat.label} className="bg-white px-4 py-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                            <div className="mt-1.5 text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
                        </div>
                    ))}
                </div>
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
                        <div className="space-y-2">
                            {metrics.customerGrowthTrend.map((point) => {
                                const pct = maxTrendCount > 0 ? Math.round((point.newCustomers / maxTrendCount) * 100) : 0;
                                return (
                                    <div key={point.month} className="flex items-center gap-3">
                                        <span className="w-20 shrink-0 text-xs text-slate-500">{getMonthLabel(point.month)}</span>
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-800">{point.newCustomers}</span>
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

function StoreOnlyDashboard({
    companyName,
    companySlug,
    currency,
}: {
    companyName: string | null;
    companySlug: string | null;
    currency?: string;
}) {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [bootstrap, setBootstrap] = useState<StoreBootstrapSummary | null>(null);
    const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setLoadFailed(false);

            try {
                const [bootstrapRes, ordersRes] = await Promise.all([
                    fetch(resolveAdminApiUrl("/api/admin/commerce/bootstrap"), { credentials: "include" }),
                    fetch(resolveAdminApiUrl("/api/admin/commerce/orders"), { credentials: "include" }),
                ]);

                const bootstrapJson = await bootstrapRes.json().catch(() => ({}));
                const ordersJson = await ordersRes.json().catch(() => ({}));

                if (!bootstrapRes.ok || bootstrapJson.error) {
                    throw new Error(bootstrapJson.message || t("adminStore.errors.loadBootstrap"));
                }
                if (!ordersRes.ok || ordersJson.error) {
                    throw new Error(ordersJson.message || t("adminStore.errors.loadOrders"));
                }

                if (cancelled) return;

                setBootstrap((bootstrapJson.data ?? null) as StoreBootstrapSummary | null);
                setOrders(Array.isArray(ordersJson.data) ? ordersJson.data as StoreOrderSummary[] : []);
            } catch (error) {
                if (cancelled) return;
                setLoadFailed(true);
                void notify.error(error instanceof Error ? error.message : t("adminStore.partialSummaryLoadFailed"));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    const products = bootstrap?.products ?? [];
    const categories = bootstrap?.categories ?? [];
    const pointsOfSale = bootstrap?.points_of_sale ?? [];
    const pendingOrders = orders.filter((order) => ["NEW", "SCHEDULED", "ASSIGNED", "IN_PROCESS", "READY"].includes(order.status));
    const paidOrders = orders.filter((order) => order.payment_status === "PAID");
    const paidRevenue = paidOrders.reduce((sum, order) => sum + order.total_cents, 0);
    const productsLive = products.filter((product) => product.is_active !== false);
    const featuredProducts = productsLive.filter((product) => product.is_featured);
    const pendingPaymentReview = orders.filter((order) => order.payment_status === "PENDING_CONFIRMATION");
    const deliveryEnabledPoints = pointsOfSale.filter((point) => point.delivery_enabled);
    const recentOrders = orders.slice(0, 5);
    const statusBuckets = ["NEW", "SCHEDULED", "ASSIGNED", "IN_PROCESS", "READY", "SENT", "DELIVERED"];
    const statusSummary = statusBuckets.map((status) => ({
        status,
        count: orders.filter((order) => order.status === status).length,
    }));
    const hasOperationalData = orders.length > 0 || productsLive.length > 0 || categories.length > 0;
    const checklistItems = [
        {
            key: "products",
            done: productsLive.length > 0,
            label: productsLive.length > 0
                ? t("adminStore.setupProductsReady", { count: productsLive.length.toLocaleString() })
                : t("adminStore.setupProductsMissing"),
        },
        {
            key: "categories",
            done: categories.length > 0,
            label: categories.length > 0
                ? t("adminStore.setupCategoriesReady", { count: categories.length.toLocaleString() })
                : t("adminStore.setupCategoriesMissing"),
        },
        {
            key: "points",
            done: pointsOfSale.length > 0,
            label: pointsOfSale.length > 0
                ? t("adminStore.setupPointsReady", { count: pointsOfSale.length.toLocaleString() })
                : t("adminStore.setupPointsMissing"),
        },
        {
            key: "delivery",
            done: bootstrap?.settings?.supports_delivery ? deliveryEnabledPoints.length > 0 : true,
            label: bootstrap?.settings?.supports_delivery
                ? (
                    bootstrap?.delivery_rules_source === "explicit"
                        ? t("adminStore.setupDeliveryExplicit")
                        : t("adminStore.setupDeliveryFallback")
                )
                : t("adminStore.setupPickupOnly"),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {t("adminHome.welcome", { name: companyName || "" })}
                </h2>
                <p className="text-slate-600">
                    {t("adminStore.dashboardIntro")}
                </p>
            </div>

            {!hasOperationalData ? (
                <Card className="border-slate-200 bg-white">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminStore.firstOrderTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                        <p>{t("adminStore.firstOrderDescription")}</p>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                                <Link href="/admin/dashboard/store">{t("adminStore.openStoreAdmin")}</Link>
                            </Button>
                            {companySlug ? (
                                <Button asChild variant="outline">
                                    <Link href={`/shop/${companySlug}/store`} target="_blank">{t("adminStore.viewPublicStore")}</Link>
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StoreStatCard
                    label={t("adminStore.activeCatalog")}
                    value={productsLive.length.toLocaleString()}
                    sub={t("adminStore.featuredCount", { count: featuredProducts.length.toLocaleString() })}
                    icon={<Package className="h-5 w-5 shrink-0" />}
                    color="text-blue-600 bg-blue-50"
                />
                <StoreStatCard
                    label={t("adminStore.needsAction")}
                    value={pendingOrders.length.toLocaleString()}
                    sub={t("adminStore.totalOrdersCount", { count: orders.length.toLocaleString() })}
                    icon={<ShoppingBag className="h-5 w-5 shrink-0" />}
                    color="text-emerald-600 bg-emerald-50"
                />
                <StoreStatCard
                    label={t("adminStore.paymentReview")}
                    value={pendingPaymentReview.length.toLocaleString()}
                    sub={t("adminStore.paidOrdersCount", { count: paidOrders.length.toLocaleString() })}
                    icon={<Receipt className="h-5 w-5 shrink-0" />}
                    color="text-amber-600 bg-amber-50"
                />
                <StoreStatCard
                    label={t("adminStore.deliveryCoverage")}
                    value={deliveryEnabledPoints.length.toLocaleString()}
                    sub={t("adminStore.pickupPointsCount", { count: pointsOfSale.length.toLocaleString() })}
                    icon={<MapPin className="h-5 w-5 shrink-0" />}
                    color="text-purple-600 bg-purple-50"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminStore.operationsBoard")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {orders.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminStore.operationsBoardEmpty")}</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {statusSummary.map((entry) => (
                                    <div key={entry.status} className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            {t(`adminStore.orderStatuses.${entry.status}`)}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-slate-900">{entry.count.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminStore.recentOrdersTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("adminStore.recentOrdersEmpty")}</p>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">{t("adminStore.orderNumber", { id: order.id })}</p>
                                            <p className="text-sm text-slate-500">{order.guest_name || t("adminStore.walkInCustomer")}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStoreOrderStatusTone(order.status))}>
                                                {t(`adminStore.orderStatuses.${order.status}`)}
                                            </span>
                                            {order.payment_status ? (
                                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", getStorePaymentTone(order.payment_status))}>
                                                    {t(`adminStore.paymentStatuses.${order.payment_status}`)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                                        <span>{order.fulfillment_type ? t(`adminStore.fulfillmentTypes.${order.fulfillment_type}`) : t("adminStore.fulfillmentPending")}</span>
                                        <span>{formatFixedCurrencyFromCents(order.total_cents, currency)}</span>
                                        {order.items?.length ? (
                                            <span>{t("adminStore.itemsCount", { count: order.items.length.toLocaleString() })}</span>
                                        ) : null}
                                        {order.point_of_sale?.name ? <span>{order.point_of_sale.name}</span> : null}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminStore.setupChecklistTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        {checklistItems.map((item) => (
                            <div key={item.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                                <span className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", item.done ? "bg-emerald-500" : "bg-amber-400")} />
                                <p>{item.label}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("adminStore.quickLinks")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        <p>{t("adminStore.manageCopy1")}</p>
                        <p>{t("adminStore.manageCopy2")}</p>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                                <Link href="/admin/dashboard/store">{t("adminStore.openStoreAdmin")}</Link>
                            </Button>
                            {companySlug ? (
                                <Button asChild variant="outline">
                                    <Link href={`/shop/${companySlug}/store`} target="_blank">{t("adminStore.viewPublicStore")}</Link>
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {loadFailed ? (
                <p className="text-sm text-slate-500">{t("adminStore.partialSummaryLoadFailed")}</p>
            ) : null}
        </div>
    );
}

function StoreStatCard({
    label,
    value,
    sub,
    icon,
    color,
}: {
    label: string;
    value: string;
    sub: string;
    icon: ReactNode;
    color: string;
}) {
    return (
        <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
                <div className={cn("rounded-lg p-2", color)}>{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <p className="mt-1 text-xs text-slate-500">{sub}</p>
            </CardContent>
        </Card>
    );
}
