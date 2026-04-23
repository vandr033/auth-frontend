"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Plus, RefreshCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ActionMenu, DataTable, DataToolbar, EmptyState, StatusBadge } from "@/components/admin/shared";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import {
    listGroupEvents,
    type GroupEvent,
    type GroupItemStatus,
} from "@/app/admin/lib/adminApi";
import { GroupStatusBadge } from "../components/GroupBadges";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { formatDateTime, formatMoneyFromCents } from "../lib/format";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";

export default function GroupEventsAdminPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const { canUseEvents } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<GroupItemStatus | "ALL">("ALL");
    const [upcomingOnly, setUpcomingOnly] = useState(false);

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

    if (!canUseEvents) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnBusiness")}
                feature="GROUP_EVENTS"
                requiredPlan="BUSINESS"
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
                summary={`${events.length} ${t("adminGroup.events.listTitle").toLowerCase()}`}
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
                    data={events}
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
                            key: "status",
                            header: t("adminGroup.fields.status"),
                            cell: (event) => <GroupStatusBadge status={event.status} />,
                        },
                        {
                            key: "actions",
                            header: t("adminGroup.fields.actions"),
                            headerClassName: "text-right",
                            className: "text-right",
                            cell: (event) => (
                                <div className="flex justify-end">
                                    <ActionMenu
                                        label={t("adminGroup.fields.actions")}
                                        items={[{
                                            label: t("adminGroup.actions.manage"),
                                            icon: <Settings className="h-4 w-4" />,
                                            href: `/admin/dashboard/group-reservations/events/${event.id}`,
                                        }]}
                                    />
                                </div>
                            ),
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
                                    <ActionMenu
                                        label={t("adminGroup.fields.actions")}
                                        showLabel
                                        items={[{
                                            label: t("adminGroup.actions.manage"),
                                            icon: <Settings className="h-4 w-4" />,
                                            href: `/admin/dashboard/group-reservations/events/${event.id}`,
                                        }]}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <GroupStatusBadge status={event.status} />
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

        </div>
    );
}
