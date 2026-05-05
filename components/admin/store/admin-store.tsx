"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Boxes, CircleSlash, ExternalLink, MapPinned, Package, ReceiptText, Settings2, Shapes } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  createAdminCommerceCategory,
  createAdminCommerceProduct,
  deleteAdminCommerceStoreQr,
  getAdminCommerceStore,
  listAdminCommerceCategories,
  listAdminCommerceProducts,
  uploadAdminCommerceStoreQr,
  updateAdminCommerceStore,
  type AdminCommerceCategory,
  type AdminCommercePickupPoint,
  type AdminCommerceProduct,
  type AdminCommerceStore,
} from "@/app/admin/lib/adminCommerceApi";
import {
  AdminMetricGrid,
  AdminPageHeader,
  AdminPageShell,
  AdminTabNav,
  DataTable,
  EmptyState,
  ErrorBanner,
  ErrorState,
  LoadingSkeleton,
  StatCard,
  StatusBadge,
} from "@/components/admin/shared";
import { StoreOrdersManager as DedicatedStoreOrdersManager } from "@/components/admin/store/StoreOrdersPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { getImageUrl } from "@/utils/image-url";

type StoreSettingsFormState = {
  is_active: boolean;
  fulfillment_mode: AdminCommerceStore["fulfillment_mode"];
  scheduled_orders_enabled: boolean;
  min_preparation_minutes: string;
  max_schedule_days_ahead: string;
  order_slots_enabled: boolean;
  allow_cash_payment: boolean;
  allow_qr_payment: boolean;
  allow_manual_payment: boolean;
  payment_proof_required: boolean;
  payment_review_required: boolean;
  delivery_cost_mode: AdminCommerceStore["delivery_cost_mode"];
  fixed_delivery_cost: string;
  delivery_instructions: string;
  payment_instructions: string;
  pickup_points: PickupPointFormState[];
  order_schedule_slots: OrderScheduleSlotFormState[];
};

type PickupPointFormState = {
  local_id: string;
  id?: string;
  name: string;
  address: string;
  map_url: string;
  instructions: string;
  is_active: boolean;
};

type OrderScheduleSlotFormState = {
  local_id: string;
  id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type ProductFormState = {
  name: string;
  slug: string;
  price: string;
  stock_quantity: string;
  category_id: string;
  product_type: AdminCommerceProduct["product_type"];
};

const STORE_TABS = [
  { href: "/admin/dashboard/store", labelKey: "adminStore.nav.overview", roles: ["OWNER", "ADMIN"] as const },
  { href: "/admin/dashboard/store/orders", labelKey: "adminStore.nav.orders", roles: ["OWNER", "ADMIN", "STAFF"] as const },
  { href: "/admin/dashboard/store/products", labelKey: "adminStore.nav.products", roles: ["OWNER", "ADMIN"] as const },
  { href: "/admin/dashboard/store/points-of-sale", labelKey: "adminStore.nav.pointsOfSale", roles: ["OWNER", "ADMIN"] as const },
  { href: "/admin/dashboard/store/combos", labelKey: "adminStore.nav.combos", roles: ["OWNER", "ADMIN"] as const },
  { href: "/admin/dashboard/store/categories", labelKey: "adminStore.nav.categories", roles: ["OWNER", "ADMIN"] as const },
  { href: "/admin/dashboard/store/settings", labelKey: "adminStore.nav.settings", roles: ["OWNER", "ADMIN"] as const },
] as const;

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin/dashboard/store") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function makeLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPickupPointForm(point: AdminCommercePickupPoint, index: number): PickupPointFormState {
  return {
    local_id: point.id ?? `pickup-point-${index}`,
    id: point.id,
    name: point.name ?? "",
    address: point.address ?? "",
    map_url: point.map_url ?? "",
    instructions: point.instructions ?? "",
    is_active: point.is_active ?? true,
  };
}

function createEmptyPickupPoint(): PickupPointFormState {
  return {
    local_id: makeLocalId("pickup-point"),
    name: "",
    address: "",
    map_url: "",
    instructions: "",
    is_active: true,
  };
}

function getOrderScheduleSlotForm(
  slot: NonNullable<AdminCommerceStore["order_schedule_slots"]>[number],
  index: number,
): OrderScheduleSlotFormState {
  return {
    local_id: slot.id ?? `order-slot-${index}`,
    id: slot.id,
    day_of_week: String(slot.day_of_week ?? 1),
    start_time: slot.start_time ?? "09:00",
    end_time: slot.end_time ?? "18:00",
    is_active: slot.is_active ?? true,
  };
}

function createEmptyOrderScheduleSlot(): OrderScheduleSlotFormState {
  return {
    local_id: makeLocalId("order-slot"),
    day_of_week: "1",
    start_time: "09:00",
    end_time: "18:00",
    is_active: true,
  };
}

