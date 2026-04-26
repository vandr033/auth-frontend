"use client";

import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { AdminTabNav } from "@/components/admin/shared";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";

type TabAccess = "events" | "classes" | "advanced" | "none";

const TABS: Array<{ key: string; href: string; access: TabAccess }> = [
    { key: "adminGroup.nav.overview", href: "/admin/dashboard/group-reservations", access: "none" },
    { key: "adminGroup.nav.events", href: "/admin/dashboard/group-reservations/events", access: "events" },
    { key: "adminGroup.nav.classes", href: "/admin/dashboard/group-reservations/classes", access: "classes" },
    { key: "adminGroup.nav.payments", href: "/admin/dashboard/group-reservations/payments", access: "events" },
    { key: "adminGroup.nav.attendance", href: "/admin/dashboard/group-reservations/attendance", access: "advanced" },
    { key: "adminGroup.nav.metrics", href: "/admin/dashboard/group-reservations/metrics", access: "events" },
];

export function GroupReservationsTabs() {
    const t = useT();
    const pathname = usePathname() ?? "";
    const { canUseEvents, canUseClasses, canUseAdvanced } = useGroupReservationsAccess();

    const hasAccess = (access: TabAccess): boolean => {
        if (access === "none") return true;
        if (access === "events") return canUseEvents;
        if (access === "classes") return canUseClasses;
        return canUseAdvanced;
    };

    return (
        <AdminTabNav
            items={TABS.map((tab) => ({
                key: tab.href,
                label: t(tab.key),
                href: hasAccess(tab.access) ? tab.href : undefined,
                active: pathname === tab.href || pathname.startsWith(`${tab.href}/`),
                disabled: !hasAccess(tab.access),
            }))}
        />
    );
}
