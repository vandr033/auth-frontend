"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import {
    listGroupEventBookings,
    listGroupEvents,
    setGroupEventStatus,
    type GroupEvent,
    type GroupEventBooking,
} from "@/app/admin/lib/adminApi";
import { GroupStatusBadge } from "../../components/GroupBadges";
import { formatDateTime } from "../../lib/format";

type EventWithComputed = {
    event: GroupEvent;
    bookings: GroupEventBooking[];
    confirmedSpots: number;
    pendingSpots: number;
    waitlistCount: number;
    soldOut: boolean;
};

export default function GroupEventsUpcomingPage() {
    const t = useT();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<EventWithComputed[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const events = await listGroupEvents({ upcoming: true });
            const bookingLists = await Promise.all(events.map((event) => listGroupEventBookings(event.id)));

            const nextRows = events.map((event, index) => {
                const bookings = bookingLists[index];
                const confirmedSpots = bookings
                    .filter((booking) => booking.status === "CONFIRMED")
                    .reduce((sum, booking) => sum + booking.booked_spots, 0);
                const pendingSpots = bookings
                    .filter((booking) => booking.status === "PENDING")
                    .reduce((sum, booking) => sum + booking.booked_spots, 0);
                const waitlistCount = bookings.filter((booking) => booking.status === "WAITLISTED").length;

                return {
                    event,
                    bookings,
                    confirmedSpots,
                    pendingSpots,
                    waitlistCount,
                    soldOut: confirmedSpots >= event.max_capacity,
                };
            });

            setRows(nextRows);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totalPending = useMemo(
        () => rows.reduce((sum, row) => sum + row.pendingSpots, 0),
        [rows],
    );

    const handleStatus = async (eventId: number, status: "PUBLISHED" | "ARCHIVED") => {
        try {
            await setGroupEventStatus(eventId, status);
            await notify.success(t("adminGroup.events.statusUpdated"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.events.statusUpdateError"));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button asChild variant="outline">
                    <Link href="/admin/dashboard/group-reservations/events">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.backToEvents")}
                    </Link>
                </Button>
                <Button variant="outline" onClick={() => void loadData()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("adminGroup.actions.refresh")}
                </Button>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.events.upcomingTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                    {t("adminGroup.events.pendingSummary", { count: totalPending })}
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.events.noUpcoming")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.title")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.startAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.capacity")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.seatsBooked")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.pending")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.waitlist")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.event.id}>
                                        <TableCell className="font-medium text-slate-900">{row.event.title}</TableCell>
                                        <TableCell>{formatDateTime(row.event.start_at)}</TableCell>
                                        <TableCell>
                                            {row.confirmedSpots}/{row.event.max_capacity}
                                        </TableCell>
                                        <TableCell>
                                            <div>{row.confirmedSpots}</div>
                                            {row.soldOut ? (
                                                <div className="text-xs font-medium text-rose-600">{t("adminGroup.states.soldOut")}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>{row.pendingSpots}</TableCell>
                                        <TableCell>{row.waitlistCount}</TableCell>
                                        <TableCell>
                                            <GroupStatusBadge status={row.event.status} />
                                        </TableCell>
                                        <TableCell className="flex flex-wrap gap-2">
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/dashboard/group-reservations/events/${row.event.id}`}>
                                                    {t("adminGroup.actions.manage")}
                                                </Link>
                                            </Button>
                                            {row.event.status !== "PUBLISHED" ? (
                                                <Button size="sm" onClick={() => void handleStatus(row.event.id, "PUBLISHED")}>
                                                    {t("adminGroup.actions.publish")}
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => void handleStatus(row.event.id, "ARCHIVED")}>
                                                    {t("adminGroup.actions.archive")}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
