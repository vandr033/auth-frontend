"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  CalendarRange,
  ExternalLink,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  ReceiptText,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  getAdminCommerceMetrics,
  getAdminCommerceOrder,
  getAdminCommerceStore,
  listAdminCommerceAssignableStaff,
  listAdminCommerceOrders,
  updateAdminCommerceOrderAssignment,
  updateAdminCommerceOrderDeliveryCost,
  updateAdminCommerceOrderNotes,
  updateAdminCommerceOrderStatus,
  type AdminCommerceAssignableStaff,
  type AdminCommerceMetrics,
  type AdminCommerceOrder,
  type AdminCommerceStore,
} from "@/app/admin/lib/adminCommerceApi";
import type { AppApiError } from "@/lib/api-error";
import {
  AdminMetricGrid,
  DataTable,
  DataToolbar,
  EmptyState,
  ErrorBanner,
  ErrorState,
  StatCard,
  StatusBadge,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { StoreOrdersCalendarView } from "@/components/admin/store/StoreOrdersCalendarView";

type StoreOrdersManagerProps = {
  limit?: number;
  compact?: boolean;
};

type FiltersState = {
  search: string;
  fulfillmentStatus: string;
  fulfillmentType: string;
  paymentStatus: string;
  from: string;
  to: string;
};

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  fulfillmentStatus: "ALL",
  fulfillmentType: "ALL",
  paymentStatus: "ALL",
  from: "",
  to: "",
};

const DEFAULT_PAYMENT_STATUSES = [
  "PENDING_REVIEW",
  "AWAITING_DELIVERY_COST",
  "AWAITING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_REJECTED",
  "REFUNDED",
  "CANCELLED",
];

const DEFAULT_FULFILLMENT_STATUSES = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const DEFAULT_FULFILLMENT_TYPES = ["PICKUP", "DELIVERY"];

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