function getStoreSettingsForm(store: AdminCommerceStore): StoreSettingsFormState {
  return {
    is_active: store.is_active,
    fulfillment_mode: store.fulfillment_mode,
    scheduled_orders_enabled: store.scheduled_orders_enabled,
    min_preparation_minutes:
      store.min_preparation_minutes != null ? String(store.min_preparation_minutes) : "",
    max_schedule_days_ahead:
      store.max_schedule_days_ahead != null ? String(store.max_schedule_days_ahead) : "",
    order_slots_enabled: store.order_slots_enabled ?? false,
    allow_cash_payment: store.allow_cash_payment,
    allow_qr_payment: store.allow_qr_payment,
    allow_manual_payment: store.allow_manual_payment,
    payment_proof_required: store.payment_proof_required,
    payment_review_required: store.payment_review_required ?? true,
    delivery_cost_mode: store.delivery_cost_mode,
    fixed_delivery_cost: store.fixed_delivery_cost != null ? String(store.fixed_delivery_cost) : "",
    delivery_instructions: store.delivery_instructions ?? "",
    payment_instructions: store.payment_instructions ?? "",
    pickup_points: Array.isArray(store.pickup_points)
      ? store.pickup_points.map(getPickupPointForm)
      : [],
    order_schedule_slots: Array.isArray(store.order_schedule_slots)
      ? store.order_schedule_slots.map(getOrderScheduleSlotForm)
      : [],
  };
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function parseOptionalDecimal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function buildPublicStoreUrl(origin: string, slug: string | null) {
  if (!slug) return null;
  const path = `/shop/${slug}/store`;
  return origin ? `${origin}${path}` : path;
}

function getFulfillmentModeLabel(
  mode: AdminCommerceStore["fulfillment_mode"],
  t: ReturnType<typeof useT>,
) {
  switch (mode) {
    case "PICKUP_ONLY":
      return t("adminStore.settings.fulfillment.pickupOnly");
    case "DELIVERY_ONLY":
      return t("adminStore.settings.fulfillment.deliveryOnly");
    case "PICKUP_AND_DELIVERY":
      return t("adminStore.settings.fulfillment.both");
    default:
      return mode;
  }
}

function getDeliveryModeLabel(
  mode: AdminCommerceStore["delivery_cost_mode"],
  t: ReturnType<typeof useT>,
) {
  switch (mode) {
    case "MANUAL":
      return t("adminStore.settings.delivery.manual");
    case "FIXED":
      return t("adminStore.settings.delivery.fixed");
    default:
      return mode;
  }
}

function useStoreAccess() {
  const { companyId, companyUser, companySlug, role } = useAdminAuth();
  const capabilities = companyUser?.company?.capabilities?.productCapabilities;

  return {
    companyId,
    role,
    companySlug,
    currency: companyUser?.company?.currency ?? null,
    isOwnerOrAdmin: role === "OWNER" || role === "ADMIN",
    isStaff: role === "STAFF",
    canAccessStore: capabilities?.COMMERCE_ACCESS === true,
  };
}

function StoreAccessBoundary({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname() ?? "";
  const { isOwnerOrAdmin, isStaff, canAccessStore } = useStoreAccess();
  const staffAllowed = pathname === "/admin/dashboard/store/orders" || pathname.startsWith("/admin/dashboard/store/orders/");

  if (!isOwnerOrAdmin && !(isStaff && staffAllowed)) {
    return (
      <ErrorState
        icon={CircleSlash}
        title={t("adminStore.access.roleTitle")}
        description={t("adminStore.access.roleDescription")}
      />
    );
  }

  if (!canAccessStore) {
    return (
      <EmptyState
        icon={Package}
        title={t("adminStore.access.featureTitle")}
        description={t("adminStore.access.featureDescription")}
      />
    );
  }

  return <>{children}</>;
}

function StoreSectionHeader() {
  const t = useT();
  const pathname = usePathname() ?? "";
  const { companySlug, role } = useStoreAccess();
  const currentRole = role ?? "STAFF";

  return (
    <>
      <AdminPageHeader
        eyebrow={t("adminNav.store")}
        title={t("adminStore.title")}
        subtitle={t("adminStore.subtitle")}
        actions={
          companySlug ? (
            <Link href={`/shop/${companySlug}/store`} target="_blank">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t("adminStore.viewPublicStore")}
              </Button>
            </Link>
          ) : null
        }
      />
      <AdminTabNav
        items={STORE_TABS.filter((tab) => tab.roles.some((allowedRole) => allowedRole === currentRole)).map((tab) => ({
          key: tab.href,
          label: t(tab.labelKey),
          href: tab.href,
          active: isActiveRoute(pathname, tab.href),
        }))}
      />
    </>
  );
}

export function AdminStoreSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPageShell>
      <StoreSectionHeader />
      <StoreAccessBoundary>{children}</StoreAccessBoundary>
    </AdminPageShell>
  );
}

export function StoreLoadingState() {
  return <LoadingSkeleton variant="cards" rows={3} />;
}

