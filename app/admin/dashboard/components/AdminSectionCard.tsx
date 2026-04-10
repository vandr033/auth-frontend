import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminSectionCardProps = {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
};

export function AdminSectionCard({
    title,
    description,
    actions,
    children,
    className,
    contentClassName,
}: AdminSectionCardProps) {
    return (
        <Card className={cn("border-slate-200 shadow-sm", className)}>
            <CardHeader className="gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-base text-slate-900">{title}</CardTitle>
                    {description ? <p className="text-sm text-slate-600">{description}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </CardHeader>
            <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
        </Card>
    );
}
