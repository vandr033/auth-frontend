import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminStatCardProps = {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    icon?: ReactNode;
    className?: string;
    iconClassName?: string;
};

export function AdminStatCard({
    label,
    value,
    hint,
    icon,
    className,
    iconClassName,
}: AdminStatCardProps) {
    return (
        <Card className={cn("border-slate-200 shadow-sm", className)}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                    <div className="text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
                    {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
                </div>
                {icon ? (
                    <div
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700",
                            iconClassName,
                        )}
                    >
                        {icon}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
