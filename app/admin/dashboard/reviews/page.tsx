"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import {
    getAdminReviews,
    getReviewExtendedMetrics,
    getStaff,
    getServices,
    type AdminReview,
    type AdminReviewsResponse,
    type AdminReviewFilters,
    type ReviewExtendedMetrics,
    type StaffMember,
    type ServiceItem,
} from "../../lib/adminApi";
import {
    Loader2,
    Search,
    Star,
    MessageSquare,
    TrendingUp,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    X,
    Trophy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReviewerName(user: AdminReview["user"]): string {
    const first = user.first_name ?? "";
    const lastInitial = user.last_name ? `${user.last_name.charAt(0)}.` : "";
    const name = [first, lastInitial].filter(Boolean).join(" ");
    return name || "Customer";
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

const ReadOnlyStars = ({ value, size = 14 }: { value: number; size?: number }) => (
    <Rating value={value} readOnly>
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
    </Rating>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminReviewsPage() {
    const { role, companyUser, user } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const canManageReviews = isSuperAdmin || canUsePlanFeature(plan, "REVIEW_MANAGEMENT");
    const canViewAnalytics = isSuperAdmin || canUsePlanFeature(plan, "REVIEW_ANALYTICS");

    // Data
    const [reviewsData, setReviewsData] = useState<AdminReviewsResponse | null>(null);
    const [metrics, setMetrics] = useState<ReviewExtendedMetrics | null>(null);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [rating, setRating] = useState<string>("all");
    const [staffId, setStaffId] = useState<string>("all");
    const [serviceId, setServiceId] = useState<string>("all");
    const [hasComment, setHasComment] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);

    // UI
    const [showMetrics, setShowMetrics] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isStaffRole = role === "STAFF";

    // Build filters object
    const buildFilters = useCallback(
        (p: number): AdminReviewFilters => ({
            page: p,
            limit: 20,
            search: search.trim() || undefined,
            rating: rating !== "all" ? Number(rating) : undefined,
            staffId: staffId !== "all" ? Number(staffId) : undefined,
            serviceId: serviceId !== "all" ? Number(serviceId) : undefined,
            hasComment: hasComment === "true" ? true : hasComment === "false" ? false : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }),
        [search, rating, staffId, serviceId, hasComment, dateFrom, dateTo],
    );

    const fetchReviews = useCallback(
        async (p: number) => {
            setLoading(true);
            try {
                const data = await getAdminReviews(buildFilters(p));
                setReviewsData(data);
                setPage(p);
            } catch {
                void notify.error(t("adminReviews.loadError"));
            } finally {
                setLoading(false);
            }
        },
        [buildFilters, t],
    );

    // Initial load: metrics + dropdown data
    useEffect(() => {
        const loadInit = async () => {
            setMetricsLoading(true);
            try {
                const [m, staff, services] = await Promise.all([
                    getReviewExtendedMetrics(),
                    isStaffRole ? Promise.resolve([]) : getStaff(),
                    isStaffRole ? Promise.resolve([]) : getServices(),
                ]);
                setMetrics(m);
                setStaffList(staff);
                setServiceList(services);
            } catch {
                // metrics are optional
            } finally {
                setMetricsLoading(false);
            }
        };
        void loadInit();
    }, [isStaffRole]);

    // Fetch reviews on filter change (debounced for search)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void fetchReviews(1);
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchReviews]);

    const hasActiveFilters =
        search || rating !== "all" || staffId !== "all" || serviceId !== "all" || hasComment !== "all" || dateFrom || dateTo;

    const clearFilters = () => {
        setSearch("");
        setRating("all");
        setStaffId("all");
        setServiceId("all");
        setHasComment("all");
        setDateFrom("");
        setDateTo("");
    };

    const reviews = reviewsData?.reviews ?? [];
    const pagination = reviewsData?.pagination;
    const thisMonthCount = useMemo(() => {
        if (!metrics?.volume?.length) return 0;
        const now = new Date();
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return metrics.volume.find((v) => v.month === key)?.count ?? 0;
    }, [metrics]);
    const lowCount = useMemo(() => {
        if (!metrics?.distribution) return 0;
        return (metrics.distribution[1] ?? 0) + (metrics.distribution[2] ?? 0);
    }, [metrics]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    if (!canManageReviews) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t("adminReviews.title")}</h2>
                    <p className="text-sm text-slate-500">{t("adminReviews.subtitle")}</p>
                </div>
                <PlanUpgradeNotice
                    feature="REVIEW_MANAGEMENT"
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.upgradePrompt")}
                    fullPage
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("adminReviews.title")}</h2>
                <p className="text-sm text-slate-500">{t("adminReviews.subtitle")}</p>
            </div>

            {/* Summary Cards */}
            {!metricsLoading && metrics && canViewAnalytics && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-yellow-50 p-2">
                                    <Star className="h-5 w-5 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{metrics.average.toFixed(1)}</p>
                                    <p className="text-xs text-slate-500">{t("adminReviews.avgRating")}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-2">
                                    <MessageSquare className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{metrics.count}</p>
                                    <p className="text-xs text-slate-500">{t("adminReviews.totalReviews")}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-50 p-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{thisMonthCount}</p>
                                    <p className="text-xs text-slate-500">{t("adminReviews.thisMonth")}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={cn("rounded-lg p-2", lowCount > 0 ? "bg-rose-50" : "bg-slate-50")}>
                                    <AlertTriangle className={cn("h-5 w-5", lowCount > 0 ? "text-rose-500" : "text-slate-400")} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{lowCount}</p>
                                    <p className="text-xs text-slate-500">{t("adminReviews.lowRatings")}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Metrics toggle */}
            {metrics && canViewAnalytics && (
                <button
                    type="button"
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    {showMetrics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showMetrics ? t("adminReviews.hideMetrics") : t("adminReviews.showMetrics")}
                </button>
            )}

            {/* Extended Metrics */}
            {showMetrics && metrics && <MetricsPanel metrics={metrics} t={t} />}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("adminReviews.search")}
                                className="pl-9"
                            />
                        </div>

                        {/* Rating filter */}
                        <Select value={rating} onValueChange={setRating}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder={t("adminReviews.allRatings")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminReviews.allRatings")}</SelectItem>
                                {[5, 4, 3, 2, 1].map((r) => (
                                    <SelectItem key={r} value={String(r)}>
                                        {t("adminReviews.stars", { count: r })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Staff filter (hidden for STAFF role) */}
                        {!isStaffRole && staffList.length > 0 && (
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t("adminReviews.allStaff")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("adminReviews.allStaff")}</SelectItem>
                                    {staffList.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Service filter */}
                        {serviceList.length > 0 && (
                            <Select value={serviceId} onValueChange={setServiceId}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t("adminReviews.allServices")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("adminReviews.allServices")}</SelectItem>
                                    {serviceList.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Has comment */}
                        <Select value={hasComment} onValueChange={setHasComment}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t("adminReviews.withComments")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminReviews.comment")}</SelectItem>
                                <SelectItem value="true">{t("adminReviews.withComments")}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-36"
                                placeholder={t("adminReviews.dateFrom")}
                            />
                            <span className="text-xs text-slate-400">–</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-36"
                                placeholder={t("adminReviews.dateTo")}
                            />
                        </div>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                                <X className="mr-1 h-3 w-3" />
                                {t("adminReviews.clearFilters")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Review List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="py-16 text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <h3 className="mb-1 text-lg font-medium text-slate-700">{t("adminReviews.noReviews")}</h3>
                    <p className="text-sm text-slate-500">{t("adminReviews.noReviewsDescription")}</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Card>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
                                            <th className="px-4 py-3">{t("adminReviews.customer")}</th>
                                            <th className="px-4 py-3">{t("adminReviews.rating")}</th>
                                            <th className="px-4 py-3">{t("adminReviews.comment")}</th>
                                            <th className="px-4 py-3">{t("adminReviews.service")}</th>
                                            <th className="px-4 py-3">{t("adminReviews.staff")}</th>
                                            <th className="px-4 py-3">{t("adminReviews.date")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviews.map((r) => (
                                            <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {formatReviewerName(r.user)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ReadOnlyStars value={r.rating} />
                                                </td>
                                                <td className="max-w-xs px-4 py-3 text-slate-600">
                                                    {r.comment ? (
                                                        <span className="line-clamp-2">{r.comment}</span>
                                                    ) : (
                                                        <span className="italic text-slate-400">{t("adminReviews.noComment")}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{r.service?.name ?? "–"}</td>
                                                <td className="px-4 py-3 text-slate-600">{r.staff?.display_name ?? "–"}</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                    {formatDate(r.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {reviews.map((r) => (
                            <Card key={r.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-slate-900">{formatReviewerName(r.user)}</p>
                                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                                                {r.service && <span>{r.service.name}</span>}
                                                {r.staff && (
                                                    <>
                                                        {r.service && <span>·</span>}
                                                        <span>{r.staff.display_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <ReadOnlyStars value={r.rating} size={12} />
                                            <p className="mt-0.5 text-xs text-slate-400">{formatDate(r.created_at)}</p>
                                        </div>
                                    </div>
                                    {r.comment && (
                                        <p className="mt-2 text-sm text-slate-600 line-clamp-3">{r.comment}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                {pagination.total} {t("adminReviews.reviews")}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => void fetchReviews(page - 1)}
                                >
                                    ←
                                </Button>
                                <span className="flex items-center text-sm text-slate-600">
                                    {page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pagination.hasNextPage}
                                    onClick={() => void fetchReviews(page + 1)}
                                >
                                    →
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Metrics Panel
// ---------------------------------------------------------------------------

function MetricsPanel({
    metrics,
    t,
}: {
    metrics: ReviewExtendedMetrics;
    t: (key: string, vars?: Record<string, string | number>) => string;
}) {
    const maxDist = Math.max(...Object.values(metrics.distribution), 1);
    const maxVol = Math.max(...metrics.volume.map((v) => v.count), 1);

    const subRatings = [
        { label: t("adminReviews.serviceQuality"), value: metrics.subRatings.serviceQuality },
        { label: t("adminReviews.staffAttention"), value: metrics.subRatings.staffAttention },
        { label: t("adminReviews.punctuality"), value: metrics.subRatings.punctuality },
        { label: t("adminReviews.cleanliness"), value: metrics.subRatings.cleanliness },
    ].filter((s) => s.value != null);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Rating Distribution */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700">{t("adminReviews.distribution")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = metrics.distribution[star] ?? 0;
                        const pct = maxDist > 0 ? (count / maxDist) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="w-4 text-right text-slate-600">{star}</span>
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full",
                                            star >= 4 ? "bg-green-400" : star === 3 ? "bg-yellow-400" : "bg-rose-400",
                                        )}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-6 text-right text-slate-500">{count}</span>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Sub-rating Averages */}
            {subRatings.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">{t("adminReviews.subRatingAvgs")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {subRatings.map((s) => (
                            <div key={s.label} className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">{s.label}</span>
                                <div className="flex items-center gap-1.5">
                                    <ReadOnlyStars value={Math.round(s.value!)} size={12} />
                                    <span className="text-xs font-medium text-slate-700">{s.value!.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Volume Trend */}
            {metrics.volume.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">{t("adminReviews.volumeTrend")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-1 h-24">
                            {metrics.volume.map((v) => {
                                const pct = maxVol > 0 ? (v.count / maxVol) * 100 : 0;
                                const [, m] = v.month.split("-");
                                const label = new Date(2024, Number(m) - 1).toLocaleDateString(undefined, { month: "short" });
                                return (
                                    <div key={v.month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-slate-500">{v.count}</span>
                                        <div
                                            className="w-full rounded-t bg-blue-400"
                                            style={{ height: `${Math.max(pct, 4)}%` }}
                                        />
                                        <span className="text-[10px] text-slate-400">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Rated Staff */}
            {metrics.topStaff.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">{t("adminReviews.topStaff")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {metrics.topStaff.slice(0, 5).map((s, i) => (
                            <div key={s.staffId} className="flex items-center gap-2 text-xs">
                                <span className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                    i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500",
                                )}>
                                    {i + 1}
                                </span>
                                <span className="flex-1 truncate text-slate-700">{s.name}</span>
                                <span className="flex items-center gap-0.5 font-medium text-slate-600">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {s.avgRating}
                                </span>
                                <span className="text-slate-400">({s.reviewCount})</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Top Rated Services */}
            {metrics.topServices.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">{t("adminReviews.topServices")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {metrics.topServices.slice(0, 5).map((s, i) => (
                            <div key={s.serviceId} className="flex items-center gap-2 text-xs">
                                <span className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                    i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500",
                                )}>
                                    {i + 1}
                                </span>
                                <span className="flex-1 truncate text-slate-700">{s.name}</span>
                                <span className="flex items-center gap-0.5 font-medium text-slate-600">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {s.avgRating}
                                </span>
                                <span className="text-slate-400">({s.reviewCount})</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Recent Low Ratings */}
            {metrics.recentLowRatings.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-rose-600">{t("adminReviews.recentLow")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {metrics.recentLowRatings.map((r) => (
                            <div key={r.id} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">{formatReviewerName(r.user)}</span>
                                    <ReadOnlyStars value={r.rating} size={12} />
                                </div>
                                {r.comment && (
                                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{r.comment}</p>
                                )}
                                <p className="mt-1 text-[10px] text-slate-400">{formatDate(r.created_at)}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
