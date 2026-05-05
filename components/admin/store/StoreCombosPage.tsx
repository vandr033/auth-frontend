"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import Link from "next/link";
import { Boxes, Pencil, Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  deleteAdminCommerceCombo,
  listAdminCommerceCombos,
  updateAdminCommerceCombo,
  type AdminCommerceCombo,
} from "@/app/admin/lib/adminCommerceApi";
import {
  ActionMenu,
  AdminMetricGrid,
  AdminPageHeader,
  ConfirmDialog,
  DataTable,
  DataToolbar,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatCard,
  StatusBadge,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { getImageUrl } from "@/utils/image-url";

import { formatCurrency } from "./store-product-shared";
import { getComboListImage } from "./store-combo-shared";

const COMBOS_BASE_PATH = "/admin/dashboard/store/combos";

function getIncludedProductCount(combo: AdminCommerceCombo) {
  return combo.combo_items?.length ?? 0;
}

function getIncludedUnits(combo: AdminCommerceCombo) {
  return combo.combo_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export default function StoreCombosPage() {
  const t = useT();
  const router = useRouter();
  const { companyUser } = useAdminAuth();
  const currency = companyUser?.company?.currency ?? null;

  const [loading, setLoading] = React.useState(true);
  const [actingOnId, setActingOnId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [combos, setCombos] = React.useState<AdminCommerceCombo[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [statusTarget, setStatusTarget] = React.useState<AdminCommerceCombo | null>(null);

  const loadCombos = React.useCallback(async () => {
    const nextCombos = await listAdminCommerceCombos();
    setCombos(nextCombos);
    return nextCombos;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        await loadCombos();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : t("common.error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCombos, t]);

  const filteredCombos = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return combos.filter((combo) => {
      const matchesSearch =
        !normalizedSearch ||
        combo.name.toLowerCase().includes(normalizedSearch) ||
        combo.slug.toLowerCase().includes(normalizedSearch);
      const isActive = combo.is_active !== false;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? isActive : !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [combos, searchQuery, statusFilter]);

  const activeCount = React.useMemo(
    () => combos.filter((combo) => combo.is_active !== false).length,
    [combos],
  );
  const featuredCount = React.useMemo(
    () => combos.filter((combo) => combo.is_featured === true).length,
    [combos],
  );
  const totalIncludedProducts = React.useMemo(
    () => combos.reduce((sum, combo) => sum + getIncludedProductCount(combo), 0),
    [combos],
  );
  const applyComboLocally = React.useCallback((nextCombo: AdminCommerceCombo) => {
    setCombos((current) =>
      current.map((combo) => (combo.id === nextCombo.id ? nextCombo : combo)),
    );
  }, []);

  const handleActivateCombo = React.useCallback(async (combo: AdminCommerceCombo) => {
    try {
      setActingOnId(combo.id);
      const updated = await updateAdminCommerceCombo(combo.id, {
        is_active: true,
      });
      applyComboLocally(updated);
      notify.success(t("adminStore.combos.activated"));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.combos.toggleFailed"));
    } finally {
      setActingOnId(null);
      setStatusTarget(null);
    }
  }, [applyComboLocally, t]);

  const handleDeactivateCombo = React.useCallback(async (combo: AdminCommerceCombo) => {
    try {
      setActingOnId(combo.id);
      const updated = await deleteAdminCommerceCombo(combo.id);
      applyComboLocally(updated);
      notify.success(t("adminStore.combos.deactivated"));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.combos.toggleFailed"));
    } finally {
      setActingOnId(null);
      setStatusTarget(null);
    }
  }, [applyComboLocally, t]);

  const comboActions = React.useCallback(
    (combo: AdminCommerceCombo) => (
      <ActionMenu
        label={t("adminStore.combos.actions")}
        items={[
          {
            label: t("adminStore.combos.edit"),
            icon: <Pencil className="h-4 w-4" />,
            onSelect: () => router.push(`${COMBOS_BASE_PATH}/${combo.id}`),
          },
          {
            label:
              combo.is_active === false
                ? t("adminStore.combos.activate")
                : t("adminStore.combos.deactivate"),
            icon: <Tag className="h-4 w-4" />,
            destructive: combo.is_active !== false,
            onSelect: () => {
              if (combo.is_active === false) {
                void handleActivateCombo(combo);
                return;
              }

              setStatusTarget(combo);
            },
          },
        ]}
      />
    ),
    [handleActivateCombo, router, t],
  );

  if (loading) {
    return <LoadingSkeleton variant="page" rows={4} />;
  }

  const emptyState =
    combos.length === 0 ? (
      <EmptyState
        icon={Boxes}
        title={t("adminStore.combos.emptyTitle")}
        description={t("adminStore.combos.emptyDescription")}
        action={
          <Button asChild>
            <Link href={`${COMBOS_BASE_PATH}/new`}>
              <Plus className="h-4 w-4" />
              {t("adminStore.combos.createAction")}
            </Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={t("common.noResults")}
        description={t("adminStore.combos.emptyFiltered")}
      />
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("adminStore.combos.listTitle")}
        subtitle={t("adminStore.combos.listDescription")}
        actions={
          <Button asChild>
            <Link href={`${COMBOS_BASE_PATH}/new`}>
              <Plus className="h-4 w-4" />
              {t("adminStore.combos.createAction")}
            </Link>
          </Button>
        }
      />

      {loadError ? <ErrorBanner description={loadError} /> : null}

      <AdminMetricGrid>
        <StatCard
          label={t("adminStore.combos.totalCombos")}
          value={combos.length}
          hint={t("adminStore.combos.totalCombosHint")}
        />
        <StatCard
          label={t("adminStore.combos.activeFilter")}
          value={activeCount}
          hint={t("adminStore.combos.activeHintMetric")}
        />
        <StatCard
          label={t("adminStore.combos.featuredCount")}
          value={featuredCount}
          hint={t("adminStore.combos.featuredHintMetric")}
        />
        <StatCard
          label={t("adminStore.combos.totalIncludedProducts")}
          value={totalIncludedProducts}
          hint={t("adminStore.combos.totalIncludedProductsHint")}
        />
      </AdminMetricGrid>

      <DataToolbar
        searchValue={searchQuery}
        searchPlaceholder={t("adminStore.combos.searchPlaceholder")}
        onSearchChange={setSearchQuery}
        summary={t("adminStore.combos.visibleSummary", {
          visible: filteredCombos.length,
          total: combos.length,
        })}
        filters={
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value="ALL">{t("adminStore.combos.allStatuses")}</option>
            <option value="ACTIVE">{t("adminStore.combos.activeFilter")}</option>
            <option value="INACTIVE">{t("adminStore.combos.inactiveFilter")}</option>
          </select>
        }
      />

      <DataTable
        data={filteredCombos}
        getRowKey={(combo) => combo.id}
        empty={emptyState}
        columns={[
          {
            key: "combo",
            header: t("adminStore.combos.comboColumn"),
            cell: (combo) => {
              const imageUrl = getImageUrl(getComboListImage(combo)?.image_url ?? null);

              return (
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {imageUrl ? (
                      <img src={imageUrl} alt={combo.name} className="h-full w-full object-cover" />
                    ) : (
                      <Boxes className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`${COMBOS_BASE_PATH}/${combo.id}`}
                        className="font-medium text-slate-950 transition hover:text-admin-brand"
                      >
                        {combo.name}
                      </Link>
                      <StatusBadge tone={combo.is_active === false ? "warning" : "success"} dot>
                        {combo.is_active === false
                          ? t("adminStore.combos.statusInactive")
                          : t("adminStore.combos.statusActive")}
                      </StatusBadge>
                      {combo.is_featured ? (
                        <StatusBadge tone="brand">{t("adminStore.combos.featuredBadge")}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">{combo.slug}</p>
                    {combo.description ? (
                      <p className="line-clamp-2 text-sm text-slate-600">{combo.description}</p>
                    ) : null}
                  </div>
                </div>
              );
            },
          },
          {
            key: "price",
            header: t("adminStore.table.price"),
            cell: (combo) => (
              <span className="font-medium text-slate-950">
                {formatCurrency(combo.pricing?.final_price ?? combo.price, currency, t)}
              </span>
            ),
            className: "w-36",
          },
          {
            key: "included",
            header: t("adminStore.combos.includedColumn"),
            cell: (combo) => (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-950">
                  {t("adminStore.combos.itemCount", {
                    count: getIncludedProductCount(combo),
                  })}
                </p>
                <p className="text-xs text-slate-500">
                  {t("adminStore.combos.totalUnits", {
                    count: getIncludedUnits(combo),
                  })}
                </p>
              </div>
            ),
            className: "w-40",
          },
          {
            key: "actions",
            header: t("adminStore.combos.actions"),
            cell: (combo) => (
              <div className="flex justify-end">
                {comboActions(combo)}
              </div>
            ),
            className: "w-20",
          },
        ]}
        renderMobileItem={(combo) => {
          const imageUrl = getImageUrl(getComboListImage(combo)?.image_url ?? null);

          return (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {imageUrl ? (
                    <img src={imageUrl} alt={combo.name} className="h-full w-full object-cover" />
                  ) : (
                    <Boxes className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`${COMBOS_BASE_PATH}/${combo.id}`}
                        className="font-medium text-slate-950 transition hover:text-admin-brand"
                      >
                        {combo.name}
                      </Link>
                      <p className="text-sm text-slate-500">{combo.slug}</p>
                    </div>
                    <p className="font-semibold text-slate-950">
                      {formatCurrency(combo.pricing?.final_price ?? combo.price, currency, t)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={combo.is_active === false ? "warning" : "success"} dot>
                      {combo.is_active === false
                        ? t("adminStore.combos.statusInactive")
                        : t("adminStore.combos.statusActive")}
                    </StatusBadge>
                    {combo.is_featured ? (
                      <StatusBadge tone="brand">{t("adminStore.combos.featuredBadge")}</StatusBadge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>
                  {t("adminStore.combos.itemCount", {
                    count: getIncludedProductCount(combo),
                  })}
                </span>
                <span>
                  {t("adminStore.combos.totalUnits", {
                    count: getIncludedUnits(combo),
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${COMBOS_BASE_PATH}/${combo.id}`}>
                    <Pencil className="h-4 w-4" />
                    {t("adminStore.combos.edit")}
                  </Link>
                </Button>
                {comboActions(combo)}
              </div>
            </div>
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={t("adminStore.combos.deactivateConfirmTitle")}
        description={t("adminStore.combos.deactivateConfirmDescription", {
          name: statusTarget?.name ?? "",
        })}
        confirmLabel={t("adminStore.combos.deactivate")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        loading={actingOnId === statusTarget?.id}
        onConfirm={() => {
          if (!statusTarget) return;
          void handleDeactivateCombo(statusTarget);
        }}
      />
    </div>
  );
}
