import { normalizeApiError } from "@/lib/api-error";
import { resolveBackendUrl } from "@/lib/api-url";
import { DEFAULT_LOCALE, getLocaleCookie, translate } from "@/lib/i18n";

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  error?: boolean;
};

type AdminCommerceStoreResponse = AdminCommerceStore | { store?: AdminCommerceStore };

export type AdminCommercePickupPoint = {
  id?: string;
  name: string;
  address?: string | null;
  map_url?: string | null;
  instructions?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type AdminCommerceOrderScheduleSlot = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  sort_order?: number;
};

export type AdminCommercePointOfSale = {
  id: string;
  name: string;
  address: string;
  opening_time: string;
  closing_time: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type AdminCommerceStore = {
  id: string;
  company_id?: number;
  is_active: boolean;
  fulfillment_mode: "PICKUP_ONLY" | "DELIVERY_ONLY" | "PICKUP_AND_DELIVERY";
  scheduled_orders_enabled: boolean;
  min_preparation_minutes?: number | null;
  max_schedule_days_ahead?: number | null;
  order_slots_enabled: boolean;
  allow_cash_payment: boolean;
  allow_qr_payment: boolean;
  allow_manual_payment: boolean;
  qr_image_url?: string | null;
  payment_instructions?: string | null;
  payment_proof_required: boolean;
  payment_review_required: boolean;
  delivery_cost_mode: "MANUAL" | "FIXED";
  fixed_delivery_cost?: number | null;
  delivery_instructions?: string | null;
  pickup_points?: AdminCommercePickupPoint[];
  order_schedule_slots?: AdminCommerceOrderScheduleSlot[];
};

export type AdminCommerceStoreInput = Partial<{
  is_active: boolean;
  fulfillment_mode: AdminCommerceStore["fulfillment_mode"];
  scheduled_orders_enabled: boolean;
  min_preparation_minutes: number | null;
  max_schedule_days_ahead: number | null;
  order_slots_enabled: boolean;
  allow_cash_payment: boolean;
  allow_qr_payment: boolean;
  allow_manual_payment: boolean;
  qr_image_url: string | null;
  payment_instructions: string | null;
  payment_proof_required: boolean;
  payment_review_required: boolean;
  delivery_cost_mode: AdminCommerceStore["delivery_cost_mode"];
  fixed_delivery_cost: number | null;
  delivery_instructions: string | null;
  pickup_points: AdminCommercePickupPoint[];
  order_schedule_slots: AdminCommerceOrderScheduleSlot[];
}>;

export type AdminCommerceCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type AdminCommerceProductImage = {
  id?: string;
  image_url: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

export type AdminCommerceComboItem = {
  id?: string;
  component_product_id: string;
  quantity: number;
  component_product?: {
    id: string;
    name: string;
    slug: string;
    product_type: "SIMPLE" | "COMBO";
    is_active?: boolean;
    track_stock?: boolean;
    stock_quantity: number;
    allow_out_of_stock_orders?: boolean;
  } | null;
};

export type AdminCommerceProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  product_type: "SIMPLE" | "COMBO";
  price: number;
  regular_price?: number | null;
  promo_price?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  promo_label?: string | null;
  stock_quantity: number;
  is_active?: boolean;
  track_stock?: boolean;
  low_stock_threshold?: number | null;
  allow_out_of_stock_orders?: boolean;
  is_featured?: boolean;
  available_for_pickup?: boolean;
  available_for_delivery?: boolean;
  sort_order?: number;
  category_id?: string | null;
  category?: AdminCommerceCategory | null;
  images?: AdminCommerceProductImage[];
  combo_items?: AdminCommerceComboItem[];
  pricing?: {
    regular_price?: number | null;
    base_price: number;
    final_price: number;
    promo_applied: boolean;
    promo_label?: string | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
  };
};

export type AdminCommerceCombo = AdminCommerceProduct;

export type AdminCommerceCatalogFilters = {
  search?: string;
  categoryId?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  productType?: AdminCommerceProduct["product_type"];
  page?: number;
  limit?: number;
};

export type AdminCommerceProductInput = {
  category_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  product_type?: "SIMPLE" | "COMBO";
  price: number;
  regular_price?: number | null;
  promo_price?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  promo_label?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  track_stock?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number | null;
  allow_out_of_stock_orders?: boolean;
  available_for_pickup?: boolean;
  available_for_delivery?: boolean;
  sort_order?: number;
  images?: AdminCommerceProductImage[];
  combo_items?: Array<{
    componentProductId: string;
    quantity: number;
  }>;
};

export type AdminCommerceComboInput = {
  category_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  promo_price?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  promo_label?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type AdminCommerceOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone_prefix?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  payment_method: "CASH" | "QR" | "MANUAL";
  payment_status: string;
  fulfillment_status: string;
  fulfillment_type?: string | null;
  payment_proof_url?: string | null;
  delivery_address?: string | null;
  delivery_notes?: string | null;
  scheduled_for?: string | null;
  subtotal?: number | null;
  delivery_cost?: number | null;
  total?: number | null;
  internal_notes?: string | null;
  customer_notes?: string | null;
  assigned_staff_id?: number | null;
  created_at?: string;
  updated_at?: string;
  pickup_point?: {
    id: string;
    name: string;
    address?: string | null;
    map_url?: string | null;
    instructions?: string | null;
  } | null;
  assigned_staff?: {
    id: number;
    display_name: string;
    image_url?: string | null;
    user_id?: string;
  } | null;
  customer_profile?: {
    id: number;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
      phone_prefix?: string | null;
    } | null;
  } | null;
  status_history?: Array<{
    id: string;
    previous_payment_status?: string | null;
    new_payment_status?: string | null;
    previous_fulfillment_status?: string | null;
    new_fulfillment_status?: string | null;
    changed_by_user_id?: string | null;
    note?: string | null;
    created_at?: string;
  }>;
  items?: Array<{
    id: string;
    quantity: number;
    product_name_snapshot?: string | null;
    product_type_snapshot?: "SIMPLE" | "COMBO" | null;
    unit_price_snapshot?: number | null;
    regular_price_snapshot?: number | null;
    promo_applied_snapshot?: boolean;
    promo_label_snapshot?: string | null;
    total?: number | null;
    component_snapshots?: Array<{
      id: string;
      component_name_snapshot: string;
      component_quantity_per_combo: number;
      total_component_quantity: number;
    }>;
  }>;
};

