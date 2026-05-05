import type {
  AdminCommerceProduct,
  AdminCommerceProductImage,
  AdminCommerceProductInput,
} from "@/app/admin/lib/adminCommerceApi";
import { type useT } from "@/lib/i18n";

export type ComboItemForm = {
  rowId: string;
  componentProductId: string;
  quantity: string;
};

export type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  product_type: AdminCommerceProduct["product_type"];
  price: string;
  promo_price: string;
  promo_starts_at: string;
  promo_ends_at: string;
  promo_label: string;
  is_active: boolean;
  is_featured: boolean;
  track_stock: boolean;
  stock_quantity: string;
  low_stock_threshold: string;
  allow_out_of_stock_orders: boolean;
  available_for_pickup: boolean;
  available_for_delivery: boolean;
  combo_items: ComboItemForm[];
};

export type ProductEditorImage = {
  clientId: string;
  persistedId?: string;
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
  file?: File;
  isNew: boolean;
};

type PromoStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | null;

type BuildPayloadParams = {
  editor: ProductFormState;
  productId?: string | null;
  promotionEnabled: boolean;
  t: ReturnType<typeof useT>;
};

export const INITIAL_PRODUCT_FORM_STATE: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  category_id: "",
  product_type: "SIMPLE",
  price: "",
  promo_price: "",
  promo_starts_at: "",
  promo_ends_at: "",
  promo_label: "",
  is_active: true,
  is_featured: false,
  track_stock: true,
  stock_quantity: "0",
  low_stock_threshold: "",
  allow_out_of_stock_orders: false,
  available_for_pickup: true,
  available_for_delivery: true,
  combo_items: [],
};

export function formatCurrency(
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return numericValue.toFixed(2);
  }
}

