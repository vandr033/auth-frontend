"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight, CircleSlash } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminPageHeader, AdminPageShell, AdminSectionCard, ErrorState } from "@/components/admin/shared";
import { AdminLockedModuleState } from "@/components/admin/product/AdminLockedModuleState";
import { Button } from "@/components/ui/button";
import { getAdminModulePageModel } from "@/lib/admin/navigation";
import { useT } from "@/lib/i18n";

export default function AdminModulePage({
    params,
}: {
    params: Promise<{ itemId: string }>;
}) {
    const { companyUser } = useAdminAuth();
    const t = useT();
    const { itemId } = use(params);
    const model = getAdminModulePageModel(itemId, companyUser?.company?.capabilities);

    if (!model) {
        return (
            <AdminPageShell>
                <AdminPageHeader title={t("adminModules.notFoundTitle")} />
                <ErrorState
                    icon={CircleSlash}
                    title={t("adminModules.notFoundTitle")}
                    description={t("adminModules.notFoundDescription")}
                />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell className="max-w-6xl pb-12">
            <AdminPageHeader
                title={t(model.titleKey)}
                subtitle={t(model.descriptionKey)}
                meta={t(
                    model.state === "active"
                        ? "adminModules.activeMeta"
                        : "adminModules.lockedMeta",
                )}
            />

            {model.state === "locked" && model.recommendation ? (
                <AdminLockedModuleState
                    titleKey={model.titleKey}
                    descriptionKey={model.descriptionKey}
                    featureKeys={model.featureKeys}
                    recommendation={model.recommendation}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {model.links.map((link) => (
                        <AdminSectionCard
                            key={link.href}
                            title={t(link.labelKey)}
                            description={t(link.descriptionKey)}
                        >
                            <Button asChild variant="outline" className="w-full justify-between">
                                <Link href={link.href}>
                                    {t("adminModules.openModuleLink")}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </AdminSectionCard>
                    ))}
                </div>
            )}
        </AdminPageShell>
    );
}