export type AdminCommerceAssignableStaff = {
  id: number;
  display_name: string;
  image_url?: string | null;
};

export type AdminCommerceMetrics = {
  totals: {
    orders: number;
    confirmedRevenue: number;
    awaitingDeliveryCost: number;
    awaitingPayment: number;
    paymentSubmitted: number;
    readyForPickup: number;
    outForDelivery: number;
  };
  mix: {
    pickup: number;
    delivery: number;
  };
  stock: {
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
  };
};

function getCurrentLocale() {
  return getLocaleCookie() ?? DEFAULT_LOCALE;
}

function getGenericAdminCommerceError() {
  return translate(getCurrentLocale(), "common.error");
}

async function adminCommerceFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(resolveBackendUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw normalizeApiError(payload, response.status, getGenericAdminCommerceError());
  }

  return payload as T;
}

function unwrapData<T>(payload: ApiEnvelope<T>, fallbackMessage: string): T {
  if (payload?.data == null) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload.data;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberOrFallback(value: unknown, fallback = 0): number {
  return toNullableNumber(value) ?? fallback;
}

function buildCatalogPath(
  basePath: string,
  filters?: AdminCommerceCatalogFilters,
) {
  if (!filters) return basePath;

  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.categoryId?.trim()) params.set("categoryId", filters.categoryId.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.productType) params.set("productType", filters.productType);
  if (typeof filters.page === "number") params.set("page", String(filters.page));
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function normalizeAdminCommerceProduct(product: AdminCommerceProduct): AdminCommerceProduct {
  const normalizedPrice = toNumberOrFallback(product.price);
  const normalizedRegularPrice = toNullableNumber(product.regular_price);
  const normalizedPromoPrice = toNullableNumber(product.promo_price);

  return {
    ...product,
    price: normalizedPrice,
    regular_price: normalizedRegularPrice,
    promo_price: normalizedPromoPrice,
    stock_quantity: toNumberOrFallback(product.stock_quantity),
    low_stock_threshold: toNullableNumber(product.low_stock_threshold),
    sort_order: toNullableNumber(product.sort_order) ?? product.sort_order,
    images: Array.isArray(product.images)
      ? product.images.map((image, index) => ({
          ...image,
          sort_order: toNullableNumber(image.sort_order) ?? index,
        }))
      : [],
    combo_items: Array.isArray(product.combo_items)
      ? product.combo_items.map((item) => ({
          ...item,
          quantity: toNumberOrFallback(item.quantity, 1),
          component_product: item.component_product
            ? {
                ...item.component_product,
                stock_quantity: toNumberOrFallback(item.component_product.stock_quantity),
              }
            : null,
        }))
      : [],
    pricing: product.pricing
      ? {
          ...product.pricing,
          regular_price: toNullableNumber(product.pricing.regular_price),
          base_price: toNumberOrFallback(product.pricing.base_price, normalizedPrice),
          final_price: toNumberOrFallback(product.pricing.final_price, normalizedPrice),
        }
      : undefined,
  };
}

function normalizeAdminCommerceStore(store: AdminCommerceStore): AdminCommerceStore {
  return {
    ...store,
    min_preparation_minutes: toNullableNumber(store.min_preparation_minutes),
    max_schedule_days_ahead: toNullableNumber(store.max_schedule_days_ahead),
    fixed_delivery_cost: toNullableNumber(store.fixed_delivery_cost),
    order_slots_enabled: store.order_slots_enabled ?? false,
    payment_review_required: store.payment_review_required ?? true,
    allow_cash_payment: store.allow_cash_payment ?? true,
    allow_qr_payment: store.allow_qr_payment ?? false,
    allow_manual_payment: store.allow_manual_payment ?? false,
    pickup_points: Array.isArray(store.pickup_points)
      ? store.pickup_points.map((point, index) => ({
          ...point,
          is_active: point.is_active ?? true,
          sort_order: typeof point.sort_order === "number" ? point.sort_order : index,
        }))
      : [],
    order_schedule_slots: Array.isArray(store.order_schedule_slots)
      ? store.order_schedule_slots.map((slot, index) => ({
          ...slot,
          is_active: slot.is_active ?? true,
          sort_order: typeof slot.sort_order === "number" ? slot.sort_order : index,
        }))
      : [],
  };
}

function normalizeAdminCommercePointOfSale(point: AdminCommercePointOfSale): AdminCommercePointOfSale {
  return {
    ...point,
    latitude: toNumberOrFallback(point.latitude),
    longitude: toNumberOrFallback(point.longitude),
    is_active: point.is_active ?? true,
    sort_order: typeof point.sort_order === "number" ? point.sort_order : 0,
  };
}

export async function getAdminCommerceStore(): Promise<AdminCommerceStore> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceStoreResponse>>(
    "/api/admin/commerce/store",
  );
  const data = unwrapData(payload, "No se pudo cargar la configuración de Tienda.");
  if ("store" in data && data.store) {
    return normalizeAdminCommerceStore(data.store);
  }

  return normalizeAdminCommerceStore(data as AdminCommerceStore);
}

