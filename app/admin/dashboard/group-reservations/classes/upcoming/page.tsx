"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
    listGroupClassSessions,
    listGroupClasses,
    type GroupClass,
    type GroupClassSession,
} from "@/app/admin/lib/adminApi";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useGroupReservationsAccess } from "../../lib/useGroupReservationsAccess";
import { formatDateTime } from "../../lib/format";
import { GroupStatusBadge } from "../../components/GroupBadges";

type SessionRow = {
    groupClass: GroupClass;
    session: GroupClassSession;
};

export default function GroupClassesUpcomingPage() {
    const t = useT();
    const { canUseClasses } = useGroupReservationsAccess();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<SessionRow[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const classes = await listGroupClasses({ status: "PUBLISHED" });
            const sessionsByClass = await Promise.all(
                classes.map((item) => listGroupClassSessions(item.id, { upcoming: true })),
            );

            const nextRows: SessionRow[] = [];
            classes.forEach((item, index) => {
                sessionsByClass[index].forEach((session) => {
                    nextRows.push({ groupClass: item, session });
                });
            });

            nextRows.sort((a, b) => new Date(a.session.start_at).getTime() - new Date(b.session.start_at).getTime());
            setRows(nextRows);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!canUseClasses) return;
        void loadData();
    }, [canUseClasses, loadData]);

    if (!canUseClasses) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnPro")}
                feature="GROUP_CLASSES"
                requiredPlan="PRO"
                fullPage
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button asChild variant="outline">
                    <Link href="/admin/dashboard/group-reservations/classes">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("adminGroup.actions.backToClasses")}
                    </Link>
                </Button>
                <Button variant="outline" onClick={() => void loadData()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("adminGroup.actions.refresh")}
                </Button>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{t("adminGroup.classes.upcomingSessionsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-brand" />
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.classes.noUpcomingSessions")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("adminGroup.fields.class")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.startAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.endAt")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.capacity")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.occupancy")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.session.id}>
                                        <TableCell className="font-medium text-slate-900">{row.groupClass.title}</TableCell>
                                        <TableCell>{formatDateTime(row.session.start_at)}</TableCell>
                                        <TableCell>{formatDateTime(row.session.end_at)}</TableCell>
                                        <TableCell>{row.session.max_capacity ?? row.groupClass.max_capacity_per_session}</TableCell>
                                        <TableCell>{row.session.booked_count ?? 0}</TableCell>
                                        <TableCell>
                                            <GroupStatusBadge status={row.session.status} />
                                        </TableCell>
                                        <TableCell>
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/dashboard/group-reservations/classes/${row.groupClass.id}`}>
                                                    {t("adminGroup.actions.manage")}
                                                </Link>
                                            </Button>
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
