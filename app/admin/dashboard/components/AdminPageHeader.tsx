import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    className?: string;
    contentClassName?: string;
};

export function AdminPageHeader({
    title,
    subtitle,
    actions,
    className,
    contentClassName,
}: AdminPageHeaderProps) {
    return (
        <section
            className={cn(
                "rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5",
                className,
            )}
        >
            <div
                className={cn(
                    "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between",
                    contentClassName,
                )}
            >
                <div className="min-w-0 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
                    {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
        </section>
    );
}
