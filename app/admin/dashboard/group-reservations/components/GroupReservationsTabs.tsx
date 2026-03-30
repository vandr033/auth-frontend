"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";

type TabAccess = "events" | "classes" | "advanced" | "none";

const TABS: Array<{ key: string; href: string; access: TabAccess }> = [
    { key: "adminGroup.nav.overview", href: "/admin/dashboard/group-reservations", access: "none" },
    { key: "adminGroup.nav.events", href: "/admin/dashboard/group-reservations/events", access: "events" },
    { key: "adminGroup.nav.classes", href: "/admin/dashboard/group-reservations/classes", access: "classes" },
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
        <div className="overflow-x-auto">
            <div className="inline-flex min-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                {TABS.map((tab) => {
                    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    const enabled = hasAccess(tab.access);
                    const label = t(tab.key);

                    if (!enabled) {
                        return (
                            <span
                                key={tab.href}
                                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400"
                            >
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                {label}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-brand text-white"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            )}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