function formatDate(
  value: string | null | undefined,
  t: ReturnType<typeof useT>,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return t("adminStore.orders.noDate");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("adminStore.orders.noDate");

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

function getStatusTone(status?: string | null) {
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
    case "NEW":
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

function getStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  if (!status) return t("adminStore.orders.noStatus");
  const key = `adminStore.statusLabels.${status}`;
  const translated = t(key);
  return translated === key ? status.replaceAll("_", " ") : translated;
}

function getFulfillmentTypeLabel(type: string | null | undefined, t: ReturnType<typeof useT>) {
  const key = type ? `adminStore.orders.fulfillmentTypes.${type}` : "";
  const translated = key ? t(key) : "";
  return key && translated !== key ? translated : type || t("adminStore.orders.notDefined");
}

function getPaymentMethodLabel(method: string | null | undefined, t: ReturnType<typeof useT>) {
  const key = method ? `adminStore.orders.paymentMethods.${method}` : "";
  const translated = key ? t(key) : "";
  return key && translated !== key ? translated : method || t("adminStore.orders.notDefined");
}

function isOpenOrder(order: AdminCommerceOrder) {
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

function parseInputAmount(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function formatCustomerPhone(phone?: string | null, prefix?: string | null) {
  const cleanPhone = (phone ?? "").trim();
  if (!cleanPhone) return "";
  const cleanPrefix = (prefix ?? "").replace(/\D/g, "");
  return cleanPrefix ? `+${cleanPrefix} ${cleanPhone}` : cleanPhone;
}

function buildCustomerPhoneDigits(phone?: string | null, prefix?: string | null) {
  return `${(prefix ?? "").replace(/\D/g, "")}${(phone ?? "").replace(/\D/g, "")}`;
}

function mergeOrder(base: AdminCommerceOrder, next: AdminCommerceOrder): AdminCommerceOrder {
  return {
    ...base,
    ...next,
    items: next.items ?? base.items,
    pickup_point: next.pickup_point ?? base.pickup_point,
    assigned_staff: next.assigned_staff ?? base.assigned_staff,
    customer_profile: next.customer_profile ?? base.customer_profile,
    status_history: next.status_history ?? base.status_history,
  };
}

function buildStatusOptions(values: string[], source: AdminCommerceOrder[], key: "payment_status" | "fulfillment_status") {
  const merged = new Set(values);
  source.forEach((order) => {
    const value = order[key];
    if (typeof value === "string" && value.length > 0) {
      merged.add(value);
    }
  });
  return Array.from(merged);
}

function buildFulfillmentTypeOptions(source: AdminCommerceOrder[]) {
  const merged = new Set(DEFAULT_FULFILLMENT_TYPES);
  source.forEach((order) => {
    if (typeof order.fulfillment_type === "string" && order.fulfillment_type.length > 0) {
      merged.add(order.fulfillment_type);
    }
  });
  return Array.from(merged);
}

function matchesDateRange(value: string | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);
    if (date > toDate) return false;
  }

  return true;
}

function renderHistoryChange(
  label: string,
  previousValue: string | null | undefined,
  nextValue: string | null | undefined,
  t: ReturnType<typeof useT>,
) {
  if (!previousValue && !nextValue) return null;

  const previous = getStatusLabel(previousValue, t);
  const next = getStatusLabel(nextValue, t);

  return (
    <p className="text-sm text-slate-600">
      <span className="font-medium text-slate-900">{label}:</span>{" "}
      {previousValue && nextValue && previousValue !== nextValue ? `${previous} -> ${next}` : next}
    </p>
  );
}

function OrderMetaRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export function StoreOrdersManager({ limit, compact = false }: StoreOrdersManagerProps) {
  const t = useT();
  const searchParams = useSearchParams();
  const { companyUser, user } = useAdminAuth();
  const currency = companyUser?.company?.currency ?? null;
  const canViewMetrics =
    Boolean(user?.is_super_admin) ||
    companyUser?.company?.capabilities?.productCapabilities?.COMMERCE_METRICS === true;
  const preferredOrderId = searchParams?.get("orderId");

  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<AdminCommerceOrder[]>([]);
  const [store, setStore] = React.useState<AdminCommerceStore | null>(null);
  const [metrics, setMetrics] = React.useState<AdminCommerceMetrics | null>(null);
  const [assignableStaff, setAssignableStaff] = React.useState<AdminCommerceAssignableStaff[]>([]);
  const [assignmentEnabled, setAssignmentEnabled] = React.useState(true);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = React.useState<AdminCommerceOrder | null>(null);
  const [statusPayment, setStatusPayment] = React.useState("");
  const [statusFulfillment, setStatusFulfillment] = React.useState("");
  const [statusNote, setStatusNote] = React.useState("");
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [deliveryCost, setDeliveryCost] = React.useState("");
  const [deliveryNote, setDeliveryNote] = React.useState("");
  const [deliverySaving, setDeliverySaving] = React.useState(false);
  const [assignedStaffId, setAssignedStaffId] = React.useState("");
  const [assignmentNote, setAssignmentNote] = React.useState("");
  const [assignmentSaving, setAssignmentSaving] = React.useState(false);
  const [internalNotes, setInternalNotes] = React.useState("");
  const [notesSaving, setNotesSaving] = React.useState(false);

  // Delivery driver state
  const [driverMode, setDriverMode] = React.useState<"link" | "driver">("driver");
  const [driverLink, setDriverLink] = React.useState("");
  const [driverName, setDriverName] = React.useState("");
  const [driverPhone, setDriverPhone] = React.useState("");
  const [driverSending, setDriverSending] = React.useState(false);

  const syncOrder = React.useCallback((nextOrder: AdminCommerceOrder) => {
    setOrders((current) =>
      current.map((order) => (order.id === nextOrder.id ? mergeOrder(order, nextOrder) : order)),
    );
    setSelectedOrder((current) =>
      current?.id === nextOrder.id ? mergeOrder(current, nextOrder) : current,
    );
  }, []);

  const hydrateForms = React.useCallback((order: AdminCommerceOrder) => {
    setStatusPayment(order.payment_status ?? "");
    setStatusFulfillment(order.fulfillment_status ?? "");
    setStatusNote("");
    setDeliveryCost(order.delivery_cost != null ? String(order.delivery_cost) : "");
    setDeliveryNote("");
    setAssignedStaffId(order.assigned_staff?.id != null ? String(order.assigned_staff.id) : "");
    setAssignmentNote("");
    setInternalNotes(order.internal_notes ?? "");
  }, []);

  const refreshOrderDetail = React.useCallback(
    async (orderId: string, openSheet = false) => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        if (openSheet) {
          setSelectedOrderId(orderId);
          setDetailOpen(true);
        }
        const detail = await getAdminCommerceOrder(orderId);
        syncOrder(detail);
        setSelectedOrder(detail);
        hydrateForms(detail);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("adminStore.messages.loadFailed");
        setDetailError(message);
        notify.error(message);
      } finally {
        setDetailLoading(false);
      }
    },
    [hydrateForms, syncOrder, t],
  );

  const loadOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const nextOrders = await listAdminCommerceOrders();

      const [nextStore, nextMetrics, nextStaff] = await Promise.all([
        getAdminCommerceStore().catch(() => null),
        canViewMetrics
          ? getAdminCommerceMetrics().catch((metricsError: unknown) => {
              const appError = metricsError as AppApiError;
              if (appError?.status === 403 || appError?.capability === "COMMERCE_METRICS") {
                return null;
              }
              return null;
            })
          : Promise.resolve(null),
        listAdminCommerceAssignableStaff()
          .then((items) => ({ enabled: true, items }))
          .catch((staffError: unknown) => {
            const appError = staffError as AppApiError;
            if (appError?.status === 403 || appError?.capability === "COMMERCE_STAFF_ASSIGNMENT") {
              return { enabled: false, items: [] as AdminCommerceAssignableStaff[] };
            }
            throw staffError;
          }),
      ]);

      setOrders(nextOrders);
      setStore(nextStore);
      setMetrics(nextMetrics);
      setAssignableStaff(nextStaff.items);
      setAssignmentEnabled(nextStaff.enabled);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t("adminStore.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [canViewMetrics, t]);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handledPreferredOrderIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!preferredOrderId || loading || handledPreferredOrderIdRef.current === preferredOrderId) return;
    const exists = orders.some((order) => order.id === preferredOrderId);
    if (exists) {
      handledPreferredOrderIdRef.current = preferredOrderId;
      void refreshOrderDetail(preferredOrderId, true);
    }
  }, [loading, orders, preferredOrderId, refreshOrderDetail]);

  const paymentStatusOptions = React.useMemo(
    () => buildStatusOptions(DEFAULT_PAYMENT_STATUSES, orders, "payment_status"),
    [orders],
  );
  const fulfillmentStatusOptions = React.useMemo(
    () => buildStatusOptions(DEFAULT_FULFILLMENT_STATUSES, orders, "fulfillment_status"),
    [orders],
  );
  const fulfillmentTypeOptions = React.useMemo(
    () => buildFulfillmentTypeOptions(orders),
    [orders],
  );

  const filteredOrders = React.useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return orders.filter((order) => {
      if (
        normalizedSearch &&
        ![
          order.order_number,
          order.customer_name,
          formatCustomerPhone(order.customer_phone, order.customer_phone_prefix),
          order.assigned_staff?.display_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      ) {
        return false;
      }

      if (filters.fulfillmentStatus !== "ALL" && order.fulfillment_status !== filters.fulfillmentStatus) {
        return false;
      }

      if (filters.paymentStatus !== "ALL" && order.payment_status !== filters.paymentStatus) {
        return false;
      }

      if (filters.fulfillmentType !== "ALL" && order.fulfillment_type !== filters.fulfillmentType) {
        return false;
      }

      return matchesDateRange(order.created_at, filters.from, filters.to);
    });
  }, [filters, orders]);

  const visibleOrders = React.useMemo(() => {
    const prioritized = selectedOrderId
      ? [...filteredOrders].sort((left, right) => {
          if (left.id === selectedOrderId) return -1;
          if (right.id === selectedOrderId) return 1;
          return 0;
        })
      : filteredOrders;

    return limit ? prioritized.slice(0, limit) : prioritized;
  }, [filteredOrders, limit, selectedOrderId]);

  const hasActiveFilters = React.useMemo(
    () => Object.values(filters).some((value) => value.length > 0 && value !== "ALL"),
    [filters],
  );

  const orderStats = React.useMemo(() => {
    const openCount = orders.filter(isOpenOrder).length;
    const awaitingPaymentCount = orders.filter(
      (order) =>
        order.payment_status === "AWAITING_PAYMENT" || order.payment_status === "PAYMENT_SUBMITTED",
    ).length;
    const manualReviewCount = orders.filter(
      (order) => order.payment_status === "AWAITING_DELIVERY_COST" || order.fulfillment_status === "NEW",
    ).length;
    const confirmedRevenue =
      metrics?.totals.confirmedRevenue ??
      orders
        .filter((order) => order.payment_status === "PAYMENT_CONFIRMED")
        .reduce((sum, order) => sum + Number(order.total ?? order.subtotal ?? 0), 0);

    return {
      totalOrders: metrics?.totals.orders ?? orders.length,
      openCount,
      awaitingPaymentCount,
      manualReviewCount,
      confirmedRevenue,
    };
  }, [metrics, orders]);

  const selectedOrderSupportsManualDeliveryCost =
    selectedOrder?.fulfillment_type === "DELIVERY" && store?.delivery_cost_mode === "MANUAL";

  const statusChanged =
    selectedOrder != null &&
    (statusPayment !== selectedOrder.payment_status ||
      statusFulfillment !== selectedOrder.fulfillment_status ||
      statusNote.trim().length > 0);

  const deliveryChanged =
    selectedOrder != null &&
    selectedOrderSupportsManualDeliveryCost &&
    (deliveryCost.trim() !== String(selectedOrder.delivery_cost ?? "") || deliveryNote.trim().length > 0);

  const assignmentChanged =
    selectedOrder != null &&
    assignmentEnabled &&
    (assignedStaffId !== String(selectedOrder.assigned_staff?.id ?? "") || assignmentNote.trim().length > 0);

  const notesChanged = selectedOrder != null && internalNotes.trim() !== (selectedOrder.internal_notes ?? "").trim();

  const handleStatusSave = async () => {
    if (!selectedOrder) return;

    try {
      setStatusSaving(true);
      const updated = await updateAdminCommerceOrderStatus(selectedOrder.id, {
        payment_status: statusPayment || null,
        fulfillment_status: statusFulfillment || null,
        note: statusNote.trim() || null,
      });
      syncOrder(updated);
      notify.success(t("adminStore.orders.orderUpdated"));
      await refreshOrderDetail(selectedOrder.id);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.orders.orderUpdateFailed"));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeliveryCostSave = async () => {
    if (!selectedOrder) return;

  const amount = parseInputAmount(deliveryCost);
  if (!Number.isFinite(amount) || amount < 0) {
      notify.error(t("adminStore.orders.invalidDeliveryCost"));
      return;
  }

    try {
      setDeliverySaving(true);
      const updated = await updateAdminCommerceOrderDeliveryCost(selectedOrder.id, {
        deliveryCost: amount,
        note: deliveryNote.trim() || null,
      });
      syncOrder(updated);
      notify.success(t("adminStore.orders.deliveryUpdated"));
      await refreshOrderDetail(selectedOrder.id);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.orders.deliveryUpdateFailed"));
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleAssignmentSave = async () => {
    if (!selectedOrder) return;

    try {
      setAssignmentSaving(true);
      const updated = await updateAdminCommerceOrderAssignment(selectedOrder.id, {
        assignedStaffId: assignedStaffId ? Number(assignedStaffId) : null,
        note: assignmentNote.trim() || null,
      });
      syncOrder(updated);
      notify.success(t("adminStore.orders.assignmentUpdated"));
      await refreshOrderDetail(selectedOrder.id);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.orders.assignmentUpdateFailed"));
    } finally {
      setAssignmentSaving(false);
    }
  };

  const handleNotesSave = async () => {
    if (!selectedOrder) return;

    try {
      setNotesSaving(true);
      const updated = await updateAdminCommerceOrderNotes(selectedOrder.id, {
        internal_notes: internalNotes.trim() || null,
      });
      syncOrder(updated);
      notify.success(t("adminStore.orders.notesUpdated"));
      await refreshOrderDetail(selectedOrder.id);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t("adminStore.orders.notesUpdateFailed"));
    } finally {
      setNotesSaving(false);
    }
  };

  const buildDriverWaUrl = (phone: string, message: string) => {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  const handleSendDriverMessages = () => {
    if (!selectedOrder) return;
    setDriverSending(true);

    const orderNum = selectedOrder.order_number;
    const address = selectedOrder.delivery_address || t("adminStore.orders.noAddress");
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    const clientPhone = buildCustomerPhoneDigits(
      selectedOrder.customer_phone,
      selectedOrder.customer_phone_prefix,
    );
    const clientName = selectedOrder.customer_name;

    if (driverMode === "link") {
      // Just open the tracking link
      if (driverLink.trim()) {
        window.open(driverLink.trim(), "_blank", "noopener,noreferrer");
      } else {
        notify.error(t("adminStore.orders.driver.linkRequired") ?? "Ingresa el enlace de seguimiento.");
        setDriverSending(false);
        return;
      }
    } else {
      // Driver mode: send WA to driver and client
      const driverPhoneDigits = driverPhone.replace(/\D/g, "");
      if (!driverPhoneDigits) {
        notify.error(t("adminStore.orders.driver.phoneRequired") ?? "Ingresa el teléfono del repartidor.");
        setDriverSending(false);
        return;
      }

      // Message to driver
      const driverMsg = [
        `📦 *Pedido ${orderNum}*`,
        `👤 Cliente: ${clientName}`,
        clientPhone ? `📱 Tel. cliente: https://wa.me/${clientPhone}` : null,
        `📍 Dirección: ${address}`,
        `🗺️ Google Maps: ${googleMapsUrl}`,
        selectedOrder.delivery_notes ? `📋 Notas: ${selectedOrder.delivery_notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      // Message to client
      const driverWaUrl = `https://wa.me/${driverPhoneDigits}`;
      const clientMsg = [
        `🚚 Tu pedido *${orderNum}* está en camino.`,
        driverName.trim() ? `👤 Repartidor: ${driverName.trim()}` : null,
        `📱 Contactar al repartidor: ${driverWaUrl}`,
      ]
        .filter(Boolean)
        .join("\n");

      window.open(buildDriverWaUrl(driverPhoneDigits, driverMsg), "_blank", "noopener,noreferrer");

      if (clientPhone) {
        setTimeout(() => {
          window.open(buildDriverWaUrl(clientPhone, clientMsg), "_blank", "noopener,noreferrer");
        }, 500);
      }
    }

    notify.success(t("adminStore.orders.driver.sent") ?? "Mensajes preparados.");
    setDriverSending(false);
  };

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="admin-card h-28 animate-pulse bg-slate-100" />)}</div>;
  }

  if (!compact && orders.length === 0) {
    return (
      <div className="space-y-4">
        {loadError ? <ErrorBanner description={loadError} /> : null}
        <EmptyState
          icon={ShoppingBag}
          title={t("adminStore.orders.empty")}
          description={t("adminStore.overview.emptyOrdersDescription")}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {loadError ? <ErrorBanner description={loadError} /> : null}

        {!compact ? (
          <>
            <AdminMetricGrid>
              <StatCard
                label={t("adminStore.orders.totalOrders")}
                value={orderStats.totalOrders}
                hint={t("adminStore.orders.totalOrdersHint")}
                icon={<ReceiptText className="h-5 w-5" />}
              />
              <StatCard
                label={t("adminStore.orders.openOrders")}
                value={orderStats.openCount}
                hint={t("adminStore.orders.openOrdersHint")}
                icon={<Package className="h-5 w-5" />}
              />
              <StatCard
                label={t("adminStore.orders.awaitingPayment")}
                value={orderStats.awaitingPaymentCount}
                hint={t("adminStore.orders.awaitingPaymentHint")}
                icon={<Wallet className="h-5 w-5" />}
              />
              <StatCard
                label={t("adminStore.orders.confirmedRevenue")}
                value={formatCurrency(orderStats.confirmedRevenue, currency, t)}
                hint={t("adminStore.orders.confirmedRevenueHint")}
                icon={<Truck className="h-5 w-5" />}
              />
            </AdminMetricGrid>

            <DataToolbar
              searchValue={filters.search}
              searchPlaceholder={t("adminStore.orders.searchPlaceholder")}
              onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              summary={
                filteredOrders.length === 1
                  ? t("adminStore.orders.visibleSummaryOne", { count: filteredOrders.length })
                  : t("adminStore.orders.visibleSummaryOther", { count: filteredOrders.length })
              }
              filters={
                <>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={filters.fulfillmentStatus}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, fulfillmentStatus: event.target.value }))
                    }
                  >
                    <option value="ALL">{t("adminStore.orders.allStatuses")}</option>
                    {fulfillmentStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status, t)}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={filters.fulfillmentType}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, fulfillmentType: event.target.value }))
                    }
                  >
                    <option value="ALL">{t("adminStore.orders.allTypes")}</option>
                    {fulfillmentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {getFulfillmentTypeLabel(type, t)}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={filters.paymentStatus}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, paymentStatus: event.target.value }))
                    }
                  >
                    <option value="ALL">{t("adminStore.orders.allPayments")}</option>
                    {paymentStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status, t)}
                      </option>
                    ))}
                  </select>

                  <Input
                    type="date"
                    className="h-9 w-[148px]"
                    value={filters.from}
                    onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                  />
                  <Input
                    type="date"
                    className="h-9 w-[148px]"
                    value={filters.to}
                    onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                  />
                </>
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    className={viewMode === "list" ? "bg-admin-brand text-white hover:bg-admin-brand/90" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    {t("common.list")}
                  </Button>
                  <Button
                    variant={viewMode === "calendar" ? "default" : "outline"}
                    className={viewMode === "calendar" ? "bg-admin-brand text-white hover:bg-admin-brand/90" : ""}
                    onClick={() => setViewMode("calendar")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {t("common.calendar")}
                  </Button>
                  {hasActiveFilters ? (
                    <Button
                      variant="outline"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                    >
                      {t("adminStore.orders.clearFilters")}
                    </Button>
                  ) : null}
                </div>
              }
            />
          </>
        ) : null}

        {orders.length > 0 && visibleOrders.length === 0 && !compact ? (
          <EmptyState
            icon={CalendarRange}
            title={t("adminStore.orders.emptyFilteredTitle")}
            description={t("adminStore.orders.emptyFilteredDescription")}
          />
        ) : viewMode === "calendar" && !compact ? (
          <StoreOrdersCalendarView
            orders={filteredOrders}
            onOrderClick={(order) => void refreshOrderDetail(order.id, true)}
          />
        ) : (
          <DataTable
            className={cn(compact && "border-none shadow-none")}
            columns={[
              {
                key: "order",
                header: t("adminStore.table.order"),
                cell: (order) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{order.order_number}</p>
                    <p className="text-xs text-slate-500">{formatDate(order.created_at, t)}</p>
                  </div>
                ),
              },
              {
                key: "customer",
                header: t("adminStore.table.customer"),
                cell: (order) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatCustomerPhone(order.customer_phone, order.customer_phone_prefix) || t("adminStore.orders.noPhone")}
                    </p>
                  </div>
                ),
              },
              {
                key: "fulfillmentType",
                header: t("adminStore.table.type"),
                cell: (order) => (
                  <span className="text-sm text-slate-700">{getFulfillmentTypeLabel(order.fulfillment_type, t)}</span>
                ),
                className: "w-28",
              },
              {
                key: "fulfillmentStatus",
                header: t("adminStore.table.status"),
                cell: (order) => (
                  <StatusBadge tone={getStatusTone(order.fulfillment_status)} dot>
                    {getStatusLabel(order.fulfillment_status, t)}
                  </StatusBadge>
                ),
                className: "w-44",
              },
              {
                key: "paymentMethod",
                header: t("adminStore.table.method"),
                cell: (order) => (
                  <span className="text-sm text-slate-700">{getPaymentMethodLabel(order.payment_method, t)}</span>
                ),
                className: "w-28",
              },
              {
                key: "paymentStatus",
                header: t("adminStore.table.payment"),
                cell: (order) => (
                  <StatusBadge tone={getStatusTone(order.payment_status)} dot>
                    {getStatusLabel(order.payment_status, t)}
                  </StatusBadge>
                ),
                className: "w-44",
              },
              {
                key: "total",
                header: t("adminStore.table.total"),
                cell: (order) => (
                  <span className="font-medium text-slate-900">{formatCurrency(order.total, currency, t)}</span>
                ),
                className: "w-32",
              },
              {
                key: "assignedStaff",
                header: t("adminStore.table.staff"),
                cell: (order) => (
                  <span className="text-sm text-slate-700">
                    {order.assigned_staff?.display_name || t("adminStore.orders.noAssignee")}
                  </span>
                ),
                className: "w-36",
              },
              {
                key: "actions",
                header: t("adminStore.table.actions"),
                cell: (order) => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refreshOrderDetail(order.id, true)}
                  >
                    {t("adminStore.orders.actions.viewDetail")}
                  </Button>
                ),
                className: "w-32",
              },
            ]}
            data={visibleOrders}
            getRowKey={(order) => order.id}
            renderMobileItem={(order) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{order.order_number}</p>
                    <p className="text-sm text-slate-500">{order.customer_name}</p>
                    <p className="text-sm text-slate-500">
                      {formatCustomerPhone(order.customer_phone, order.customer_phone_prefix) || t("adminStore.orders.noPhone")}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(order.total, currency, t)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={getStatusTone(order.fulfillment_status)} dot>
                    {getStatusLabel(order.fulfillment_status, t)}
                  </StatusBadge>
                  <StatusBadge tone={getStatusTone(order.payment_status)} dot>
                    {getStatusLabel(order.payment_status, t)}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {getPaymentMethodLabel(order.payment_method, t)}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {getFulfillmentTypeLabel(order.fulfillment_type, t)}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                  <span>{formatDate(order.created_at, t)}</span>
                  <span>{order.assigned_staff?.display_name || t("adminStore.orders.noAssignee")}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshOrderDetail(order.id, true)}
                >
                  {t("adminStore.orders.actions.viewDetail")}
                </Button>
              </div>
            )}
            empty={t("adminStore.orders.empty")}
          />
        )}
      </div>

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailError(null);
            setSelectedOrderId(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="border-b border-slate-200 pb-4">
            <SheetTitle>{selectedOrder?.order_number || t("adminStore.orders.detailTitle")}</SheetTitle>
            <SheetDescription>
              {selectedOrder
                ? `${selectedOrder.customer_name} · ${formatDate(selectedOrder.created_at, t)}`
                : t("adminStore.orders.detailDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {detailLoading ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("adminStore.orders.detailLoading")}
              </div>
            ) : detailError ? (
              <ErrorState
                title={t("adminStore.orders.detailLoadErrorTitle")}
                description={detailError}
                icon={ReceiptText}
              />
            ) : selectedOrder ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-950">{selectedOrder.customer_name}</p>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={getStatusTone(selectedOrder.fulfillment_status)} dot>
                          {getStatusLabel(selectedOrder.fulfillment_status, t)}
                        </StatusBadge>
                        <StatusBadge tone={getStatusTone(selectedOrder.payment_status)} dot>
                          {getStatusLabel(selectedOrder.payment_status, t)}
                        </StatusBadge>
                        <StatusBadge tone="neutral">
                          {getFulfillmentTypeLabel(selectedOrder.fulfillment_type, t)}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStore.orders.labels.total")}</p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">
                        {formatCurrency(selectedOrder.total, currency, t)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.customer")}</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <OrderMetaRow label={t("adminStore.orders.labels.name")} value={selectedOrder.customer_name} />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.phone")}
                        value={formatCustomerPhone(selectedOrder.customer_phone, selectedOrder.customer_phone_prefix) || t("adminStore.orders.noPhone")}
                      />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.email")}
                        value={
                          selectedOrder.customer_email ||
                          selectedOrder.customer_profile?.user?.email ||
                          t("adminStore.orders.noEmail")
                        }
                      />
                      <OrderMetaRow label={t("adminStore.orders.labels.order")} value={selectedOrder.order_number} />
                    </div>
                    {selectedOrder.customer_notes ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {t("adminStore.orders.detailSections.customerNotes")}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{selectedOrder.customer_notes}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.deliveryAndPayment")}</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.fulfillmentType")}
                        value={getFulfillmentTypeLabel(selectedOrder.fulfillment_type, t)}
                      />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.scheduledFor")}
                        value={selectedOrder.scheduled_for ? formatDate(selectedOrder.scheduled_for, t) : t("adminStore.orders.labels.asap")}
                      />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.subtotal")}
                        value={formatCurrency(selectedOrder.subtotal, currency, t)}
                      />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.paymentMethod")}
                        value={getPaymentMethodLabel(selectedOrder.payment_method, t)}
                      />
                      <OrderMetaRow
                        label={t("adminStore.orders.labels.delivery")}
                        value={
                          selectedOrder.fulfillment_type === "DELIVERY"
                            ? formatCurrency(selectedOrder.delivery_cost, currency, t)
                            : t("adminStore.overview.notAvailable")
                        }
                      />
                    </div>

                    {selectedOrder.fulfillment_type === "PICKUP" && selectedOrder.pickup_point ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {t("adminStore.orders.detailSections.pickupPoint")}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.pickup_point.name}</p>
                        <p className="text-sm text-slate-600">
                          {selectedOrder.pickup_point.address || t("adminStore.orders.noAddress")}
                        </p>
                        {selectedOrder.pickup_point.instructions ? (
                          <p className="mt-2 text-sm text-slate-600">{selectedOrder.pickup_point.instructions}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedOrder.fulfillment_type === "DELIVERY" ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {t("adminStore.orders.detailSections.deliveryAddress")}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {selectedOrder.delivery_address || t("adminStore.orders.noAddress")}
                        </p>
                        {selectedOrder.delivery_notes ? (
                          <p className="mt-2 text-sm text-slate-600">{selectedOrder.delivery_notes}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {t("adminStore.orders.detailSections.paymentProof")}
                      </p>
                      {selectedOrder.payment_proof_url ? (
                        <a
                          href={selectedOrder.payment_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-sm font-medium text-admin-brand hover:underline"
                        >
                          {t("shopStore.viewSubmittedProof")}
                        </a>
                      ) : selectedOrder.payment_method !== "CASH" && selectedOrder.payment_status === "AWAITING_DELIVERY_COST" ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {t("adminStore.orders.pendingDeliveryCostProof")}
                        </p>
                      ) : selectedOrder.payment_method !== "CASH" && selectedOrder.payment_status === "AWAITING_PAYMENT" ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {t("adminStore.orders.pendingPaymentProof")}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">{t("adminStore.orders.noPaymentProof")}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.items")}</h3>
                    <p className="text-sm text-slate-500">
                      {(selectedOrder.items?.length ?? 0) === 1
                        ? t("adminStore.orders.itemCountOne", { count: selectedOrder.items?.length ?? 0 })
                        : t("adminStore.orders.itemCountOther", { count: selectedOrder.items?.length ?? 0 })}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{item.product_name_snapshot || t("shopStore.genericProduct")}</p>
                            <p className="text-sm text-slate-500">
                              {item.quantity} x {formatCurrency(item.unit_price_snapshot, currency, t)}
                            </p>
                            {item.promo_applied_snapshot && item.promo_label_snapshot ? (
                              <p className="mt-1 text-xs font-medium text-emerald-700">{item.promo_label_snapshot}</p>
                            ) : null}
                          </div>
                          <p className="font-semibold text-slate-900">{formatCurrency(item.total, currency, t)}</p>
                        </div>
                        {item.component_snapshots?.length ? (
                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {t("adminStore.orders.comboComponents")}
                            </p>
                            <div className="mt-2 space-y-1">
                              {item.component_snapshots.map((component) => (
                                <p key={component.id} className="text-sm text-slate-600">
                                  {component.component_name_snapshot} · {component.total_component_quantity} total
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.updateStatus")}</h3>
                      <StatusBadge tone={getStatusTone(selectedOrder.fulfillment_status)}>
                        {t("adminStore.status.active")}
                      </StatusBadge>
                    </div>
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">{t("adminStore.orders.labels.orderStatus")}</span>
                          <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={statusFulfillment}
                            onChange={(event) => setStatusFulfillment(event.target.value)}
                          >
                            {fulfillmentStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {getStatusLabel(status, t)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">{t("adminStore.orders.labels.paymentStatus")}</span>
                          <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={statusPayment}
                            onChange={(event) => setStatusPayment(event.target.value)}
                          >
                            {paymentStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {getStatusLabel(status, t)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">{t("adminStore.orders.labels.changeNote")}</span>
                        <textarea
                          className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          value={statusNote}
                          onChange={(event) => setStatusNote(event.target.value)}
                          placeholder={t("adminStore.orders.placeholders.statusNote")}
                        />
                      </label>
                      <Button onClick={() => void handleStatusSave()} disabled={!statusChanged || statusSaving}>
                        {statusSaving ? t("adminStore.orders.saving.status") : t("adminStore.orders.actions.saveStatus")}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.assignmentAndNotes")}</h3>
                      <StatusBadge tone={assignmentEnabled ? "neutral" : "warning"}>
                        {assignmentEnabled ? t("adminStore.orders.states.available") : t("adminStore.orders.states.notEnabled")}
                      </StatusBadge>
                    </div>
                    <div className="space-y-3">
                      {assignmentEnabled ? (
                        <>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">{t("adminStore.orders.labels.assignedStaff")}</span>
                            <select
                              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={assignedStaffId}
                              onChange={(event) => setAssignedStaffId(event.target.value)}
                            >
                              <option value="">{t("adminStore.orders.noAssignee")}</option>
                              {assignableStaff.map((staffMember) => (
                                <option key={staffMember.id} value={String(staffMember.id)}>
                                  {staffMember.display_name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">{t("adminStore.orders.labels.assignmentNote")}</span>
                            <textarea
                              className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              value={assignmentNote}
                              onChange={(event) => setAssignmentNote(event.target.value)}
                              placeholder={t("adminStore.orders.placeholders.assignmentNote")}
                            />
                          </label>
                          <Button
                            variant="outline"
                            onClick={() => void handleAssignmentSave()}
                            disabled={!assignmentChanged || assignmentSaving}
                          >
                            {assignmentSaving ? t("adminStore.orders.saving.assignment") : t("adminStore.orders.actions.saveAssignment")}
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-slate-600">
                          {t("adminStore.orders.assignmentDisabledHint")}
                        </p>
                      )}

                      <div className="border-t border-slate-200 pt-3">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">{t("adminStore.orders.labels.internalNotes")}</span>
                          <textarea
                            className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            value={internalNotes}
                            onChange={(event) => setInternalNotes(event.target.value)}
                            placeholder={t("adminStore.orders.placeholders.internalNotes")}
                          />
                        </label>
                        <Button
                          className="mt-3"
                          variant="outline"
                          onClick={() => void handleNotesSave()}
                          disabled={!notesChanged || notesSaving}
                        >
                          {notesSaving ? t("adminStore.orders.saving.notes") : t("adminStore.orders.actions.saveNotes")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {selectedOrder.fulfillment_type === "DELIVERY" ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-950">{t("adminStore.orders.driver.sectionTitle") ?? "Repartidor / Seguimiento"}</h3>
                      </div>
                    </div>

                    {/* Mode tabs */}
                    <div className="mb-4 flex rounded-xl border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setDriverMode("driver")}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          driverMode === "driver"
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        <Phone className="mr-1.5 inline h-3.5 w-3.5" />
                        {t("adminStore.orders.driver.driverTab") ?? "Tel. Repartidor"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverMode("link")}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          driverMode === "link"
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        <ExternalLink className="mr-1.5 inline h-3.5 w-3.5" />
                        {t("adminStore.orders.driver.linkTab") ?? "Enlace de seguimiento"}
                      </button>
                    </div>

                    {driverMode === "driver" ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">
                              {t("adminStore.orders.driver.driverName") ?? "Nombre repartidor"}
                            </span>
                            <input
                              type="text"
                              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                              value={driverName}
                              onChange={(e) => setDriverName(e.target.value)}
                              placeholder={t("adminStore.orders.driver.driverNamePlaceholder") ?? "Ej: Juan Pérez"}
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">
                              {t("adminStore.orders.driver.driverPhone") ?? "WhatsApp repartidor"}
                            </span>
                            <input
                              type="tel"
                              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                              value={driverPhone}
                              onChange={(e) => setDriverPhone(e.target.value)}
                              placeholder="+591 70000000"
                            />
                          </label>
                        </div>
                        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                          <p className="font-medium">{t("adminStore.orders.driver.driverModeHint") ?? "Se abrirán 2 chats de WhatsApp:"}</p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-blue-700">
                            <li>{t("adminStore.orders.driver.driverWillReceive") ?? "Al repartidor: datos del cliente, dirección y Google Maps"}</li>
                            <li>{t("adminStore.orders.driver.clientWillReceive") ?? "Al cliente: enlace de WhatsApp del repartidor"}</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => handleSendDriverMessages()}
                          disabled={driverSending || !driverPhone.replace(/\D/g, "")}
                          className="gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {driverSending
                            ? (t("adminStore.orders.driver.sending") ?? "Enviando...")
                            : (t("adminStore.orders.driver.sendMessages") ?? "Enviar mensajes")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">
                            {t("adminStore.orders.driver.trackingLink") ?? "Enlace de seguimiento"}
                          </span>
                          <input
                            type="url"
                            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                            value={driverLink}
                            onChange={(e) => setDriverLink(e.target.value)}
                            placeholder="https://tracking.example.com/..."
                          />
                        </label>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          {t("adminStore.orders.driver.linkModeHint") ?? "Se abrirá el enlace de seguimiento en una nueva pestaña."}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSendDriverMessages()}
                            disabled={driverSending || !driverLink.trim()}
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {t("adminStore.orders.driver.openLink") ?? "Abrir enlace"}
                          </Button>
                          {selectedOrder.customer_phone && driverLink.trim() ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const clientPhone = buildCustomerPhoneDigits(
                                  selectedOrder.customer_phone,
                                  selectedOrder.customer_phone_prefix,
                                );
                                const msg = `🚚 Tu pedido *${selectedOrder.order_number}* está en camino.\n🔗 Seguimiento: ${driverLink.trim()}`;
                                window.open(`https://wa.me/${clientPhone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                              }}
                              className="gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              {t("adminStore.orders.driver.notifyClientWithLink") ?? "Notificar al cliente"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </section>
                ) : null}

                {selectedOrder.fulfillment_type === "DELIVERY" ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">{t("adminStore.orders.detailSections.deliveryCost")}</h3>
                      <StatusBadge tone={selectedOrderSupportsManualDeliveryCost ? "warning" : "neutral"}>
                        {selectedOrderSupportsManualDeliveryCost ? t("adminStore.orders.states.editable") : t("adminStore.orders.states.readOnly")}
                      </StatusBadge>
                    </div>
                    {selectedOrderSupportsManualDeliveryCost ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">{t("adminStore.orders.labels.amount")}</span>
                            <Input
                              inputMode="decimal"
                              value={deliveryCost}
                              onChange={(event) => setDeliveryCost(event.target.value)}
                              placeholder="0.00"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">{t("adminStore.orders.labels.deliveryNote")}</span>
                            <textarea
                              className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              value={deliveryNote}
                              onChange={(event) => setDeliveryNote(event.target.value)}
                              placeholder={t("adminStore.orders.placeholders.deliveryNote")}
                            />
                          </label>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => void handleDeliveryCostSave()}
                          disabled={!deliveryChanged || deliverySaving}
                        >
                          {deliverySaving ? t("adminStore.orders.saving.delivery") : t("adminStore.orders.actions.updateDelivery")}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        {t("adminStore.orders.deliveryReadOnlyHint")}
                      </p>
                    )}
                  </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-4 font-semibold text-slate-950">{t("adminStore.orders.detailSections.history")}</h3>
                  {selectedOrder.status_history?.length ? (
                    <div className="space-y-3">
                      {selectedOrder.status_history.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {formatDate(entry.created_at, t)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("adminStore.title")}</p>
                          </div>
                          <div className="mt-2 space-y-1">
                            {renderHistoryChange(
                              t("adminStore.orders.labels.paymentHistory"),
                              entry.previous_payment_status,
                              entry.new_payment_status,
                              t,
                            )}
                            {renderHistoryChange(
                              t("adminStore.orders.labels.fulfillmentHistory"),
                              entry.previous_fulfillment_status,
                              entry.new_fulfillment_status,
                              t,
                            )}
                          </div>
                          {entry.note ? (
                            <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">{t("adminStore.orders.historyEmpty")}</p>
                  )}
                </section>
              </>
            ) : (
              <div className="flex min-h-56 items-center justify-center text-sm text-slate-500">
                {t("adminStore.orders.detailDescription")}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