export async function updateAdminCommerceStore(
  input: AdminCommerceStoreInput,
): Promise<AdminCommerceStore> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceStore>>(
    "/api/admin/commerce/store",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceStore(
    unwrapData(payload, "No se pudo guardar la configuración de Tienda."),
  );
}

export async function listAdminCommercePointsOfSale(): Promise<AdminCommercePointOfSale[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommercePointOfSale[]>>(
    "/api/admin/commerce/points-of-sale",
  );

  return unwrapData(payload, "No se pudieron cargar los puntos de venta.").map(
    normalizeAdminCommercePointOfSale,
  );
}

export async function createAdminCommercePointOfSale(
  input: Omit<AdminCommercePointOfSale, "id">,
): Promise<AdminCommercePointOfSale> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommercePointOfSale>>(
    "/api/admin/commerce/points-of-sale",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommercePointOfSale(
    unwrapData(payload, "No se pudo crear el punto de venta."),
  );
}

export async function updateAdminCommercePointOfSale(
  pointOfSaleId: string,
  input: Partial<Omit<AdminCommercePointOfSale, "id">>,
): Promise<AdminCommercePointOfSale> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommercePointOfSale>>(
    `/api/admin/commerce/points-of-sale/${pointOfSaleId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommercePointOfSale(
    unwrapData(payload, "No se pudo actualizar el punto de venta."),
  );
}

export async function deleteAdminCommercePointOfSale(pointOfSaleId: string): Promise<void> {
  await adminCommerceFetch<ApiEnvelope<{ id: string }>>(
    `/api/admin/commerce/points-of-sale/${pointOfSaleId}`,
    {
      method: "DELETE",
    },
  );
}

export async function uploadAdminCommerceStoreQr(
  file: File,
): Promise<{ url: string; image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "commerce_store_qr");

  const response = await fetch(resolveBackendUrl("/api/admin/uploads/image"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw normalizeApiError(payload, response.status, getGenericAdminCommerceError());
  }

  const url = payload?.data?.url ?? payload?.data?.image_url ?? payload?.url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(getGenericAdminCommerceError());
  }

  return { url, image_url: url };
}

export async function deleteAdminCommerceStoreQr(): Promise<void> {
  await adminCommerceFetch<ApiEnvelope<null>>("/api/admin/uploads/image", {
    method: "DELETE",
    body: JSON.stringify({ type: "commerce_store_qr" }),
  });
}

export async function listAdminCommerceCategories(): Promise<AdminCommerceCategory[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCategory[]>>(
    "/api/admin/commerce/categories",
  );
  return unwrapData(payload, "No se pudieron cargar las categorías.");
}

export async function createAdminCommerceCategory(input: {
  name: string;
  slug: string;
}): Promise<AdminCommerceCategory> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCategory>>(
    "/api/admin/commerce/categories",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapData(payload, "No se pudo crear la categoría.");
}

export async function listAdminCommerceProducts(
  filters?: AdminCommerceCatalogFilters,
): Promise<AdminCommerceProduct[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct[]>>(
    buildCatalogPath("/api/admin/commerce/products", filters),
  );
  return unwrapData(payload, "No se pudieron cargar los productos.").map(
    normalizeAdminCommerceProduct,
  );
}

export async function getAdminCommerceProduct(
  productId: string,
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}`,
  );
  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo cargar el producto."),
  );
}

