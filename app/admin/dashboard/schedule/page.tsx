"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, Clock3, UserRoundX } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export default function SchedulePage() {
    const { role } = useAdminAuth();
    const t = useT();
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

    return (
        <AdminPageShell className="max-w-5xl pb-12">
            <AdminPageHeader
                eyebrow={t("adminNav.groups.team")}
                title={t("adminSchedule.title")}
                subtitle={t(isOwnerOrAdmin ? "adminSchedule.subtitleOwnerAdmin" : "adminSchedule.subtitleStaff")}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isOwnerOrAdmin ? (
                    <ScheduleCard
                        href="/admin/dashboard/hours"
                        icon={<Clock3 className="h-5 w-5 text-admin-brand" />}
                        title={t("adminHours.title")}
                        description={t("adminSchedule.businessHoursDesc")}
                        cta={t("adminSchedule.openBusinessHours")}
                    />
                ) : null}
                <ScheduleCard
                    href="/admin/dashboard/availability"
                    icon={<CalendarClock className="h-5 w-5 text-admin-brand" />}
                    title={t("adminAvailability.title")}
                    description={t("adminSchedule.availabilityDesc")}
                    cta={t("adminSchedule.openAvailability")}
                />
                <ScheduleCard
                    href="/admin/dashboard/time-off"
                    icon={<UserRoundX className="h-5 w-5 text-admin-brand" />}
                    title={t("adminPermissions.title")}
                    description={t("adminSchedule.timeOffDesc")}
                    cta={t("adminSchedule.openTimeOff")}
                />
            </div>
        </AdminPageShell>
    );
}

function ScheduleCard({
    href,
    icon,
    title,
    description,
    cta,
}: {
    href: string;
    icon: ReactNode;
    title: string;
    description: string;
    cta: string;
}) {
    return (
        <Card className="admin-card">
            <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-brand-soft">
                    {icon}
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Button asChild variant="outline" className="w-full justify-between">
                    <Link href={href}>{cta}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
