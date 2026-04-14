"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Users, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminSectionCard } from "@/app/admin/dashboard/components/AdminSectionCard";
import { AdminStatCard } from "@/app/admin/dashboard/components/AdminStatCard";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { listGroupClasses, listGroupEvents, type GroupClass, type GroupEvent } from "@/app/admin/lib/adminApi";
import { useGroupReservationsAccess } from "./lib/useGroupReservationsAccess";
import { clampPercent } from "./lib/format";

export default function GroupReservationsOverviewPage() {
    const t = useT();
    const router = useRouter();
    const { companyUser, role } = useAdminAuth();
    const { canUseClasses } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [classes, setClasses] = useState<GroupClass[]>([]);

    useEffect(() => {
        if (role === "STAFF") {
            router.replace("/admin/dashboard/group-reservations/attendance");
        }
    }, [role, router]);

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
                <AdminStatCard
                    label={t("adminGroup.cards.totalEvents")}
                    value={summary.totalEvents}
                    hint={t("adminGroup.cards.upcomingEvents", { count: summary.upcomingEvents })}
                    icon={<CalendarRange className="h-5 w-5" />}
                    iconClassName="bg-blue-50 text-blue-700"
                />
                <AdminStatCard
                    label={t("adminGroup.cards.seatsBooked")}
                    value={summary.seatsBooked}
                    hint={t("adminGroup.cards.occupancy", { rate: summary.occupancy.toFixed(1) })}
                    icon={<Users className="h-5 w-5" />}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
                <AdminStatCard
                    label={t("adminGroup.cards.soldOutEvents")}
                    value={summary.soldOutEvents}
                    hint={t("adminGroup.cards.trackDemand")}
                    icon={<ArrowRight className="h-5 w-5" />}
                    iconClassName="bg-amber-50 text-amber-700"
                />
                <AdminStatCard
                    label={t("adminGroup.cards.classEnrollments")}
                    value={summary.classEnrollments}
                    hint={
                        canUseClasses
                            ? t("adminGroup.cards.activeClasses", { count: summary.activeClasses })
                            : t("adminGroup.cards.proOnly")
                    }
                    icon={<Wallet className="h-5 w-5" />}
                    iconClassName="bg-violet-50 text-violet-700"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <AdminSectionCard title={t("adminGroup.quick.events")} description={t("adminGroup.quick.eventsDesc")}>
                    <Button asChild variant="outline" className="w-full justify-between">
                        <Link href="/admin/dashboard/group-reservations/events">
                            {t("adminGroup.quick.openEvents")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </AdminSectionCard>
                <AdminSectionCard title={t("adminGroup.quick.attendance")} description={t("adminGroup.quick.attendanceDesc")}>
                    <Button asChild variant="outline" className="w-full justify-between">
                        <Link href="/admin/dashboard/group-reservations/attendance">
                            {t("adminGroup.quick.openAttendance")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </AdminSectionCard>
                <AdminSectionCard title={t("adminGroup.quick.metrics")} description={t("adminGroup.quick.metricsDesc")}>
                    <Button asChild variant="outline" className="w-full justify-between">
                        <Link href="/admin/dashboard/group-reservations/metrics">
                            {t("adminGroup.quick.openMetrics")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </AdminSectionCard>
            </div>

            <AdminSectionCard title={t("adminGroup.planSummary.title")}>
                <div className="space-y-2 text-sm text-slate-600">
                    <p>{t("adminGroup.planSummary.currentPlan", { plan: companyUser?.company?.plan || "BUSINESS" })}</p>
                    <p>{t("adminGroup.planSummary.business")}</p>
                    <p>{t("adminGroup.planSummary.pro")}</p>
                </div>
            </AdminSectionCard>
        </div>
    );
}