export function formatDecimalInput(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseInteger(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function getPrimaryImage(product: AdminCommerceProduct): AdminCommerceProductImage | null {
  return product.images?.find((image) => image.is_primary) ?? product.images?.[0] ?? null;
}

function getPromoStatus(product: AdminCommerceProduct): PromoStatus {
  if (product.promo_price == null) return null;
  if (product.pricing?.promo_applied) return "ACTIVE";

  const now = Date.now();
  const promoStartsAt = product.promo_starts_at ? new Date(product.promo_starts_at).getTime() : null;
  const promoEndsAt = product.promo_ends_at ? new Date(product.promo_ends_at).getTime() : null;

  if (promoStartsAt != null && Number.isFinite(promoStartsAt) && promoStartsAt > now) {
    return "SCHEDULED";
  }

  if (promoEndsAt != null && Number.isFinite(promoEndsAt) && promoEndsAt < now) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

export function getPromoTone(product: AdminCommerceProduct) {
  const status = getPromoStatus(product);

  if (status === "ACTIVE") return "warning" as const;
  if (status === "SCHEDULED") return "info" as const;
  if (status === "EXPIRED") return "danger" as const;
  return null;
}

export function getPromoLabel(product: AdminCommerceProduct, t: ReturnType<typeof useT>) {
  const status = getPromoStatus(product);
  if (!status) return null;

  if (status === "ACTIVE") {
    return product.pricing?.promo_label || product.promo_label || t("adminStore.products.promoActive");
  }

  if (status === "SCHEDULED") {
    return t("adminStore.products.promoScheduled");
  }

  return t("adminStore.products.promoExpired");
}

export function getDisplayComparisonPrice(product: AdminCommerceProduct): number | null {
  if (product.pricing?.promo_applied) {
    return product.pricing.regular_price ?? product.pricing.base_price ?? product.price;
  }

  return product.pricing?.regular_price ?? product.regular_price ?? null;
}

export function productHasPromotion(
  product: Pick<
    AdminCommerceProduct,
    "promo_price" | "promo_label" | "promo_starts_at" | "promo_ends_at"
  >,
) {
  return Boolean(
    product.promo_price != null ||
      product.promo_label?.trim() ||
      product.promo_starts_at ||
      product.promo_ends_at,
  );
}

export function buildProductFormState(product: AdminCommerceProduct): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    category_id: product.category_id ?? "",
    product_type: product.product_type,
    price: formatDecimalInput(product.price),
    promo_price: formatDecimalInput(product.promo_price ?? null),
    promo_starts_at: formatDateTimeLocal(product.promo_starts_at),
    promo_ends_at: formatDateTimeLocal(product.promo_ends_at),
    promo_label: product.promo_label ?? "",
    is_active: product.is_active !== false,
    is_featured: product.is_featured === true,
    track_stock: product.track_stock !== false,
    stock_quantity: String(product.stock_quantity ?? 0),
    low_stock_threshold:
      product.low_stock_threshold != null ? String(product.low_stock_threshold) : "",
    allow_out_of_stock_orders: product.allow_out_of_stock_orders === true,
    available_for_pickup: product.available_for_pickup !== false,
    available_for_delivery: product.available_for_delivery !== false,
    combo_items:
      product.combo_items?.map((item, index) => ({
        rowId: `${item.component_product_id}-${index}`,
        componentProductId: item.component_product_id,
        quantity: String(item.quantity),
      })) ?? [],
  };
}

export function buildProductEditorImages(product: AdminCommerceProduct): ProductEditorImage[] {
  return (
    product.images?.map((image, index) => ({
      clientId: image.id ?? `persisted-image-${index}`,
      persistedId: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text ?? "",
      isPrimary: image.is_primary === true || index === 0,
      isNew: false,
    })) ?? []
  );
}

export function buildPendingProductImage(
  file: File,
  previewUrl: string,
  options?: {
    isPrimary?: boolean;
  },
): ProductEditorImage {
  return {
    clientId: crypto.randomUUID(),
    imageUrl: previewUrl,
    altText: "",
    isPrimary: options?.isPrimary === true,
    file,
    isNew: true,
  };
}

export function buildProductPayload({
  editor,
  productId,
  promotionEnabled,
  t,
}: BuildPayloadParams): AdminCommerceProductInput {
  const price = parseDecimal(editor.price);
  if (price == null) {
    throw new Error(t("adminStore.products.invalidPrice"));
  }

  const promoPrice = parseDecimal(editor.promo_price);
  const stockQuantity = parseInteger(editor.stock_quantity);
  const lowStockThreshold = parseInteger(editor.low_stock_threshold);
  const promoStartsAt = toApiDateTime(editor.promo_starts_at);
  const promoEndsAt = toApiDateTime(editor.promo_ends_at);
  const promoMetadataPresent =
    editor.promo_label.trim().length > 0 ||
    editor.promo_starts_at.trim().length > 0 ||
    editor.promo_ends_at.trim().length > 0;

  if (promotionEnabled && promoPrice == null && promoMetadataPresent) {
    throw new Error(t("adminStore.products.promoPriceRequired"));
  }

  if (editor.track_stock && stockQuantity == null) {
    throw new Error(t("adminStore.products.invalidStock"));
  }

  if (promotionEnabled && promoPrice != null && promoPrice >= price) {
    throw new Error(t("adminStore.products.promoPriceTooHigh"));
  }

  if (promoStartsAt && promoEndsAt && new Date(promoEndsAt).getTime() <= new Date(promoStartsAt).getTime()) {
    throw new Error(t("adminStore.products.promoWindowInvalid"));
  }

  if (!editor.available_for_pickup && !editor.available_for_delivery) {
    throw new Error(t("adminStore.products.fulfillmentRequired"));
  }

  const comboItems: Array<{ componentProductId: string; quantity: number }> = [];
  if (editor.product_type === "COMBO") {
    if (editor.combo_items.length === 0) {
      throw new Error(t("adminStore.products.comboRequired"));
    }

    const seenComponents = new Set<string>();
    for (const item of editor.combo_items) {
      if (!item.componentProductId) {
        throw new Error(t("adminStore.products.comboComponentRequired"));
      }

      if (productId && item.componentProductId === productId) {
        throw new Error(t("adminStore.products.comboSelfReference"));
      }

      if (seenComponents.has(item.componentProductId)) {
        throw new Error(t("adminStore.products.comboDuplicateComponent"));
      }

      const quantity = parseInteger(item.quantity);
      if (quantity == null || quantity <= 0) {
        throw new Error(t("adminStore.products.comboQuantityInvalid"));
      }

      seenComponents.add(item.componentProductId);
      comboItems.push({
        componentProductId: item.componentProductId,
        quantity,
      });
    }
  }

  return {
    category_id: editor.category_id || null,
    name: editor.name.trim(),
    slug: editor.slug.trim(),
    description: editor.description.trim() || null,
    product_type: editor.product_type,
    price,
    regular_price: null,
    promo_price: promotionEnabled ? promoPrice : null,
    promo_starts_at: promotionEnabled ? promoStartsAt : null,
    promo_ends_at: promotionEnabled ? promoEndsAt : null,
    promo_label: promotionEnabled ? editor.promo_label.trim() || null : null,
    is_active: editor.is_active,
    is_featured: editor.is_featured,
    track_stock: editor.track_stock,
    stock_quantity: editor.track_stock ? stockQuantity ?? 0 : 0,
    low_stock_threshold: editor.track_stock ? lowStockThreshold : null,
    allow_out_of_stock_orders: editor.allow_out_of_stock_orders,
    available_for_pickup: editor.available_for_pickup,
    available_for_delivery: editor.available_for_delivery,
    combo_items: editor.product_type === "COMBO" ? comboItems : [],
  };
}
