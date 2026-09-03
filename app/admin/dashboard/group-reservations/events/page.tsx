"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, ExternalLink, Loader2, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, DataPagination, DataTable, DataToolbar, EmptyState, InlineActions, StatusBadge } from "@/components/admin/shared";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import {
    listGroupEvents,
    deleteGroupEvent,
    setGroupEventStatus,
    type GroupEvent,
    type GroupItemStatus,
} from "@/app/admin/lib/adminApi";
import { GroupStatusBadge } from "../components/GroupBadges";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { formatDateTime, formatMoneyFromCents } from "../lib/format";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { buildPublicEventPath, copyPublicUrl } from "@/lib/admin/public-links";

const PAGE_SIZE = 10;

export default function GroupEventsAdminPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const { canUseEvents, getRequiredPlan } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<GroupItemStatus | "ALL">("ALL");
    const [upcomingOnly, setUpcomingOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "FREE" | "PAID">("ALL");
    const [locationFilter, setLocationFilter] = useState("ALL");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [actingEventId, setActingEventId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<GroupEvent | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const eventsData = await listGroupEvents({
                status: statusFilter === "ALL" ? undefined : statusFilter,
                upcoming: upcomingOnly || undefined,
            });
            setEvents(eventsData);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, t, upcomingOnly]);

    useEffect(() => {
        if (!canUseEvents) return;
        void loadData();
    }, [canUseEvents, loadData]);

    const capacitySummary = useMemo(() => {
        const totalCapacity = events.reduce((sum, event) => sum + event.max_capacity, 0);
        const booked = events.reduce((sum, event) => sum + (event._count?.bookings ?? 0), 0);
        return { totalCapacity, booked };
    }, [events]);

    const locations = useMemo(
        () => Array.from(new Set(events.map((event) => event.location_text?.trim()).filter((value): value is string => Boolean(value)))).sort(),
        [events],
    );

    const filteredEvents = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

        return [...events]
            .filter((event) => {
                const matchesSearch = !query || [event.title, event.slug, event.description ?? "", event.location_text ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);
                const matchesVisibility = visibilityFilter === "ALL"
                    || (visibilityFilter === "PRIVATE" ? event.is_private : !event.is_private);
                const matchesType = typeFilter === "ALL" || (typeFilter === "FREE" ? event.is_free : !event.is_free);
                const matchesLocation = locationFilter === "ALL" || event.location_text?.trim() === locationFilter;
                const startAt = new Date(event.start_at);
                const matchesFrom = !from || startAt >= from;
                const matchesTo = !to || startAt <= to;
                return matchesSearch && matchesVisibility && matchesType && matchesLocation && matchesFrom && matchesTo;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [dateFrom, dateTo, events, locationFilter, searchQuery, typeFilter, visibilityFilter]);

    const pagedEvents = useMemo(
        () => filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filteredEvents, page],
    );

    useEffect(() => {
        setPage(1);
    }, [dateFrom, dateTo, locationFilter, searchQuery, statusFilter, typeFilter, upcomingOnly, visibilityFilter]);

    const changeStatus = async (event: GroupEvent, status: GroupItemStatus) => {
        if (event.status === status) return;
        setActingEventId(event.id);
        try {
            await setGroupEventStatus(event.id, status);
            setEvents((current) => current.map((item) => item.id === event.id ? { ...item, status } : item));
            await notify.success(t("adminGroup.actions.statusUpdated"));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("common.error"));
        } finally {
            setActingEventId(null);
        }
    };

    const eventActions = (event: GroupEvent, showLabels = false) => {
        const companySlug = companyUser?.company?.slug;
        const publicPath = companySlug ? buildPublicEventPath(companySlug, event.id) : null;
        return (
            <div className="flex flex-wrap items-center justify-end gap-1">
                <InlineActions
                    showLabels={showLabels}
                    items={[
                        {
                            label: t("adminGroup.actions.copyLink"),
                            icon: <Copy className="h-4 w-4" />,
                            disabled: !publicPath,
                            onSelect: () => publicPath && void copyPublicUrl(publicPath).then(
                                () => notify.success(t("adminGroup.actions.linkCopied")),
                                () => notify.error(t("common.error")),
                            ),
                        },
                        {
                            label: t("adminGroup.actions.viewPublic"),
                            icon: <ExternalLink className="h-4 w-4" />,
                            href: publicPath ?? undefined,
                            disabled: !publicPath,
                            target: "_blank",
                        },
                        {
                            label: t("adminGroup.actions.manage"),
                            icon: <Pencil className="h-4 w-4" />,
                            href: `/admin/dashboard/group-reservations/events/${event.id}`,
                        },
                        {
                            label: t("common.delete"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            onSelect: () => setDeleteTarget(event),
                        },
                    ]}
                />
                <Select
                    value={event.status}
                    disabled={actingEventId === event.id}
                    onValueChange={(value) => void changeStatus(event, value as GroupItemStatus)}
                >
                    <SelectTrigger className="h-8 w-[118px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                        <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                        <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        );
    };

    if (!canUseEvents) {
        const requiredPlan = getRequiredPlan("GROUP_EVENTS");
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                feature="GROUP_EVENTS"
                requiredPlan={requiredPlan}
                fullPage
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t("adminGroup.events.title")}</h2>
                    <p className="text-sm text-slate-600">{t("adminGroup.events.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadData()}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.refresh")}
                    </Button>
                    <Button asChild>
                        <Link href="/admin/dashboard/group-reservations/events/new">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("adminGroup.events.newEvent")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.totalEvents")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{events.length}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.seatsBooked")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{capacitySummary.booked}</CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.totalCapacity")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">{capacitySummary.totalCapacity}</CardContent>
                </Card>
            </div>

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("adminGroup.filters.searchEvents")}
                onSearchChange={setSearchQuery}
                summary={`${filteredEvents.length} / ${events.length}`}
                filters={
                    <>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value as GroupItemStatus | "ALL")}
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("adminGroup.filters.allStatuses")}</SelectItem>
                                <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                                <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                                <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}>
                            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("adminGroup.filters.allVisibility")}</SelectItem>
                                <SelectItem value="PUBLIC">{t("adminGroup.filters.public")}</SelectItem>
                                <SelectItem value="PRIVATE">{t("adminGroup.filters.private")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                            <SelectTrigger className="w-full sm:w-[135px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("adminGroup.filters.allTypes")}</SelectItem>
                                <SelectItem value="FREE">{t("adminGroup.events.free")}</SelectItem>
                                <SelectItem value="PAID">{t("adminGroup.events.paid")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("adminGroup.filters.allLocations")}</SelectItem>
                                {locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 w-full sm:w-[150px]" aria-label={t("adminGroup.filters.dateFrom")} />
                        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 w-full sm:w-[150px]" aria-label={t("adminGroup.filters.dateTo")} />
                        <label className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                            <Switch checked={upcomingOnly} onCheckedChange={setUpcomingOnly} />
                            {t("adminGroup.events.upcomingOnly")}
                        </label>
                    </>
                }
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/dashboard/group-reservations/events/upcoming">
                            <CalendarClock className="mr-2 h-4 w-4" />
                            {t("adminGroup.events.upcomingView")}
                        </Link>
                    </Button>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-16 shadow-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
                </div>
            ) : (
                <DataTable
                    data={pagedEvents}
                    getRowKey={(event) => event.id}
                    empty={<EmptyState title={t("adminGroup.events.empty")} />}
                    columns={[
                        {
                            key: "title",
                            header: t("adminGroup.fields.title"),
                            cell: (event) => (
                                <div>
                                    <p className="font-medium text-slate-900">{event.title}</p>
                                    <p className="text-xs text-slate-500">{event.slug}</p>
                                </div>
                            ),
                        },
                        {
                            key: "start",
                            header: t("adminGroup.fields.startAt"),
                            cell: (event) => formatDateTime(event.start_at),
                        },
                        {
                            key: "end",
                            header: t("adminGroup.fields.endAt"),
                            cell: (event) => formatDateTime(event.end_at),
                        },
                        {
                            key: "price",
                            header: t("adminGroup.fields.price"),
                            cell: (event) => event.is_free
                                ? t("adminGroup.events.free")
                                : formatMoneyFromCents(event.price_cents, currency),
                        },
                        {
                            key: "capacity",
                            header: t("adminGroup.fields.capacity"),
                            cell: (event) => {
                                const booked = event._count?.bookings ?? 0;
                                const soldOut = booked >= event.max_capacity;
                                return (
                                    <div>
                                        <div className="text-sm text-slate-900">{booked}/{event.max_capacity}</div>
                                        {soldOut ? <div className="text-xs font-medium text-rose-600">{t("adminGroup.states.soldOut")}</div> : null}
                                    </div>
                                );
                            },
                        },
                        {
                            key: "visibility",
                            header: t("adminGroup.fields.visibility"),
                            cell: (event) => <StatusBadge tone={event.is_private ? "warning" : "neutral"}>{event.is_private ? t("adminGroup.filters.private") : t("adminGroup.filters.public")}</StatusBadge>,
                        },
                        {
                            key: "status",
                            header: t("adminGroup.fields.status"),
                            cell: (event) => <GroupStatusBadge status={event.status} />,
                        },
                        {
                            key: "actions",
                            header: t("adminGroup.fields.actions"),
                            headerClassName: "text-right",
                            className: "text-right",
                            cell: (event) => eventActions(event),
                        },
                    ]}
                    renderMobileItem={(event) => {
                        const booked = event._count?.bookings ?? 0;
                        const soldOut = booked >= event.max_capacity;
                        return (
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-950">{event.title}</h3>
                                        <p className="text-xs text-slate-500">{event.slug}</p>
                                    </div>
                                    {eventActions(event)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <GroupStatusBadge status={event.status} />
                                    <StatusBadge tone={event.is_private ? "warning" : "neutral"}>{event.is_private ? t("adminGroup.filters.private") : t("adminGroup.filters.public")}</StatusBadge>
                                    <StatusBadge tone={soldOut ? "danger" : "neutral"}>
                                        {booked}/{event.max_capacity}
                                    </StatusBadge>
                                    <StatusBadge tone="neutral">
                                        {event.is_free ? t("adminGroup.events.free") : formatMoneyFromCents(event.price_cents, currency)}
                                    </StatusBadge>
                                </div>
                                <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.startAt")}</p>
                                        <p className="text-slate-900">{formatDateTime(event.start_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.endAt")}</p>
                                        <p className="text-slate-700">{formatDateTime(event.end_at)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                />
            )}

            {!loading ? (
                <DataPagination page={page} totalItems={filteredEvents.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel={t("adminGroup.events.title").toLowerCase()} />
            ) : null}

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title={t("common.delete")}
                description={deleteTarget ? t("adminGroup.events.deleteConfirm", { name: deleteTarget.title }) : ""}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                variant="destructive"
                loading={actingEventId === deleteTarget?.id}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    setActingEventId(deleteTarget.id);
                    try {
                        await deleteGroupEvent(deleteTarget.id);
                        setEvents((current) => current.filter((item) => item.id !== deleteTarget.id));
                        setDeleteTarget(null);
                    } catch (error) {
                        await notify.error(error instanceof Error ? error.message : t("common.error"));
                    } finally {
                        setActingEventId(null);
                    }
                }}
            />

        </div>
    );
}