export async function createAdminCommerceProduct(
  input: AdminCommerceProductInput,
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    "/api/admin/commerce/products",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(unwrapData(payload, "No se pudo crear el producto."));
}

export async function updateAdminCommerceProduct(
  productId: string,
  input: Partial<AdminCommerceProductInput>,
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar el producto."),
  );
}

export async function deleteAdminCommerceProduct(
  productId: string,
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}`,
    {
      method: "DELETE",
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo desactivar el producto."),
  );
}

export async function listAdminCommerceCombos(
  filters?: Omit<AdminCommerceCatalogFilters, "productType">,
): Promise<AdminCommerceCombo[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo[]>>(
    buildCatalogPath("/api/admin/commerce/combos", filters),
  );
  return unwrapData(payload, "No se pudieron cargar los combos.").map(
    normalizeAdminCommerceProduct,
  );
}

export async function getAdminCommerceCombo(
  comboId: string,
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}`,
  );
  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo cargar el combo."),
  );
}

export async function createAdminCommerceCombo(
  input: AdminCommerceComboInput,
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    "/api/admin/commerce/combos",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(unwrapData(payload, "No se pudo crear el combo."));
}

export async function updateAdminCommerceCombo(
  comboId: string,
  input: Partial<AdminCommerceComboInput>,
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar el combo."),
  );
}

