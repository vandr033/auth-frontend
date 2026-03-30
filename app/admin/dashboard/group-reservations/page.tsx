"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Loader2, Users, Wallet, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { listGroupClasses, listGroupEvents, type GroupClass, type GroupEvent } from "@/app/admin/lib/adminApi";
import { useGroupReservationsAccess } from "./lib/useGroupReservationsAccess";
import { clampPercent } from "./lib/format";

export default function GroupReservationsOverviewPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const { canUseClasses } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [classes, setClasses] = useState<GroupClass[]>([]);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            try {
                const [eventsData, classesData] = await Promise.all([
                    listGroupEvents(),
                    canUseClasses ? listGroupClasses() : Promise.resolve([] as GroupClass[]),
                ]);
                setEvents(eventsData);
                setClasses(classesData);
            } catch (error) {
                await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void run();
    }, [canUseClasses, t]);

    const summary = useMemo(() => {
        const now = new Date();
        const upcomingEvents = events.filter((event) => new Date(event.start_at) >= now);
        const totalEventSeats = events.reduce((acc, event) => acc + event.max_capacity, 0);
        const seatsBooked = events.reduce((acc, event) => acc + (event._count?.bookings ?? 0), 0);
        const soldOutEvents = events.filter((event) => (event._count?.bookings ?? 0) >= event.max_capacity).length;
        const occupancy = totalEventSeats > 0 ? clampPercent((seatsBooked / totalEventSeats) * 100) : 0;

        return {
            totalEvents: events.length,
            upcomingEvents: upcomingEvents.length,
            soldOutEvents,
            seatsBooked,
            occupancy,
            totalClasses: classes.length,
            activeClasses: classes.filter((item) => item.status === "PUBLISHED").length,
            classEnrollments: classes.reduce((acc, item) => acc + (item._count?.enrollments ?? 0), 0),
        };
    }, [classes, events]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.totalEvents")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-slate-900">{summary.totalEvents}</div>
                        <p className="mt-1 text-xs text-slate-500">{t("adminGroup.cards.upcomingEvents", { count: summary.upcomingEvents })}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.seatsBooked")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-slate-900">{summary.seatsBooked}</div>
                        <p className="mt-1 text-xs text-slate-500">{t("adminGroup.cards.occupancy", { rate: summary.occupancy.toFixed(1) })}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.soldOutEvents")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-slate-900">{summary.soldOutEvents}</div>
                        <p className="mt-1 text-xs text-slate-500">{t("adminGroup.cards.trackDemand")}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.cards.classEnrollments")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-slate-900">{summary.classEnrollments}</div>
                        <p className="mt-1 text-xs text-slate-500">
                            {canUseClasses
                                ? t("adminGroup.cards.activeClasses", { count: summary.activeClasses })
                                : t("adminGroup.cards.proOnly")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarRange className="h-4 w-4 text-brand" />
                            {t("adminGroup.quick.events")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-slate-600">{t("adminGroup.quick.eventsDesc")}</p>
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/admin/dashboard/group-reservations/events">
                                {t("adminGroup.quick.openEvents")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-brand" />
                            {t("adminGroup.quick.attendance")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-slate-600">{t("adminGroup.quick.attendanceDesc")}</p>
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/admin/dashboard/group-reservations/attendance">
                                {t("adminGroup.quick.openAttendance")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Wallet className="h-4 w-4 text-brand" />
                            {t("adminGroup.quick.metrics")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-slate-600">{t("adminGroup.quick.metricsDesc")}</p>
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/admin/dashboard/group-reservations/metrics">
                                {t("adminGroup.quick.openMetrics")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.planSummary.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                    <p>{t("adminGroup.planSummary.currentPlan", { plan: companyUser?.company?.plan || "BUSINESS" })}</p>
                    <p>{t("adminGroup.planSummary.business")}</p>
                    <p>{t("adminGroup.planSummary.pro")}</p>
                </CardContent>
            </Card>
        </div>
    );
}
