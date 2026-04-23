"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Layers3,
    Loader2,
    Plus,
    RefreshCcw,
    Settings,
    Users,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    listGroupClasses,
    type GroupClass,
    type GroupItemStatus,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { AdminSectionCard } from "@/app/admin/dashboard/components/AdminSectionCard";
import { AdminStatCard } from "@/app/admin/dashboard/components/AdminStatCard";
import { ActionMenu, DataTable, StatusBadge } from "@/components/admin/shared";
import {
    getPricingModeLabelKey,
} from "@/app/admin/dashboard/group-reservations/classes/components/groupClassForm.shared";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { GroupStatusBadge } from "../components/GroupBadges";
import { formatDate, formatMoneyFromCents } from "../lib/format";

function stripHtml(value: string | null | undefined): string {
    if (!value) return "";
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function GroupClassesPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const { canUseClasses } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [statusFilter, setStatusFilter] = useState<GroupItemStatus | "ALL">("ALL");
    const [expandedClassId, setExpandedClassId] = useState<number | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const classesData = await listGroupClasses({
                status: statusFilter === "ALL" ? undefined : statusFilter,
            });
            setClasses(classesData);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, t]);

    useEffect(() => {
        if (!canUseClasses) return;
        void loadData();
    }, [canUseClasses, loadData]);

    const summary = useMemo(
        () => ({
            total: classes.length,
            published: classes.filter((item) => item.status === "PUBLISHED").length,
            upcomingSessions: classes.reduce((sum, item) => sum + (item._count?.sessions ?? 0), 0),
            enrollments: classes.reduce((sum, item) => sum + (item._count?.enrollments ?? 0), 0),
        }),
        [classes],
    );

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
            <AdminPageHeader
                title={t("adminGroup.classes.title")}
                subtitle={t("adminGroup.classes.subtitle")}
                actions={
                    <>
                        <Button variant="outline" onClick={() => void loadData()}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {t("adminGroup.actions.refresh")}
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/group-reservations/classes/upcoming">
                                <CalendarClock className="mr-2 h-4 w-4" />
                                {t("adminGroup.classes.upcomingSessions")}
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/admin/dashboard/group-reservations/classes/new">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("adminGroup.classes.newClass")}
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    label={t("adminGroup.classes.totalClasses")}
                    value={summary.total}
                    icon={<Layers3 className="h-5 w-5" />}
                    iconClassName="bg-blue-50 text-blue-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.publishedClasses")}
                    value={summary.published}
                    hint={statusFilter === "ALL" ? undefined : t("adminGroup.filters.allStatuses")}
                    icon={<ChevronRight className="h-5 w-5" />}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.upcomingSessions")}
                    value={summary.upcomingSessions}
                    icon={<CalendarClock className="h-5 w-5" />}
                    iconClassName="bg-amber-50 text-amber-700"
                />
                <AdminStatCard
                    label={t("adminGroup.classes.enrollments")}
                    value={summary.enrollments}
                    icon={<Users className="h-5 w-5" />}
                    iconClassName="bg-violet-50 text-violet-700"
                />
            </div>

            <AdminSectionCard
                title={t("adminGroup.classes.listTitle")}
                description={
                    loading ? undefined : `${classes.length} ${t("adminGroup.classes.title").toLowerCase()}`
                }
                actions={
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as GroupItemStatus | "ALL")}
                    >
                        <SelectTrigger className="w-[190px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("adminGroup.filters.allStatuses")}</SelectItem>
                            <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                            <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                            <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                        </SelectContent>
                    </Select>
                }
                contentClassName="p-0"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
                    </div>
                ) : classes.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">{t("adminGroup.classes.empty")}</p>
                ) : (
                    <DataTable
                        mobileBreakpoint="md"
                        className="rounded-none border-0 shadow-none"
                        mobileList={
                            <div className="grid gap-3">
                                {classes.map((item) => {
                                    const description = stripHtml(item.description);
                                    return (
                                        <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                                                    <p className="text-xs text-slate-500">{item.slug}</p>
                                                </div>
                                                <ActionMenu
                                                    label={t("adminGroup.fields.actions")}
                                                    showLabel
                                                    items={[{
                                                        label: t("adminGroup.actions.manage"),
                                                        icon: <Settings className="h-4 w-4" />,
                                                        href: `/admin/dashboard/group-reservations/classes/${item.id}`,
                                                    }]}
                                                />
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <GroupStatusBadge status={item.status} />
                                                <StatusBadge tone="neutral">{t(getPricingModeLabelKey(item.pricing_mode))}</StatusBadge>
                                                <StatusBadge tone="neutral">{formatMoneyFromCents(item.price_cents, currency)}</StatusBadge>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.sessions")}</p>
                                                    <p className="text-slate-900">{item._count?.sessions ?? 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.enrollments")}</p>
                                                    <p className="text-slate-900">{item._count?.enrollments ?? 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.startTime")}</p>
                                                    <p className="text-slate-700">{item.start_time}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminGroup.fields.durationMinutes")}</p>
                                                    <p className="text-slate-700">{item.session_duration_minutes}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                                <p className="text-slate-600">
                                                    {t("adminGroup.fields.location")}: {item.location_text || "—"}
                                                </p>
                                                <p className="text-slate-600">
                                                    {t("adminGroup.fields.recurrenceStartDate")}: {formatDate(item.recurrence_start_date)}
                                                </p>
                                                <p className="text-slate-600">
                                                    {t("adminGroup.fields.recurrenceEndDate")}: {formatDate(item.recurrence_end_date)}
                                                </p>
                                            </div>
                                            {description ? (
                                                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{description}</p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>{t("adminGroup.fields.title")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.pricingMode")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.price")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.sessions")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.enrollments")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                    <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map((item) => {
                                    const isExpanded = expandedClassId === item.id;
                                    const description = stripHtml(item.description);
                                    return (
                                        <Fragment key={item.id}>
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() =>
                                                            setExpandedClassId((current) =>
                                                                current === item.id ? null : item.id,
                                                            )
                                                        }
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">
                                                    <div>{item.title}</div>
                                                    <div className="text-xs text-slate-500">{item.slug}</div>
                                                </TableCell>
                                                <TableCell>{t(getPricingModeLabelKey(item.pricing_mode))}</TableCell>
                                                <TableCell>{formatMoneyFromCents(item.price_cents, currency)}</TableCell>
                                                <TableCell>{item._count?.sessions ?? 0}</TableCell>
                                                <TableCell>{item._count?.enrollments ?? 0}</TableCell>
                                                <TableCell>
                                                    <GroupStatusBadge status={item.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <ActionMenu
                                                        label={t("adminGroup.fields.actions")}
                                                        items={[{
                                                            label: t("adminGroup.actions.manage"),
                                                            icon: <Settings className="h-4 w-4" />,
                                                            href: `/admin/dashboard/group-reservations/classes/${item.id}`,
                                                        }]}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded ? (
                                                <TableRow className="bg-slate-50/80">
                                                    <TableCell colSpan={8}>
                                                        <div className="grid gap-4 px-1 py-2 md:grid-cols-2 xl:grid-cols-4">
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.location")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.location_text || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.startTime")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.start_time}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.recurrenceStartDate")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {formatDate(item.recurrence_start_date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.recurrenceEndDate")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {formatDate(item.recurrence_end_date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.durationMinutes")}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-900">
                                                                    {item.session_duration_minutes}
                                                                </p>
                                                            </div>
                                                            <div className="md:col-span-2 xl:col-span-3">
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                    {t("adminGroup.fields.description")}
                                                                </p>
                                                                <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                                                                    {description || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </DataTable>
                )}
            </AdminSectionCard>

        </div>
    );
}
