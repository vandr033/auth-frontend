"use client";

import Link from "next/link";
import * as React from "react";
import {
  CircleDollarSign,
  ExternalLink,
  FolderTree,
  Package,
  Plus,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Store,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  getAdminCommerceMetrics,
  getAdminCommerceStore,
  listAdminCommerceCategories,
  listAdminCommerceOrders,
  listAdminCommerceProducts,
  type AdminCommerceMetrics,
  type AdminCommerceOrder,
  type AdminCommerceProduct,
  type AdminCommerceStore,
} from "@/app/admin/lib/adminCommerceApi";
import { StoreLoadingState } from "@/components/admin/store/admin-store";
import { AdminMetricGrid, ErrorBanner, StatCard, StatusBadge } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { hasProductCapability } from "@/lib/product-access";
import type { AppApiError } from "@/lib/api-error";

function formatCurrency(
  value: number | string | null | undefined,
  currencyCode: string | null | undefined,
  t: ReturnType<typeof useT>,
) {
  if (value == null || value === "") return t("adminStore.overview.notAvailable");

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return t("adminStore.overview.notAvailable");

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "BOB",
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return numericValue.toFixed(2);
  }
}

function formatDate(value: string | undefined, t: ReturnType<typeof useT>) {
  if (!value) return t("adminStore.overview.noDate");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("adminStore.overview.noDate");

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek() {
  const today = startOfToday();
  const dayIndex = (today.getDay() + 6) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() - dayIndex);
  return next;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function countOrdersSince(orders: AdminCommerceOrder[], startDate: Date) {
  return orders.reduce((count, order) => {
    if (!order.created_at) return count;
    const orderDate = new Date(order.created_at);
    if (Number.isNaN(orderDate.getTime())) return count;
    return orderDate >= startDate ? count + 1 : count;
  }, 0);
}

function isPendingOrder(order: AdminCommerceOrder) {
  const closedPaymentStatuses = new Set([
    "PAYMENT_CONFIRMED",
    "CANCELLED",
    "PAYMENT_REJECTED",
    "REFUNDED",
  ]);
  const closedFulfillmentStatuses = new Set(["COMPLETED", "CANCELLED", "REJECTED"]);

  return !(
    closedPaymentStatuses.has(order.payment_status) ||
    closedFulfillmentStatuses.has(order.fulfillment_status)
  );
}

function getStatusTone(status: string) {
  switch (status) {
    case "PAYMENT_CONFIRMED":
    case "COMPLETED":
    case "ACCEPTED":
    case "READY_FOR_PICKUP":
      return "success" as const;
    case "AWAITING_PAYMENT":
    case "PAYMENT_SUBMITTED":
    case "AWAITING_DELIVERY_COST":
    case "PENDING":
    case "PENDING_REVIEW":
    case "PREPARING":
    case "OUT_FOR_DELIVERY":
      return "warning" as const;
    case "CANCELLED":
    case "REJECTED":
    case "REFUNDED":
    case "PAYMENT_REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function getFulfillmentModeLabel(mode: AdminCommerceStore["fulfillment_mode"] | null | undefined, t: ReturnType<typeof useT>) {
  switch (mode) {
    case "PICKUP_ONLY":
      return t("adminStore.settings.fulfillment.pickupOnly");
    case "DELIVERY_ONLY":
      return t("adminStore.settings.fulfillment.deliveryOnly");
    case "PICKUP_AND_DELIVERY":
      return t("adminStore.settings.fulfillment.both");
    default:
      return t("adminStore.overview.notConfigured");
  }
}

function getStatusLabel(status: string, t: ReturnType<typeof useT>) {
  const key = `adminStore.statusLabels.${status}`;
  const translated = t(key);
  return translated === key ? status.replaceAll("_", " ") : translated;
}

function buildPublicStoreUrl(origin: string, slug: string | null) {
  if (!slug) return null;
  const path = `/shop/${slug}/store`;
  return origin ? `${origin}${path}` : path;
}

export default function AdminStoreOverviewPage() {
  const t = useT();
  const { companySlug, companyUser, user } = useAdminAuth();
  const currency = companyUser?.company?.currency ?? null;
  const canViewMetrics = Boolean(user?.is_super_admin) || hasProductCapability(companyUser?.company?.capabilities, "COMMERCE_METRICS");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [store, setStore] = React.useState<AdminCommerceStore | null>(null);
  const [products, setProducts] = React.useState<AdminCommerceProduct[]>([]);
  const [categoryCount, setCategoryCount] = React.useState(0);
  const [orders, setOrders] = React.useState<AdminCommerceOrder[]>([]);
  const [metrics, setMetrics] = React.useState<AdminCommerceMetrics | null>(null);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const [nextStore, categories, nextProducts, nextOrders, nextMetrics] = await Promise.all([
          getAdminCommerceStore(),
          listAdminCommerceCategories(),
          listAdminCommerceProducts(),
          listAdminCommerceOrders(),
          canViewMetrics
            ? getAdminCommerceMetrics().catch((metricsError: unknown) => {
                const appError = metricsError as AppApiError;
                if (appError?.status === 403 || appError?.capability === "COMMERCE_METRICS") {
                  return null;
                }
                return null;
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setStore(nextStore);
        setCategoryCount(categories.length);
        setProducts(nextProducts);
        setOrders(nextOrders);
        setMetrics(nextMetrics);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t("adminStore.messages.loadFailed"));
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
  }, [canViewMetrics, t]);

  const publicStoreUrl = React.useMemo(
    () => buildPublicStoreUrl(origin, companySlug),
    [companySlug, origin],
  );

  const isVisible = Boolean(store?.is_active && publicStoreUrl);
  const activeProducts = metrics?.stock.activeProducts ?? products.filter((product) => product.is_active !== false).length;
  const ordersToday = React.useMemo(() => countOrdersSince(orders, startOfToday()), [orders]);
  const ordersThisWeek = React.useMemo(() => countOrdersSince(orders, startOfWeek()), [orders]);
  const ordersThisMonth = React.useMemo(() => countOrdersSince(orders, startOfMonth()), [orders]);
  const pendingOrders = React.useMemo(() => orders.filter(isPendingOrder).length, [orders]);
  const recentOrders = React.useMemo(() => orders.slice(0, 5), [orders]);
  const hasCatalog = products.length > 0 || categoryCount > 0;

  if (loading) return <StoreLoadingState />;

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner description={error} /> : null}

      <Card className="overflow-hidden border-admin-brand/15 bg-gradient-to-br from-white via-admin-brand/[0.03] to-admin-accent/[0.08]">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={store?.is_active ? "success" : "warning"} dot>
                {store?.is_active ? t("adminStore.status.active") : t("adminStore.status.inactive")}
              </StatusBadge>
              <StatusBadge tone={isVisible ? "success" : "neutral"} dot>
                {isVisible ? t("adminStore.overview.visibilityVisible") : t("adminStore.overview.visibilityHidden")}
              </StatusBadge>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {t("adminStore.overview.snapshotTitle")}
              </h2>
              <p className="max-w-2xl text-sm text-slate-600">
                {hasCatalog
                  ? t("adminStore.overview.snapshotReady")
                  : t("adminStore.overview.snapshotNeedsCatalog")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("adminStore.overview.fulfillmentLabel")}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {getFulfillmentModeLabel(store?.fulfillment_mode, t)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("adminStore.overview.publicUrlLabel")}
                </p>
                {publicStoreUrl ? (
                  <Link
                    href={`/shop/${companySlug}/store`}
                    target="_blank"
                    className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-admin-brand hover:underline"
                  >
                    <span className="truncate">{publicStoreUrl}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">{t("adminStore.overview.publicUrlUnavailable")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
            <Button asChild className="justify-start gap-2">
              <Link href="/admin/dashboard/store/products">
                <Plus className="h-4 w-4" />
                {t("adminStore.overview.createProduct")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/admin/dashboard/store/categories">
                <FolderTree className="h-4 w-4" />
                {t("adminStore.overview.createCategory")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/admin/dashboard/store/orders">
                <ReceiptText className="h-4 w-4" />
                {t("adminStore.overview.viewOrders")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/admin/dashboard/store/settings">
                <Settings2 className="h-4 w-4" />
                {t("adminStore.overview.configureStore")}
              </Link>
            </Button>
            {publicStoreUrl ? (
              <Button asChild variant="outline" className="justify-start gap-2 sm:col-span-2">
                <Link href={`/shop/${companySlug}/store`} target="_blank">
                  <Store className="h-4 w-4" />
                  {t("adminStore.overview.viewPublicStore")}
                </Link>
              </Button>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-500 sm:col-span-2">
                {t("adminStore.overview.publicUrlHint")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AdminMetricGrid className="xl:grid-cols-4">
        <StatCard
          label={t("adminStore.overview.totalProducts")}
          value={products.length}
          hint={t("adminStore.overview.totalProductsHint")}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label={t("adminStore.overview.activeProducts")}
          value={activeProducts}
          hint={t("adminStore.overview.activeProductsHint")}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          label={t("adminStore.nav.categories")}
          value={categoryCount}
          hint={t("adminStore.overview.categoriesHint")}
          icon={<FolderTree className="h-5 w-5" />}
        />
        <StatCard
          label={t("adminStore.overview.pendingOrders")}
          value={pendingOrders}
          hint={t("adminStore.overview.pendingOrdersHint")}
          icon={<ReceiptText className="h-5 w-5" />}
        />
        <StatCard
          label={t("adminStore.overview.ordersToday")}
          value={ordersToday}
          hint={t("adminStore.overview.ordersTodayHint")}
        />
        <StatCard
          label={t("adminStore.overview.ordersThisWeek")}
          value={ordersThisWeek}
          hint={t("adminStore.overview.ordersThisWeekHint")}
        />
        <StatCard
          label={t("adminStore.overview.ordersThisMonth")}
          value={ordersThisMonth}
          hint={t("adminStore.overview.ordersThisMonthHint")}
        />
        <StatCard
          label={t("adminStore.overview.confirmedRevenue")}
          value={formatCurrency(metrics?.totals.confirmedRevenue, currency, t)}
          hint={canViewMetrics ? t("adminStore.overview.confirmedRevenueHint") : t("adminStore.overview.metricsUpgradeHint")}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
      </AdminMetricGrid>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{t("adminStore.overview.recentOrdersTitle")}</CardTitle>
              <p className="mt-1 text-sm text-slate-600">{t("adminStore.overview.recentOrdersSubtitle")}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard/store/orders">{t("adminStore.overview.viewOrders")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                <p className="font-medium text-slate-900">{t("adminStore.overview.emptyOrdersTitle")}</p>
                <p className="mt-1 text-sm text-slate-600">{t("adminStore.overview.emptyOrdersDescription")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/admin/dashboard/store/products">{t("adminStore.overview.createProduct")}</Link>
                  </Button>
                  {publicStoreUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/shop/${companySlug}/store`} target="_blank">
                        {t("adminStore.overview.viewPublicStore")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 px-4 py-4 transition-colors hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-950">{order.customer_name}</p>
                      <p className="text-sm text-slate-500">
                        {order.order_number} · {formatDate(order.created_at, t)}
                      </p>
                    </div>
                    <p className="text-base font-semibold text-slate-950">
                      {formatCurrency(order.total, currency, t)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={getStatusTone(order.fulfillment_status)} dot>
                      {getStatusLabel(order.fulfillment_status, t)}
                    </StatusBadge>
                    <StatusBadge tone={getStatusTone(order.payment_status)} dot>
                      {getStatusLabel(order.payment_status, t)}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/dashboard/store/orders?orderId=${order.id}`}>
                        {t("adminStore.overview.manageOrder")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminStore.overview.storeStatusTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.statusLabel")}</span>
              <StatusBadge tone={store?.is_active ? "success" : "warning"} dot>
                {store?.is_active ? t("adminStore.status.active") : t("adminStore.status.inactive")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.overview.visibilityLabel")}</span>
              <StatusBadge tone={isVisible ? "success" : "neutral"} dot>
                {isVisible ? t("adminStore.overview.visibilityVisible") : t("adminStore.overview.visibilityHidden")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.fulfillmentLabel")}</span>
              <span className="font-medium text-slate-900">{getFulfillmentModeLabel(store?.fulfillment_mode, t)}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.overview.operationalNotesTitle")}
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {!store?.is_active ? (
                  <p>{t("adminStore.overview.noteInactive")}</p>
                ) : null}
                {!publicStoreUrl ? (
                  <p>{t("adminStore.overview.noteMissingUrl")}</p>
                ) : null}
                {products.length === 0 ? (
                  <p>{t("adminStore.overview.noteNoProducts")}</p>
                ) : null}
                {categoryCount === 0 ? (
                  <p>{t("adminStore.overview.noteNoCategories")}</p>
                ) : null}
                {store?.is_active && publicStoreUrl && products.length > 0 && categoryCount > 0 ? (
                  <p>{t("adminStore.overview.noteHealthy")}</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
