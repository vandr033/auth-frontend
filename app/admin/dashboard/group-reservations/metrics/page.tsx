"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { formatMoneyFromCents } from "../lib/format";
import {
    getGroupMetrics,
    type GroupMetricsResponse,
} from "@/app/admin/lib/adminApi";

export default function GroupMetricsPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const { canUseAdvanced, canUseClasses, canUseEvents } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<GroupMetricsResponse | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const loadData = useCallback(async () => {
        if (!canUseEvents && !canUseClasses) return;
        setLoading(true);
        try {
            const data = await getGroupMetrics({
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setMetrics(data);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [canUseClasses, canUseEvents, dateFrom, dateTo, t]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const eventSummary = metrics?.events.summary;
    const classSummary = metrics?.classes?.summary;
    const classSessionRows = useMemo(
        () => (metrics?.classes?.breakdown ?? []).flatMap((row) =>
            row.session_breakdown.map((session) => ({
                ...session,
                class_title: row.title,
            })),
        ),
        [metrics],
    );

    const hasClassMetrics = useMemo(
        () => Boolean(canUseClasses && metrics?.classes),
        [canUseClasses, metrics],
    );

    if (!canUseEvents && !canUseClasses) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t("adminGroup.metrics.title")}</h2>
                    <p className="text-sm text-slate-600">{t("adminGroup.metrics.subtitle")}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="w-full sm:w-[170px]"
                    />
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="w-full sm:w-[170px]"
                    />
                    <Button variant="outline" onClick={() => void loadData()} className="w-full sm:w-auto">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.refresh")}
                    </Button>
                </div>
            </div>

            {loading || !metrics || !eventSummary ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.totalEvents")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.total_events}</CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.seatsSold")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.seats_sold}</CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.occupancyRate")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.occupancy_rate.toFixed(1)}%</CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.attendanceRate")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.attendance_rate.toFixed(1)}%</CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.freePaidConversion")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm font-medium text-slate-900">
                                {eventSummary.free_confirmed_spots} / {eventSummary.paid_confirmed_spots}
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.noShowCount")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.no_show_count}</CardContent>
                        </Card>
                        {canUseAdvanced ? (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.waitlistSize")}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-2xl font-semibold text-slate-900">{metrics.advanced?.waitlist_size ?? 0}</CardContent>
                            </Card>
                        ) : (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-600">{t("adminGroup.bookings.interestTitle")}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-2xl font-semibold text-slate-900">{eventSummary.total_interest_count ?? 0}</CardContent>
                            </Card>
                        )}
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.eventRevenue")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xl font-semibold text-slate-900">
                                {formatMoneyFromCents(eventSummary.revenue_cents, currency)}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.metrics.eventBreakdown")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.events.breakdown.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.metrics.noEventData")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("adminGroup.fields.event")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.seatsBooked")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.pending")}</TableHead>
                                            <TableHead>{t("adminGroup.metrics.occupancyRate")}</TableHead>
                                            <TableHead>{t("adminGroup.metrics.attendanceRate")}</TableHead>
                                            <TableHead>{t("adminGroup.metrics.noShowCount")}</TableHead>
                                            {canUseAdvanced ? <TableHead>{t("adminGroup.metrics.waitlistSize")}</TableHead> : null}
                                            <TableHead>{t("adminGroup.metrics.revenue")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {metrics.events.breakdown.map((row) => (
                                            <TableRow key={row.event_id}>
                                                <TableCell className="font-medium text-slate-900">{row.title}</TableCell>
                                                <TableCell>{row.confirmed_spots}</TableCell>
                                                <TableCell>{row.pending_spots}</TableCell>
                                                <TableCell>{row.occupancy_rate.toFixed(1)}%</TableCell>
                                                <TableCell>{row.attendance_rate.toFixed(1)}%</TableCell>
                                                <TableCell>{row.no_show_count}</TableCell>
                                                {canUseAdvanced ? <TableCell>{row.waitlist_size}</TableCell> : null}
                                                <TableCell>{formatMoneyFromCents(row.revenue_cents, currency)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {hasClassMetrics && classSummary ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.totalClasses")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.total_classes}</CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.totalEnrollments")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.total_enrollments}</CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.activePassHolders")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.active_pass_holders}</CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.classRevenue")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xl font-semibold text-slate-900">
                                        {formatMoneyFromCents(classSummary.revenue_cents, currency)}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.occupancyRate")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.occupancy_rate.toFixed(1)}%</CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.attendanceRate")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.attendance_rate.toFixed(1)}%</CardContent>
                                </Card>
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-slate-600">{t("adminGroup.metrics.passUtilization")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-2xl font-semibold text-slate-900">{classSummary.pass_utilization_rate.toFixed(1)}%</CardContent>
                                </Card>
                            </div>

                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base">{t("adminGroup.metrics.classBreakdown")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {metrics.classes?.breakdown.length === 0 ? (
                                        <p className="text-sm text-slate-500">{t("adminGroup.metrics.noClassData")}</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("adminGroup.fields.class")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.totalEnrollments")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.activePassHolders")}</TableHead>
                                                    <TableHead>{t("adminGroup.fields.sessions")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.attendanceRate")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.noShowCount")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.revenue")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {metrics.classes?.breakdown.map((row) => (
                                                    <TableRow key={row.class_id}>
                                                        <TableCell className="font-medium text-slate-900">{row.title}</TableCell>
                                                        <TableCell>{row.total_enrollments}</TableCell>
                                                        <TableCell>{row.active_pass_holders}</TableCell>
                                                        <TableCell>{row.total_sessions}</TableCell>
                                                        <TableCell>{row.attendance_rate.toFixed(1)}%</TableCell>
                                                        <TableCell>{row.no_show_count}</TableCell>
                                                        <TableCell>{formatMoneyFromCents(row.revenue_cents, currency)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base">{t("adminGroup.metrics.sessionBreakdown")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {classSessionRows.length === 0 ? (
                                        <p className="text-sm text-slate-500">{t("adminGroup.metrics.noClassData")}</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("adminGroup.fields.class")}</TableHead>
                                                    <TableHead>{t("adminGroup.fields.session")}</TableHead>
                                                    <TableHead>{t("adminGroup.fields.capacity")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.potentialAttendances")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.attendanceRate")}</TableHead>
                                                    <TableHead>{t("adminGroup.metrics.noShowCount")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {classSessionRows.map((row) => (
                                                    <TableRow key={row.session_id}>
                                                        <TableCell className="font-medium text-slate-900">{row.class_title}</TableCell>
                                                        <TableCell>{new Date(row.start_at).toLocaleString()}</TableCell>
                                                        <TableCell>{row.capacity}</TableCell>
                                                        <TableCell>{row.potential_attendances}</TableCell>
                                                        <TableCell>{row.pass_utilization_rate.toFixed(1)}%</TableCell>
                                                        <TableCell>{row.no_show_count}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="border-slate-200">
                            <CardContent className="py-6 text-sm text-slate-600">
                                {t("adminGroup.metrics.proClassMetricsLocked")}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