export function StoreSettingsManager() {
  const t = useT();
  const qrInputRef = React.useRef<HTMLInputElement | null>(null);
  const { companyId, companySlug, currency } = useStoreAccess();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [store, setStore] = React.useState<AdminCommerceStore | null>(null);
  const [origin, setOrigin] = React.useState("");
  const [initialForm, setInitialForm] = React.useState<StoreSettingsFormState | null>(null);
  const [selectedQrFile, setSelectedQrFile] = React.useState<File | null>(null);
  const [selectedQrPreviewUrl, setSelectedQrPreviewUrl] = React.useState<string | null>(null);
  const [removeQrImage, setRemoveQrImage] = React.useState(false);
  const [form, setForm] = React.useState<StoreSettingsFormState>({
    is_active: true,
    fulfillment_mode: "PICKUP_AND_DELIVERY",
    scheduled_orders_enabled: false,
    min_preparation_minutes: "",
    max_schedule_days_ahead: "",
    order_slots_enabled: false,
    allow_cash_payment: true,
    allow_qr_payment: false,
    allow_manual_payment: false,
    payment_proof_required: true,
    payment_review_required: true,
    delivery_cost_mode: "MANUAL",
    fixed_delivery_cost: "",
    delivery_instructions: "",
    payment_instructions: "",
    pickup_points: [],
    order_schedule_slots: [],
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadStore = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const nextStore = await getAdminCommerceStore();
      const nextForm = getStoreSettingsForm(nextStore);
      setStore(nextStore);
      setForm(nextForm);
      setInitialForm(nextForm);
      setSelectedQrFile(null);
      setSelectedQrPreviewUrl(null);
      setRemoveQrImage(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.messages.loadFailed");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadStore();
  }, [loadStore]);

  const publicStoreUrl = React.useMemo(
    () => buildPublicStoreUrl(origin, companySlug),
    [companySlug, origin],
  );
  const canPickup =
    form.fulfillment_mode === "PICKUP_ONLY" || form.fulfillment_mode === "PICKUP_AND_DELIVERY";
  const publicVisibility = form.is_active && Boolean(publicStoreUrl);
  const supportsProofPayments = form.allow_qr_payment || form.allow_manual_payment;
  const qrPreviewUrl = removeQrImage
    ? null
    : selectedQrPreviewUrl ?? getImageUrl(store?.qr_image_url);

  React.useEffect(() => {
    if (!selectedQrFile) {
      setSelectedQrPreviewUrl(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedQrFile);
    setSelectedQrPreviewUrl(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedQrFile]);

  const isDirty = React.useMemo(() => {
    if (!initialForm) return false;
    return (
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      selectedQrFile !== null ||
      removeQrImage
    );
  }, [form, initialForm, removeQrImage, selectedQrFile]);

  const updateForm = <K extends keyof StoreSettingsFormState>(
    key: K,
    value: StoreSettingsFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updatePickupPoint = (
    localId: string,
    field: keyof Omit<PickupPointFormState, "local_id" | "id">,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      pickup_points: current.pickup_points.map((point) =>
        point.local_id === localId ? { ...point, [field]: value } : point,
      ),
    }));
  };

  const updateOrderScheduleSlot = (
    localId: string,
    field: keyof Omit<OrderScheduleSlotFormState, "local_id" | "id">,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      order_schedule_slots: current.order_schedule_slots.map((slot) =>
        slot.local_id === localId ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  const handleReset = () => {
    if (!initialForm) return;
    setForm(initialForm);
    setSelectedQrFile(null);
    setSelectedQrPreviewUrl(null);
    setRemoveQrImage(false);
    setLoadError(null);
  };

  const handleSave = async () => {
    const minPreparationMinutes = parseOptionalInteger(form.min_preparation_minutes);
    if (Number.isNaN(minPreparationMinutes)) {
      await notify.warning(t("adminStore.settings.minPreparationInvalid"));
      return;
    }

    const maxScheduleDaysAhead = parseOptionalInteger(form.max_schedule_days_ahead);
    if (Number.isNaN(maxScheduleDaysAhead)) {
      await notify.warning(t("adminStore.settings.maxScheduleInvalid"));
      return;
    }

    const fixedDeliveryCost =
      form.delivery_cost_mode === "FIXED"
        ? parseOptionalDecimal(form.fixed_delivery_cost)
        : null;
    if (Number.isNaN(fixedDeliveryCost)) {
      await notify.warning(t("adminStore.settings.fixedCostInvalid"));
      return;
    }

    if (form.delivery_cost_mode === "FIXED" && fixedDeliveryCost == null) {
      await notify.warning(t("adminStore.settings.fixedCostRequired"));
      return;
    }

    const hasInvalidPickupPoint = form.pickup_points.some((point) => !point.name.trim());
    if (hasInvalidPickupPoint) {
      await notify.warning(t("adminStore.settings.pickupNameRequired"));
      return;
    }

    const hasInvalidOrderSlot = form.order_schedule_slots.some((slot) => {
      const day = Number.parseInt(slot.day_of_week, 10);
      return (
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6 ||
        !slot.start_time.trim() ||
        !slot.end_time.trim() ||
        slot.start_time >= slot.end_time
      );
    });
    if (hasInvalidOrderSlot) {
      await notify.warning(t("adminStore.settings.orderSlotInvalid"));
      return;
    }

    try {
      setSaving(true);
      setLoadError(null);

      let qrImageUrl = store?.qr_image_url ?? null;
      if (selectedQrFile) {
        const uploadedQr = await uploadAdminCommerceStoreQr(selectedQrFile);
        qrImageUrl = uploadedQr.image_url;
      } else if (removeQrImage && store?.qr_image_url) {
        await deleteAdminCommerceStoreQr();
        qrImageUrl = null;
      }

      const updated = await updateAdminCommerceStore({
        is_active: form.is_active,
        fulfillment_mode: form.fulfillment_mode,
        scheduled_orders_enabled: form.scheduled_orders_enabled,
        min_preparation_minutes: minPreparationMinutes,
        max_schedule_days_ahead: maxScheduleDaysAhead,
        order_slots_enabled: form.order_slots_enabled,
        allow_cash_payment: form.allow_cash_payment,
        allow_qr_payment: form.allow_qr_payment,
        allow_manual_payment: form.allow_manual_payment,
        qr_image_url: qrImageUrl,
        payment_proof_required: form.payment_proof_required,
        payment_review_required: form.payment_review_required,
        delivery_cost_mode: form.delivery_cost_mode,
        fixed_delivery_cost: fixedDeliveryCost,
        delivery_instructions: form.delivery_instructions.trim() || null,
        payment_instructions: form.payment_instructions.trim() || null,
        pickup_points: form.pickup_points.map((point, index) => ({
          id: point.id,
          name: point.name.trim(),
          address: point.address.trim() || null,
          map_url: point.map_url.trim() || null,
          instructions: point.instructions.trim() || null,
          is_active: point.is_active,
          sort_order: index,
        })),
        order_schedule_slots: form.order_schedule_slots.map((slot, index) => ({
          id: slot.id,
          day_of_week: Number.parseInt(slot.day_of_week, 10),
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: slot.is_active,
          sort_order: index,
        })),
      });
      const nextForm = getStoreSettingsForm(updated);
      setStore(updated);
      setForm(nextForm);
      setInitialForm(nextForm);
      setSelectedQrFile(null);
      setSelectedQrPreviewUrl(null);
      setRemoveQrImage(false);
      notify.success(t("adminStore.messages.settingsSaved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.messages.saveFailed");
      setLoadError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <StoreLoadingState />;

  return (
    <div className="space-y-4 pb-28">
      {loadError ? <ErrorBanner description={loadError} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("adminStore.settings.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t("adminStore.settings.storeSectionTitle")}
                </h3>
                <p className="text-sm text-slate-600">{t("adminStore.settings.storeSectionDescription")}</p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <Label>{t("adminStore.settings.activeLabel")}</Label>
                  <p className="text-sm text-slate-500">{t("adminStore.settings.activeHint")}</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => updateForm("is_active", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-fulfillment-mode">{t("adminStore.settings.fulfillmentLabel")}</Label>
                <p className="text-sm text-slate-500">{t("adminStore.settings.fulfillmentHint")}</p>
                <select
                  id="store-fulfillment-mode"
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={form.fulfillment_mode}
                  onChange={(event) =>
                    updateForm(
                      "fulfillment_mode",
                      event.target.value as AdminCommerceStore["fulfillment_mode"],
                    )
                  }
                >
                  <option value="PICKUP_ONLY">{t("adminStore.settings.fulfillment.pickupOnly")}</option>
                  <option value="DELIVERY_ONLY">{t("adminStore.settings.fulfillment.deliveryOnly")}</option>
                  <option value="PICKUP_AND_DELIVERY">{t("adminStore.settings.fulfillment.both")}</option>
                </select>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t("adminStore.settings.deliverySectionTitle")}
                </h3>
                <p className="text-sm text-slate-600">
                  {t("adminStore.settings.deliverySectionDescription")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-delivery-cost-mode">
                  {t("adminStore.settings.deliveryModeLabel")}
                </Label>
                <select
                  id="store-delivery-cost-mode"
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={form.delivery_cost_mode}
                  onChange={(event) =>
                    updateForm(
                      "delivery_cost_mode",
                      event.target.value as AdminCommerceStore["delivery_cost_mode"],
                    )
                  }
                >
                  <option value="MANUAL">{t("adminStore.settings.delivery.manual")}</option>
                  <option value="FIXED">{t("adminStore.settings.delivery.fixed")}</option>
                </select>
              </div>

              {form.delivery_cost_mode === "FIXED" ? (
                <div className="space-y-2">
                  <Label htmlFor="store-fixed-delivery-cost">
                    {t("adminStore.settings.deliveryCostLabel")}
                  </Label>
                  <Input
                    id="store-fixed-delivery-cost"
                    value={form.fixed_delivery_cost}
                    onChange={(event) => updateForm("fixed_delivery_cost", event.target.value)}
                    placeholder={t("adminStore.settings.fixedCostPlaceholder")}
                    inputMode="decimal"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="store-delivery-instructions">
                  {t("adminStore.settings.deliveryInstructionsLabel")}
                </Label>
                <textarea
                  id="store-delivery-instructions"
                  className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                  value={form.delivery_instructions}
                  onChange={(event) => updateForm("delivery_instructions", event.target.value)}
                  placeholder={t("adminStore.settings.deliveryInstructionsPlaceholder")}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <Label>{t("adminStore.settings.scheduledOrdersLabel")}</Label>
                  <p className="text-sm text-slate-500">{t("adminStore.settings.scheduledOrdersHint")}</p>
                </div>
                <Switch
                  checked={form.scheduled_orders_enabled}
                  onCheckedChange={(checked) => updateForm("scheduled_orders_enabled", checked)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-min-preparation">
                    {t("adminStore.settings.minPreparationLabel")}
                  </Label>
                  <Input
                    id="store-min-preparation"
                    value={form.min_preparation_minutes}
                    onChange={(event) => updateForm("min_preparation_minutes", event.target.value)}
                    placeholder={t("adminStore.settings.minPreparationPlaceholder")}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-max-schedule-days">
                    {t("adminStore.settings.maxScheduleLabel")}
                  </Label>
                  <Input
                    id="store-max-schedule-days"
                    value={form.max_schedule_days_ahead}
                    onChange={(event) => updateForm("max_schedule_days_ahead", event.target.value)}
                    placeholder={t("adminStore.settings.maxSchedulePlaceholder")}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <Label>{t("adminStore.settings.orderSlotsEnabledLabel")}</Label>
                  <p className="text-sm text-slate-500">{t("adminStore.settings.orderSlotsEnabledHint")}</p>
                </div>
                <Switch
                  checked={form.order_slots_enabled}
                  onCheckedChange={(checked) => updateForm("order_slots_enabled", checked)}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{t("adminStore.settings.orderSlotsTitle")}</Label>
                  <p className="text-sm text-slate-500">
                    {form.order_slots_enabled
                      ? t("adminStore.settings.orderSlotsDescription")
                      : t("adminStore.settings.orderSlotsFallbackHint")}
                  </p>
                </div>

                {form.order_schedule_slots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {t("adminStore.settings.orderSlotsEmpty")}
                  </div>
                ) : null}

                {form.order_schedule_slots.map((slot, index) => (
                  <div key={slot.local_id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {t("adminStore.settings.orderSlotCardTitle", { index: index + 1 })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {slot.id ? slot.id : t("adminStore.settings.newOrderSlot")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{t("adminStore.settings.orderSlotActiveLabel")}</span>
                          <Switch
                            checked={slot.is_active}
                            onCheckedChange={(checked) =>
                              updateOrderScheduleSlot(slot.local_id, "is_active", checked)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              order_schedule_slots: current.order_schedule_slots.filter(
                                (entry) => entry.local_id !== slot.local_id,
                              ),
                            }))
                          }
                        >
                          {t("adminStore.settings.removeOrderSlot")}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`${slot.local_id}-day`}>
                          {t("adminStore.settings.orderSlotDayLabel")}
                        </Label>
                        <select
                          id={`${slot.local_id}-day`}
                          className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                          value={slot.day_of_week}
                          onChange={(event) =>
                            updateOrderScheduleSlot(slot.local_id, "day_of_week", event.target.value)
                          }
                        >
                          {Array.from({ length: 7 }).map((_, day) => (
                            <option key={day} value={String(day)}>
                              {t(
                                [
                                  "adminHours.sunday",
                                  "adminHours.monday",
                                  "adminHours.tuesday",
                                  "adminHours.wednesday",
                                  "adminHours.thursday",
                                  "adminHours.friday",
                                  "adminHours.saturday",
                                ][day],
                              )}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${slot.local_id}-start`}>
                          {t("adminStore.settings.orderSlotStartLabel")}
                        </Label>
                        <Input
                          id={`${slot.local_id}-start`}
                          type="time"
                          value={slot.start_time}
                          onChange={(event) =>
                            updateOrderScheduleSlot(slot.local_id, "start_time", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${slot.local_id}-end`}>
                          {t("adminStore.settings.orderSlotEndLabel")}
                        </Label>
                        <Input
                          id={`${slot.local_id}-end`}
                          type="time"
                          value={slot.end_time}
                          onChange={(event) =>
                            updateOrderScheduleSlot(slot.local_id, "end_time", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      order_schedule_slots: [...current.order_schedule_slots, createEmptyOrderScheduleSlot()],
                    }))
                  }
                >
                  {t("adminStore.settings.addOrderSlot")}
                </Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t("adminStore.settings.pickupPointsTitle")}
                </h3>
                <p className="text-sm text-slate-600">
                  {canPickup
                    ? t("adminStore.settings.pickupPointsDescription")
                    : t("adminStore.settings.pickupPointsDisabledHint")}
                </p>
              </div>

              <div className="space-y-3">
                {form.pickup_points.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {t("adminStore.settings.pickupPointsEmpty")}
                  </div>
                ) : null}

                {form.pickup_points.map((point, index) => (
                  <div key={point.local_id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {t("adminStore.settings.pickupPointCardTitle", { index: index + 1 })}
                        </p>
                        <p className="text-xs text-slate-500">{point.id ? point.id : t("adminStore.settings.newPickupPoint")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{t("adminStore.settings.pickupPointActiveLabel")}</span>
                          <Switch
                            checked={point.is_active}
                            onCheckedChange={(checked) =>
                              updatePickupPoint(point.local_id, "is_active", checked)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              pickup_points: current.pickup_points.filter(
                                (entry) => entry.local_id !== point.local_id,
                              ),
                            }))
                          }
                        >
                          {t("adminStore.settings.removePickupPoint")}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${point.local_id}-name`}>
                          {t("adminStore.settings.pickupPointNameLabel")}
                        </Label>
                        <Input
                          id={`${point.local_id}-name`}
                          value={point.name}
                          onChange={(event) =>
                            updatePickupPoint(point.local_id, "name", event.target.value)
                          }
                          placeholder={t("adminStore.settings.pickupPointNamePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${point.local_id}-address`}>
                          {t("adminStore.settings.pickupPointAddressLabel")}
                        </Label>
                        <Input
                          id={`${point.local_id}-address`}
                          value={point.address}
                          onChange={(event) =>
                            updatePickupPoint(point.local_id, "address", event.target.value)
                          }
                          placeholder={t("adminStore.settings.pickupPointAddressPlaceholder")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${point.local_id}-map`}>
                        {t("adminStore.settings.pickupPointMapLabel")}
                      </Label>
                      <Input
                        id={`${point.local_id}-map`}
                        value={point.map_url}
                        onChange={(event) =>
                          updatePickupPoint(point.local_id, "map_url", event.target.value)
                        }
                        placeholder={t("adminStore.settings.pickupPointMapPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${point.local_id}-instructions`}>
                        {t("adminStore.settings.pickupPointInstructionsLabel")}
                      </Label>
                      <textarea
                        id={`${point.local_id}-instructions`}
                        className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                        value={point.instructions}
                        onChange={(event) =>
                          updatePickupPoint(point.local_id, "instructions", event.target.value)
                        }
                        placeholder={t("adminStore.settings.pickupPointInstructionsPlaceholder")}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    pickup_points: [...current.pickup_points, createEmptyPickupPoint()],
                  }))
                }
              >
                {t("adminStore.settings.addPickupPoint")}
              </Button>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t("adminStore.settings.displaySectionTitle")}
                </h3>
                <p className="text-sm text-slate-600">
                  {t("adminStore.settings.displaySectionDescription")}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t("adminStore.settings.publicUrlLabel")}
                  </p>
                  {publicStoreUrl ? (
                    <Link
                      href={`/shop/${companySlug}/store`}
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-2 break-all text-sm text-admin-brand hover:underline"
                    >
                      <span>{publicStoreUrl}</span>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      {t("adminStore.settings.publicUrlUnavailable")}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t("adminStore.settings.currencyLabel")}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {currency || t("adminStore.settings.currencyUnavailable")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {t("adminStore.settings.visibilityLabel")}
                    </p>
                    <p className="text-sm text-slate-500">{t("adminStore.settings.visibilityHint")}</p>
                  </div>
                  <StatusBadge tone={publicVisibility ? "success" : "neutral"} dot>
                    {publicVisibility
                      ? t("adminStore.overview.visibilityVisible")
                      : t("adminStore.overview.visibilityHidden")}
                  </StatusBadge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-payment-instructions">
                  {t("adminStore.settings.checkoutInstructionsLabel")}
                </Label>
                <textarea
                  id="store-payment-instructions"
                  className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                  value={form.payment_instructions}
                  onChange={(event) => updateForm("payment_instructions", event.target.value)}
                  placeholder={t("adminStore.settings.checkoutInstructionsPlaceholder")}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t("adminStore.settings.paymentMethodsTitle")}
                </h3>
                <p className="text-sm text-slate-600">
                  {t("adminStore.settings.paymentMethodsDescription")}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="space-y-1">
                    <Label>{t("adminStore.settings.paymentMethods.cashLabel")}</Label>
                    <p className="text-sm text-slate-500">{t("adminStore.settings.paymentMethods.cashHint")}</p>
                  </div>
                  <Switch
                    checked={form.allow_cash_payment}
                    onCheckedChange={(checked) => updateForm("allow_cash_payment", checked)}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="space-y-1">
                    <Label>{t("adminStore.settings.paymentMethods.qrLabel")}</Label>
                    <p className="text-sm text-slate-500">{t("adminStore.settings.paymentMethods.qrHint")}</p>
                  </div>
                  <Switch
                    checked={form.allow_qr_payment}
                    onCheckedChange={(checked) => updateForm("allow_qr_payment", checked)}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="space-y-1">
                    <Label>{t("adminStore.settings.paymentMethods.manualLabel")}</Label>
                    <p className="text-sm text-slate-500">{t("adminStore.settings.paymentMethods.manualHint")}</p>
                  </div>
                  <Switch
                    checked={form.allow_manual_payment}
                    onCheckedChange={(checked) => updateForm("allow_manual_payment", checked)}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1">
                  <Label>{t("adminStore.settings.qrImageLabel")}</Label>
                  <p className="text-sm text-slate-500">
                    {form.allow_qr_payment
                      ? t("adminStore.settings.qrImageHint")
                      : t("adminStore.settings.qrImageDisabledHint")}
                  </p>
                </div>

                {removeQrImage ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {t("adminStore.settings.qrImageRemoved")}
                  </div>
                ) : qrPreviewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrPreviewUrl}
                      alt={t("adminStore.settings.qrImagePreviewAlt")}
                      className="mx-auto max-h-64 rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {t("adminStore.settings.qrImageEmpty")}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      if (!nextFile) return;
                      setSelectedQrFile(nextFile);
                      setRemoveQrImage(false);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => qrInputRef.current?.click()}
                  >
                    {selectedQrFile
                      ? t("adminStore.settings.replaceQrImage")
                      : t("adminStore.settings.uploadQrImage")}
                  </Button>
                  {(selectedQrFile || store?.qr_image_url) && !removeQrImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        setSelectedQrFile(null);
                        setSelectedQrPreviewUrl(null);
                        setRemoveQrImage(true);
                      }}
                    >
                      {t("adminStore.settings.removeQrImage")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="space-y-1">
                    <Label>{t("adminStore.settings.paymentProofLabel")}</Label>
                    <p className="text-sm text-slate-500">
                      {t("adminStore.settings.paymentProofHint")}
                    </p>
                  </div>
                  <Switch
                    checked={form.payment_proof_required}
                    onCheckedChange={(checked) => updateForm("payment_proof_required", checked)}
                    disabled={!supportsProofPayments}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="space-y-1">
                    <Label>{t("adminStore.settings.paymentReviewLabel")}</Label>
                    <p className="text-sm text-slate-500">
                      {t("adminStore.settings.paymentReviewHint")}
                    </p>
                  </div>
                  <Switch
                    checked={form.payment_review_required}
                    onCheckedChange={(checked) => updateForm("payment_review_required", checked)}
                    disabled={!supportsProofPayments}
                  />
                </div>
              </div>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminStore.settings.summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.statusLabel")}</span>
              <StatusBadge tone={form.is_active ? "success" : "warning"} dot>
                {form.is_active ? t("adminStore.status.active") : t("adminStore.status.inactive")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.visibilityLabel")}</span>
              <StatusBadge tone={publicVisibility ? "success" : "neutral"} dot>
                {publicVisibility
                  ? t("adminStore.overview.visibilityVisible")
                  : t("adminStore.overview.visibilityHidden")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.fulfillmentLabel")}</span>
              <span className="font-medium text-slate-900">
                {getFulfillmentModeLabel(form.fulfillment_mode, t)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.deliveryModeLabel")}</span>
              <span className="font-medium text-slate-900">
                {getDeliveryModeLabel(form.delivery_cost_mode, t)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.scheduleSummaryLabel")}</span>
              <StatusBadge tone={form.scheduled_orders_enabled ? "success" : "neutral"} dot>
                {form.scheduled_orders_enabled ? t("common.enabled") : t("common.disabled")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.pickupPointsSummaryLabel")}</span>
              <span className="font-medium text-slate-900">{form.pickup_points.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.paymentMethods.cashLabel")}</span>
              <StatusBadge tone={form.allow_cash_payment ? "success" : "neutral"} dot>
                {form.allow_cash_payment ? t("common.enabled") : t("common.disabled")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.paymentMethods.qrLabel")}</span>
              <StatusBadge tone={form.allow_qr_payment ? "success" : "neutral"} dot>
                {form.allow_qr_payment ? t("common.enabled") : t("common.disabled")}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
              <span>{t("adminStore.settings.paymentMethods.manualLabel")}</span>
              <StatusBadge tone={form.allow_manual_payment ? "success" : "neutral"} dot>
                {form.allow_manual_payment ? t("common.enabled") : t("common.disabled")}
              </StatusBadge>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.settings.publicUrlLabel")}
              </p>
              {publicStoreUrl ? (
                <Link
                  href={`/shop/${companySlug}/store`}
                  target="_blank"
                  className="mt-2 inline-flex items-center gap-2 break-all text-sm font-medium text-admin-brand hover:underline"
                >
                  <span>{publicStoreUrl}</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  {t("adminStore.settings.publicUrlUnavailable")}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.settings.currencyLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {currency || t("adminStore.settings.currencyUnavailable")}
              </p>
            </div>
            {store ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {t("adminStore.settings.storeIdLabel")}: {store.id}
                {companyId ? ` · ${t("adminStore.settings.companyIdLabel")}: ${companyId}` : ""}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <StickyFormActions
        onSave={() => void handleSave()}
        onCancel={handleReset}
        loading={saving}
        disabled={!isDirty}
        saveLabel={t("common.save")}
        loadingLabel={t("common.saving")}
        cancelLabel={t("adminStore.settings.resetAction")}
        statusLabel={
          isDirty
            ? t("adminStore.settings.unsavedChanges")
            : t("adminStore.settings.allChangesSaved")
        }
        statusTone={isDirty ? "dirty" : "success"}
      />
    </div>
  );
}

export function StoreCategoriesManager() {
  const t = useT();
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<AdminCommerceCategory[]>([]);
  const [form, setForm] = React.useState({ name: "", slug: "" });

  const loadCategories = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setCategories(await listAdminCommerceCategories());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t("adminStore.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const created = await createAdminCommerceCategory(form);
      setCategories((current) => [...current, created]);
      setForm({ name: "", slug: "" });
      notify.success(t("adminStore.messages.categoryCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.messages.createFailed");
      setLoadError(message);
      notify.error(message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <StoreLoadingState />;

  return (
    <div className="space-y-4">
      {loadError ? <ErrorBanner description={loadError} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("adminStore.categories.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("adminStore.categories.namePlaceholder")}
            />
            <Input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder={t("adminStore.categories.slugPlaceholder")}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void handleCreate()}
            disabled={creating || !form.name.trim() || !form.slug.trim()}
          >
            {creating ? t("common.creating") : t("adminStore.categories.createAction")}
          </Button>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          {
            key: "name",
            header: t("adminStore.table.category"),
            cell: (category) => (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{category.name}</p>
                <p className="text-xs text-slate-500">{category.slug}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: t("adminStore.table.status"),
            cell: (category) => (
              <StatusBadge tone={category.is_active === false ? "warning" : "success"} dot>
                {category.is_active === false ? t("adminStore.status.inactive") : t("adminStore.status.active")}
              </StatusBadge>
            ),
            className: "w-40",
          },
        ]}
        data={categories}
        getRowKey={(category) => category.id}
        renderMobileItem={(category) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{category.name}</p>
                <p className="text-sm text-slate-500">{category.slug}</p>
              </div>
              <StatusBadge tone={category.is_active === false ? "warning" : "success"} dot>
                {category.is_active === false ? t("adminStore.status.inactive") : t("adminStore.status.active")}
              </StatusBadge>
            </div>
          </div>
        )}
        empty={t("adminStore.categories.empty")}
      />
    </div>
  );
}

export function StoreProductsManager() {
  const t = useT();
  const { currency } = useStoreAccess();
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<AdminCommerceCategory[]>([]);
  const [products, setProducts] = React.useState<AdminCommerceProduct[]>([]);
  const [form, setForm] = React.useState<ProductFormState>({
    name: "",
    slug: "",
    price: "",
    stock_quantity: "0",
    category_id: "",
    product_type: "SIMPLE",
  });

  const loadProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [nextCategories, nextProducts] = await Promise.all([
        listAdminCommerceCategories(),
        listAdminCommerceProducts(),
      ]);
      setCategories(nextCategories);
      setProducts(nextProducts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t("adminStore.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const created = await createAdminCommerceProduct({
        name: form.name,
        slug: form.slug,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity || 0),
        category_id: form.category_id || null,
        product_type: form.product_type,
      });
      setProducts((current) => [...current, created]);
      setForm({
        name: "",
        slug: "",
        price: "",
        stock_quantity: "0",
        category_id: "",
        product_type: "SIMPLE",
      });
      notify.success(t("adminStore.messages.productCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.messages.createFailed");
      setLoadError(message);
      notify.error(message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <StoreLoadingState />;

  return (
    <div className="space-y-4">
      {loadError ? <ErrorBanner description={loadError} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("adminStore.products.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("adminStore.products.namePlaceholder")}
            />
            <Input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder={t("adminStore.products.slugPlaceholder")}
            />
            <Input
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              placeholder={t("adminStore.products.pricePlaceholder")}
              inputMode="decimal"
            />
            <Input
              value={form.stock_quantity}
              onChange={(event) => setForm((current) => ({ ...current, stock_quantity: event.target.value }))}
              placeholder={t("adminStore.products.stockPlaceholder")}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              value={form.category_id}
              onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
            >
              <option value="">{t("adminStore.products.noCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              value={form.product_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  product_type: event.target.value as AdminCommerceProduct["product_type"],
                }))
              }
            >
              <option value="SIMPLE">{t("adminStore.products.simple")}</option>
              <option value="COMBO">{t("adminStore.products.combo")}</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => void handleCreate()}
            disabled={
              creating ||
              !form.name.trim() ||
              !form.slug.trim() ||
              !form.price.trim()
            }
          >
            {creating ? t("common.creating") : t("adminStore.products.createAction")}
          </Button>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          {
            key: "product",
            header: t("adminStore.table.product"),
            cell: (product) => (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{product.name}</p>
                <p className="text-xs text-slate-500">
                  {(product.product_type === "COMBO"
                    ? t("adminStore.products.combo")
                    : t("adminStore.products.simple"))} · {product.category?.name ?? t("adminStore.products.noCategory")}
                </p>
              </div>
            ),
          },
          {
            key: "stock",
            header: t("adminStore.table.stock"),
            cell: (product) => (
              <span className="text-sm text-slate-700">{product.stock_quantity}</span>
            ),
            className: "w-28",
          },
          {
            key: "price",
            header: t("adminStore.table.price"),
            cell: (product) => (
              <span className="font-medium text-slate-900">
                {formatCurrency(product.pricing?.final_price ?? product.price, currency, t)}
              </span>
            ),
            className: "w-40",
          },
        ]}
        data={products}
        getRowKey={(product) => product.id}
        renderMobileItem={(product) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-500">
                  {(product.product_type === "COMBO"
                    ? t("adminStore.products.combo")
                    : t("adminStore.products.simple"))} · {product.category?.name ?? t("adminStore.products.noCategory")}
                </p>
              </div>
              <p className="font-semibold text-slate-900">
                {formatCurrency(product.pricing?.final_price ?? product.price, currency, t)}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {t("adminStore.table.stock")}: {product.stock_quantity}
            </p>
          </div>
        )}
        empty={t("adminStore.products.empty")}
      />
    </div>
  );
}

export function StoreOrdersManager({
  limit,
  compact = false,
}: {
  limit?: number;
  compact?: boolean;
}) {
  return <DedicatedStoreOrdersManager limit={limit} compact={compact} />;
}

export function StoreOverviewSectionLinks() {
  const t = useT();

  const items = [
    {
      href: "/admin/dashboard/store/orders",
      title: t("adminStore.nav.orders"),
      description: t("adminStore.overview.ordersCta"),
      icon: ReceiptText,
    },
    {
      href: "/admin/dashboard/store/products",
      title: t("adminStore.nav.products"),
      description: t("adminStore.overview.productsCta"),
      icon: Package,
    },
    {
      href: "/admin/dashboard/store/points-of-sale",
      title: t("adminStore.nav.pointsOfSale"),
      description: t("adminStore.overview.pointsOfSaleCta"),
      icon: MapPinned,
    },
    {
      href: "/admin/dashboard/store/combos",
      title: t("adminStore.nav.combos"),
      description: t("adminStore.overview.combosCta"),
      icon: Boxes,
    },
    {
      href: "/admin/dashboard/store/categories",
      title: t("adminStore.nav.categories"),
      description: t("adminStore.overview.categoriesCta"),
      icon: Shapes,
    },
    {
      href: "/admin/dashboard/store/settings",
      title: t("adminStore.nav.settings"),
      description: t("adminStore.overview.settingsCta"),
      icon: Settings2,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-card flex min-h-32 flex-col justify-between gap-4 p-4 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-brand-soft text-admin-brand-soft-text">
            <item.icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-slate-950">{item.title}</h2>
            <p className="text-sm text-slate-600">{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function StoreOverviewMetrics({
  store,
  categoryCount,
  productCount,
  orderCount,
}: {
  store: AdminCommerceStore | null;
  categoryCount: number;
  productCount: number;
  orderCount: number;
}) {
  const t = useT();

  return (
    <AdminMetricGrid>
      <StatCard
        label={t("adminStore.overview.statusMetric")}
        value={store?.is_active ? t("adminStore.status.active") : t("adminStore.status.inactive")}
        hint={t("adminStore.overview.statusHint")}
      />
      <StatCard
        label={t("adminStore.nav.categories")}
        value={categoryCount}
        hint={t("adminStore.overview.categoriesHint")}
      />
      <StatCard
        label={t("adminStore.nav.products")}
        value={productCount}
        hint={t("adminStore.overview.productsHint")}
      />
      <StatCard
        label={t("adminStore.nav.orders")}
        value={orderCount}
        hint={t("adminStore.overview.ordersHint")}
      />
    </AdminMetricGrid>
  );
}