export async function deleteAdminCommerceCombo(
  comboId: string,
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}`,
    {
      method: "DELETE",
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo desactivar el combo."),
  );
}

export async function reorderAdminCommerceProducts(ids: string[]): Promise<void> {
  await adminCommerceFetch<ApiEnvelope<null>>("/api/admin/commerce/products/reorder", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function uploadAdminCommerceProductImage(params: {
  file: File;
  productId: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}): Promise<{
  url: string;
  image_url: string;
  image?: AdminCommerceProductImage;
  product?: AdminCommerceProduct;
}> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("sort_order", String(params.sortOrder ?? 0));
  formData.append("is_primary", String(params.isPrimary ?? false));
  if (params.altText?.trim()) {
    formData.append("alt_text", params.altText.trim());
  }

  const response = await fetch(
    resolveBackendUrl(`/api/admin/commerce/products/${params.productId}/images`),
    {
      method: "POST",
      body: formData,
      credentials: "include",
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw normalizeApiError(payload, response.status, getGenericAdminCommerceError());
  }

  const url = payload?.data?.url ?? payload?.data?.image_url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(getGenericAdminCommerceError());
  }

  const image = payload?.data?.image as AdminCommerceProductImage | undefined;
  const product = payload?.data?.product
    ? normalizeAdminCommerceProduct(payload.data.product as AdminCommerceProduct)
    : undefined;

  return { url, image_url: url, image, product };
}

export async function uploadAdminCommerceComboImage(params: {
  file: File;
  comboId: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}): Promise<{
  url: string;
  image_url: string;
  image?: AdminCommerceProductImage;
  combo?: AdminCommerceCombo;
}> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("sort_order", String(params.sortOrder ?? 0));
  formData.append("is_primary", String(params.isPrimary ?? true));
  if (params.altText?.trim()) {
    formData.append("alt_text", params.altText.trim());
  }

  const response = await fetch(resolveBackendUrl(`/api/admin/commerce/combos/${params.comboId}/images`), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw normalizeApiError(payload, response.status, getGenericAdminCommerceError());
  }

  const url = payload?.data?.url ?? payload?.data?.image_url ?? payload?.url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(getGenericAdminCommerceError());
  }

  const image = payload?.data?.image as AdminCommerceProductImage | undefined;
  const combo = payload?.data?.product
    ? normalizeAdminCommerceProduct(payload.data.product as AdminCommerceCombo)
    : undefined;

  return { url, image_url: url, image, combo };
}

export async function setAdminCommerceProductPrimaryImage(
  productId: string,
  imageId: string,
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}/images/${imageId}/primary`,
    {
      method: "PUT",
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar la imagen principal."),
  );
}

export async function setAdminCommerceComboPrimaryImage(
  comboId: string,
  imageId: string,
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}/images/${imageId}/primary`,
    {
      method: "PUT",
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar la imagen principal del combo."),
  );
}

export async function reorderAdminCommerceProductImages(
  productId: string,
  imageIds: string[],
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}/images/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ image_ids: imageIds }),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo reordenar las imágenes del producto."),
  );
}

export async function reorderAdminCommerceComboImages(
  comboId: string,
  imageIds: string[],
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}/images/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ image_ids: imageIds }),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudieron reordenar las imágenes del combo."),
  );
}

export async function updateAdminCommerceProductImage(
  productId: string,
  imageId: string,
  input: {
    alt_text?: string | null;
  },
): Promise<AdminCommerceProduct> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct>>(
    `/api/admin/commerce/products/${productId}/images/${imageId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar la imagen del producto."),
  );
}

