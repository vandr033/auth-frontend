"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus, Tag } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  deleteAdminCommerceProduct,
  listAdminCommerceCategories,
  listAdminCommerceProducts,
  updateAdminCommerceProduct,
  type AdminCommerceCategory,
  type AdminCommerceProduct,
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

import {
  formatCurrency,
  getDisplayComparisonPrice,
  getPrimaryImage,
  getPromoLabel,
  getPromoTone,
} from "./store-product-shared";

const PRODUCTS_BASE_PATH = "/admin/dashboard/store/products";

function getStockLabel(product: AdminCommerceProduct, t: ReturnType<typeof useT>) {
  if (product.track_stock === false) {
    return t("adminStore.products.stockNotTracked");
  }

  return `${product.stock_quantity}`;
}

export default function StoreProductsPage() {
  const t = useT();
  const router = useRouter();
  const { companyUser } = useAdminAuth();
  const currency = companyUser?.company?.currency ?? null;

  const [loading, setLoading] = React.useState(true);
  const [actingOnId, setActingOnId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<AdminCommerceCategory[]>([]);
  const [products, setProducts] = React.useState<AdminCommerceProduct[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [statusTarget, setStatusTarget] = React.useState<AdminCommerceProduct | null>(null);

  const loadCatalog = React.useCallback(async () => {
    const [nextCategories, nextProducts] = await Promise.all([
      listAdminCommerceCategories(),
      listAdminCommerceProducts({ productType: "SIMPLE" }),
    ]);

    setCategories(nextCategories);
    setProducts(nextProducts);
    return nextProducts;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        await loadCatalog();
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
  }, [loadCatalog, t]);

  const filteredProducts = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        categoryFilter === "ALL" || product.category_id === categoryFilter;
      const isActive = product.is_active !== false;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? isActive : !isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, products, searchQuery, statusFilter]);

  const activeCount = React.useMemo(
    () => products.filter((product) => product.is_active !== false).length,
    [products],
  );
  const promoCount = React.useMemo(
    () =>
      products.filter(
        (product) =>
          product.pricing?.promo_applied === true || product.promo_price != null,
      ).length,
    [products],
  );
  const inactiveCount = products.length - activeCount;

  const applyProductLocally = React.useCallback((nextProduct: AdminCommerceProduct) => {
    setProducts((current) =>
      current.map((product) => (product.id === nextProduct.id ? nextProduct : product)),
    );
  }, []);

  const handleActivateProduct = React.useCallback(async (product: AdminCommerceProduct) => {
    try {
      setActingOnId(product.id);
      const updated = await updateAdminCommerceProduct(product.id, {
        is_active: true,
      });
      applyProductLocally(updated);
      notify.success(t("adminStore.products.activated"));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.products.toggleFailed"));
    } finally {
      setActingOnId(null);
      setStatusTarget(null);
    }
  }, [applyProductLocally, t]);

  const handleDeactivateProduct = React.useCallback(async (product: AdminCommerceProduct) => {
    try {
      setActingOnId(product.id);
      const updated = await deleteAdminCommerceProduct(product.id);
      applyProductLocally(updated);
      notify.success(t("adminStore.products.deactivated"));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.products.toggleFailed"));
    } finally {
      setActingOnId(null);
      setStatusTarget(null);
    }
  }, [applyProductLocally, t]);

  const productActions = React.useCallback(
    (product: AdminCommerceProduct) => (
      <ActionMenu
        label={t("adminStore.products.actions")}
        items={[
          {
            label: t("adminStore.products.edit"),
            icon: <Pencil className="h-4 w-4" />,
            onSelect: () => router.push(`${PRODUCTS_BASE_PATH}/${product.id}`),
          },
          {
            label:
              product.is_active === false
                ? t("adminStore.products.activate")
                : t("adminStore.products.deactivate"),
            icon: <Tag className="h-4 w-4" />,
            destructive: product.is_active !== false,
            onSelect: () => {
              if (product.is_active === false) {
                void handleActivateProduct(product);
                return;
              }

              setStatusTarget(product);
            },
          },
        ]}
      />
    ),
    [handleActivateProduct, router, t],
  );

  if (loading) {
    return <LoadingSkeleton variant="page" rows={4} />;
  }

  const emptyState =
    products.length === 0 ? (
      <EmptyState
        icon={Package}
        title={t("adminStore.products.emptyTitle")}
        description={t("adminStore.products.emptyDescription")}
        action={
          <Button asChild>
            <Link href={`${PRODUCTS_BASE_PATH}/new`}>
              <Plus className="h-4 w-4" />
              {t("adminStore.products.createAction")}
            </Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={t("common.noResults")}
        description={t("adminStore.products.emptyFiltered")}
      />
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("adminStore.products.listTitle")}
        subtitle={t("adminStore.products.listDescription")}
        actions={
          <Button asChild>
            <Link href={`${PRODUCTS_BASE_PATH}/new`}>
              <Plus className="h-4 w-4" />
              {t("adminStore.products.createAction")}
            </Link>
          </Button>
        }
      />

      {loadError ? <ErrorBanner description={loadError} /> : null}

      <AdminMetricGrid>
        <StatCard
          label={t("adminStore.overview.totalProducts")}
          value={products.length}
          hint={t("adminStore.overview.totalProductsHint")}
        />
        <StatCard
          label={t("adminStore.overview.activeProducts")}
          value={activeCount}
          hint={t("adminStore.overview.activeProductsHint")}
        />
        <StatCard
          label={t("adminStore.products.promoCount")}
          value={promoCount}
          hint={t("adminStore.products.promoHint")}
        />
        <StatCard
          label={t("adminStore.products.inactiveFilter")}
          value={inactiveCount}
          hint={t("adminStore.products.inactiveHint")}
        />
      </AdminMetricGrid>

      <DataToolbar
        searchValue={searchQuery}
        searchPlaceholder={t("adminStore.products.searchPlaceholder")}
        onSearchChange={setSearchQuery}
        summary={t("adminStore.products.visibleSummary", {
          visible: filteredProducts.length,
          total: products.length,
        })}
        filters={
          <>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">{t("adminStore.products.allCategories")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
            >
              <option value="ALL">{t("adminStore.products.allStatuses")}</option>
              <option value="ACTIVE">{t("adminStore.products.activeFilter")}</option>
              <option value="INACTIVE">{t("adminStore.products.inactiveFilter")}</option>
            </select>
          </>
        }
      />

      <DataTable
        data={filteredProducts}
        getRowKey={(product) => product.id}
        empty={emptyState}
        columns={[
          {
            key: "product",
            header: t("adminStore.table.product"),
            cell: (product) => {
              const promoLabel = getPromoLabel(product, t);
              const promoTone = getPromoTone(product);
              const imageUrl = getImageUrl(getPrimaryImage(product)?.image_url ?? null);

              return (
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`${PRODUCTS_BASE_PATH}/${product.id}`}
                        className="font-medium text-slate-950 transition hover:text-admin-brand"
                      >
                        {product.name}
                      </Link>
                      <StatusBadge tone={product.is_active === false ? "warning" : "success"} dot>
                        {product.is_active === false
                          ? t("adminStore.products.statusInactive")
                          : t("adminStore.products.statusActive")}
                      </StatusBadge>
                      {promoLabel && promoTone ? (
                        <StatusBadge tone={promoTone}>{promoLabel}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">{product.slug}</p>
                    {product.description ? (
                      <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
                    ) : null}
                  </div>
                </div>
              );
            },
          },
          {
            key: "category",
            header: t("adminStore.table.category"),
            cell: (product) => (
              <span className="text-sm text-slate-700">
                {product.category?.name ?? t("adminStore.products.noCategory")}
              </span>
            ),
            className: "w-40",
          },
          {
            key: "price",
            header: t("adminStore.table.price"),
            cell: (product) => {
              const finalPrice = product.pricing?.final_price ?? product.price;
              const comparisonPrice = getDisplayComparisonPrice(product);

              return (
                <div className="space-y-1">
                  <p className="font-medium text-slate-950">
                    {formatCurrency(finalPrice, currency, t)}
                  </p>
                  {comparisonPrice != null && comparisonPrice > finalPrice ? (
                    <p className="text-xs text-slate-500 line-through">
                      {formatCurrency(comparisonPrice, currency, t)}
                    </p>
                  ) : null}
                </div>
              );
            },
            className: "w-36",
          },
          {
            key: "stock",
            header: t("adminStore.table.stock"),
            cell: (product) => (
              <span className="text-sm text-slate-700">
                {getStockLabel(product, t)}
              </span>
            ),
            className: "w-28",
          },
          {
            key: "actions",
            header: t("adminStore.products.actions"),
            cell: (product) => (
              <div className="flex justify-end">
                {productActions(product)}
              </div>
            ),
            className: "w-20",
          },
        ]}
        renderMobileItem={(product) => {
          const promoLabel = getPromoLabel(product, t);
          const promoTone = getPromoTone(product);
          const imageUrl = getImageUrl(getPrimaryImage(product)?.image_url ?? null);
          const comparisonPrice = getDisplayComparisonPrice(product);
          const finalPrice = product.pricing?.final_price ?? product.price;

          return (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`${PRODUCTS_BASE_PATH}/${product.id}`}
                        className="font-medium text-slate-950 transition hover:text-admin-brand"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {product.category?.name ?? t("adminStore.products.noCategory")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(finalPrice, currency, t)}
                      </p>
                      {comparisonPrice != null && comparisonPrice > finalPrice ? (
                        <p className="text-xs text-slate-500 line-through">
                          {formatCurrency(comparisonPrice, currency, t)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={product.is_active === false ? "warning" : "success"} dot>
                      {product.is_active === false
                        ? t("adminStore.products.statusInactive")
                        : t("adminStore.products.statusActive")}
                    </StatusBadge>
                    {promoLabel && promoTone ? (
                      <StatusBadge tone={promoTone}>{promoLabel}</StatusBadge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>{product.slug}</span>
                <span>
                  {t("adminStore.table.stock")}: {getStockLabel(product, t)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${PRODUCTS_BASE_PATH}/${product.id}`}>
                    <Pencil className="h-4 w-4" />
                    {t("adminStore.products.edit")}
                  </Link>
                </Button>
                {productActions(product)}
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
        title={t("adminStore.products.deactivateConfirmTitle")}
        description={t("adminStore.products.deactivateConfirmDescription", {
          name: statusTarget?.name ?? "",
        })}
        confirmLabel={t("adminStore.products.deactivate")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        loading={actingOnId === statusTarget?.id}
        onConfirm={() => {
          if (!statusTarget) return;
          void handleDeactivateProduct(statusTarget);
        }}
      />
    </div>
  );
}
