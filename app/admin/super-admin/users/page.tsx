"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataToolbar, EmptyState } from "@/components/admin/shared";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

type SignupSource = "FREE_EVENTS" | "BOOKING_FLOW" | "PRICONPRI_SITE";

interface UserShop {
    id: number;
    name: string;
}

interface UserRecord {
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    phone_prefix: string | null;
    is_active: boolean;
    email_verified: boolean;
    phone_verified: boolean;
    created_at: string;
    primary_signup_source: SignupSource;
    signup_sources: SignupSource[];
    free_events_count: number;
    booking_flow_count: number;
    direct_booking_count: number;
    group_event_booking_count: number;
    group_class_enrollment_count: number;
    company_membership_count: number;
    roles: string[];
    shops: UserShop[];
}

const PAGE_SIZE = 20;

const SOURCE_BADGE_STYLES: Record<SignupSource, string> = {
    FREE_EVENTS: "bg-blue-100 text-blue-800 border-0",
    BOOKING_FLOW: "bg-emerald-100 text-emerald-800 border-0",
    PRICONPRI_SITE: "bg-violet-100 text-violet-800 border-0",
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatPhone(phonePrefix?: string | null, phone?: string | null): string {
    if (!phone) return "—";
    const prefix = (phonePrefix || "").trim();
    return prefix ? `+${prefix} ${phone}` : phone;
}

export default function SuperAdminUsersPage() {
    const t = useT();

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<string>("all");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const getSourceLabel = (source: SignupSource): string => {
        if (source === "FREE_EVENTS") return t("superAdminUsers.sourceFreeEvents");
        if (source === "BOOKING_FLOW") return t("superAdminUsers.sourceBookingFlow");
        return t("superAdminUsers.sourcePriconpriSite");
    };

    const fetchData = useCallback(
        async (currentPage: number, search: string) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: PAGE_SIZE.toString(),
                });

                const normalizedSearch = search.trim();
                if (normalizedSearch) params.set("search", normalizedSearch);
                if (sourceFilter !== "all") params.set("source", sourceFilter);

                const response = await fetch(getApiUrl(`/api/super-admin/users?${params}`), {
                    credentials: "include",
                });

                if (!response.ok) throw new Error(t("superAdminUsers.fetchError"));

                const payload = await response.json();
                setUsers((payload.data?.users || []) as UserRecord[]);

                const pagination = payload.data?.pagination;
                if (pagination) {
                    setTotalPages(pagination.totalPages || 1);
                    setTotal(pagination.total || 0);
                }
            } catch (error) {
                void notify.error(error instanceof Error ? error.message : t("superAdminUsers.loadError"));
            } finally {
                setLoading(false);
            }
        },
        [sourceFilter, t],
    );

    useEffect(() => {
        void fetchData(page, searchQuery);
    }, [fetchData, page]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            void fetchData(1, value);
        }, 300);
    };

    useEffect(() => {
        setPage(1);
        void fetchData(1, searchQuery);
    }, [sourceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminUsers.title")}</h1>
                <p className="text-slate-500">{t("superAdminUsers.subtitle")}</p>
            </div>

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("superAdminUsers.searchPlaceholder")}
                onSearchChange={handleSearchChange}
                summary={t("superAdminShops.showing", {
                    from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
                    to: Math.min(page * PAGE_SIZE, total),
                    total,
                })}
                filters={
                    <div className="w-full sm:w-56">
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("superAdminUsers.allSources")}</SelectItem>
                            <SelectItem value="FREE_EVENTS">{t("superAdminUsers.sourceFreeEvents")}</SelectItem>
                            <SelectItem value="BOOKING_FLOW">{t("superAdminUsers.sourceBookingFlow")}</SelectItem>
                            <SelectItem value="PRICONPRI_SITE">{t("superAdminUsers.sourcePriconpriSite")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                }
            />

            <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60">
                            <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
                        </div>
                    )}

                    <DataTable
                        data={users}
                        getRowKey={(user) => user.id}
                        empty={
                            <EmptyState
                                icon={Users}
                                title={searchQuery ? t("superAdminUsers.noSearchResults") : t("superAdminUsers.noUsers")}
                            />
                        }
                        columns={[
                            {
                                key: "user",
                                header: t("superAdminUsers.user"),
                                cell: (user) => (
                                    <div>
                                        <p className="font-medium text-slate-900">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                ),
                            },
                            {
                                key: "phone",
                                header: t("superAdminUsers.phone"),
                                className: "text-slate-600",
                                cell: (user) => formatPhone(user.phone_prefix, user.phone),
                            },
                            {
                                key: "sources",
                                header: t("superAdminUsers.sources"),
                                cell: (user) => (
                                    <div className="flex flex-wrap gap-1">
                                        {user.signup_sources.map((source) => (
                                            <Badge
                                                key={`${user.id}-${source}`}
                                                variant="outline"
                                                className={`text-xs ${SOURCE_BADGE_STYLES[source]}`}
                                            >
                                                {getSourceLabel(source)}
                                            </Badge>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                key: "metrics",
                                header: t("superAdminUsers.sourceMetrics"),
                                className: "text-xs text-slate-600",
                                cell: (user) => (
                                    <>
                                        <p>{t("superAdminUsers.freeEventsCount", { count: user.free_events_count })}</p>
                                        <p>{t("superAdminUsers.bookingFlowCount", { count: user.booking_flow_count })}</p>
                                    </>
                                ),
                            },
                            {
                                key: "shops",
                                header: t("superAdminUsers.shops"),
                                cell: (user) => (
                                    <div className="flex flex-wrap gap-1">
                                        {user.shops.slice(0, 3).map((shop) => (
                                            <Badge key={`${user.id}-shop-${shop.id}`} variant="secondary" className="text-xs">
                                                {shop.name}
                                            </Badge>
                                        ))}
                                        {user.shops.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{user.shops.length - 3}
                                            </Badge>
                                        )}
                                        {user.shops.length === 0 && (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: "joined",
                                header: t("superAdminUsers.joinedAt"),
                                className: "text-sm text-slate-500",
                                cell: (user) => formatDate(user.created_at),
                            },
                        ]}
                        renderMobileItem={(user) => (
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-slate-950">{user.name}</h3>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {user.signup_sources.map((source) => (
                                        <Badge
                                            key={`${user.id}-mobile-${source}`}
                                            variant="outline"
                                            className={`text-xs ${SOURCE_BADGE_STYLES[source]}`}
                                        >
                                            {getSourceLabel(source)}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("superAdminUsers.phone")}</p>
                                        <p className="text-slate-700">{formatPhone(user.phone_prefix, user.phone)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("superAdminUsers.joinedAt")}</p>
                                        <p className="text-slate-700">{formatDate(user.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("superAdminUsers.sourceMetrics")}</p>
                                        <p className="text-slate-700">{t("superAdminUsers.freeEventsCount", { count: user.free_events_count })}</p>
                                        <p className="text-slate-700">{t("superAdminUsers.bookingFlowCount", { count: user.booking_flow_count })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("superAdminUsers.shops")}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {user.shops.slice(0, 3).map((shop) => (
                                                <Badge key={`${user.id}-mobile-shop-${shop.id}`} variant="secondary" className="text-xs">
                                                    {shop.name}
                                                </Badge>
                                            ))}
                                            {user.shops.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{user.shops.length - 3}
                                                </Badge>
                                            )}
                                            {user.shops.length === 0 && (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    />

                {totalPages > 1 && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            {t("superAdminShops.showing", {
                                from: (page - 1) * PAGE_SIZE + 1,
                                to: Math.min(page * PAGE_SIZE, total),
                                total,
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page <= 1 || loading}
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                {t("superAdminShops.previous")}
                            </Button>
                            <span className="px-2 text-sm text-slate-600">
                                {t("superAdminShops.pageOf", { page, totalPages })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages || loading}
                            >
                                {t("superAdminShops.next")}
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