export async function updateAdminCommerceComboImage(
  comboId: string,
  imageId: string,
  input: {
    alt_text?: string | null;
  },
): Promise<AdminCommerceCombo> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo>>(
    `/api/admin/commerce/combos/${comboId}/images/${imageId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return normalizeAdminCommerceProduct(
    unwrapData(payload, "No se pudo actualizar la imagen del combo."),
  );
}

export async function deleteAdminCommerceProductImage(
  productId: string,
  imageId: string,
): Promise<AdminCommerceProduct | null> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceProduct | null>>(
    `/api/admin/commerce/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
    },
  );

  return payload.data ? normalizeAdminCommerceProduct(payload.data) : null;
}

export async function deleteAdminCommerceComboImage(
  comboId: string,
  imageId: string,
): Promise<AdminCommerceCombo | null> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceCombo | null>>(
    `/api/admin/commerce/combos/${comboId}/images/${imageId}`,
    {
      method: "DELETE",
    },
  );

  return payload.data ? normalizeAdminCommerceProduct(payload.data) : null;
}

export async function listAdminCommerceOrders(): Promise<AdminCommerceOrder[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder[]>>(
    "/api/admin/commerce/orders",
  );
  return unwrapData(payload, "No se pudieron cargar los pedidos.");
}

export async function getAdminCommerceOrder(orderId: string): Promise<AdminCommerceOrder> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder>>(
    `/api/admin/commerce/orders/${orderId}`,
  );
  return unwrapData(payload, "No se pudo cargar el detalle del pedido.");
}

export async function updateAdminCommerceOrderStatus(
  orderId: string,
  input: {
    payment_status?: string | null;
    fulfillment_status?: string | null;
    note?: string | null;
  },
): Promise<AdminCommerceOrder> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder>>(
    `/api/admin/commerce/orders/${orderId}/status`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return unwrapData(payload, "No se pudo actualizar el estado del pedido.");
}

export async function updateAdminCommerceOrderDeliveryCost(
  orderId: string,
  input: {
    deliveryCost: number;
    note?: string | null;
  },
): Promise<AdminCommerceOrder> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder>>(
    `/api/admin/commerce/orders/${orderId}/delivery-cost`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return unwrapData(payload, "No se pudo actualizar el costo de delivery.");
}

export async function updateAdminCommerceOrderAssignment(
  orderId: string,
  input: {
    assignedStaffId?: number | null;
    note?: string | null;
  },
): Promise<AdminCommerceOrder> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder>>(
    `/api/admin/commerce/orders/${orderId}/assign`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return unwrapData(payload, "No se pudo actualizar la asignación del pedido.");
}

export async function updateAdminCommerceOrderNotes(
  orderId: string,
  input: {
    internal_notes?: string | null;
  },
): Promise<AdminCommerceOrder> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceOrder>>(
    `/api/admin/commerce/orders/${orderId}/notes`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return unwrapData(payload, "No se pudieron actualizar las notas del pedido.");
}

export async function listAdminCommerceAssignableStaff(): Promise<AdminCommerceAssignableStaff[]> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceAssignableStaff[]>>(
    "/api/admin/commerce/staff",
  );
  return unwrapData(payload, "No se pudo cargar el personal asignable.");
}

export async function getAdminCommerceMetrics(): Promise<AdminCommerceMetrics> {
  const payload = await adminCommerceFetch<ApiEnvelope<AdminCommerceMetrics>>(
    "/api/admin/commerce/metrics",
  );
  return unwrapData(payload, "No se pudieron cargar las métricas de Tienda.");
}
