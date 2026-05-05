import type {
  AdminCommerceCombo,
  AdminCommerceComboInput,
  AdminCommerceProduct,
} from "@/app/admin/lib/adminCommerceApi";
import { type useT } from "@/lib/i18n";

import {
  formatDecimalInput,
  formatDateTimeLocal,
  getPrimaryImage,
  parseDecimal,
  parseInteger,
  productHasPromotion,
  slugify,
  toApiDateTime,
  type ProductEditorImage,
} from "./store-product-shared";

export type ComboItemForm = {
  rowId: string;
  productId: string;
  quantity: string;
};

export type ComboFormState = {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price: string;
  promo_price: string;
  promo_starts_at: string;
  promo_ends_at: string;
  promo_label: string;
  is_active: boolean;
  is_featured: boolean;
  items: ComboItemForm[];
};

type BuildComboPayloadParams = {
  editor: ComboFormState;
  comboId?: string | null;
  promotionEnabled: boolean;
  t: ReturnType<typeof useT>;
};

export const INITIAL_COMBO_FORM_STATE: ComboFormState = {
  name: "",
  slug: "",
  description: "",
  category_id: "",
  price: "",
  promo_price: "",
  promo_starts_at: "",
  promo_ends_at: "",
  promo_label: "",
  is_active: true,
  is_featured: false,
  items: [],
};

export function buildComboFormState(combo: AdminCommerceCombo): ComboFormState {
  return {
    name: combo.name,
    slug: combo.slug,
    description: combo.description ?? "",
    category_id: combo.category_id ?? "",
    price: formatDecimalInput(combo.price),
    promo_price: formatDecimalInput(combo.promo_price ?? null),
    promo_starts_at: formatDateTimeLocal(combo.promo_starts_at),
    promo_ends_at: formatDateTimeLocal(combo.promo_ends_at),
    promo_label: combo.promo_label ?? "",
    is_active: combo.is_active !== false,
    is_featured: combo.is_featured === true,
    items:
      combo.combo_items?.map((item, index) => ({
        rowId: item.id ?? `${item.component_product_id}-${index}`,
        productId: item.component_product_id,
        quantity: String(item.quantity),
      })) ?? [],
  };
}

export function buildComboEditorImages(combo: AdminCommerceCombo): ProductEditorImage[] {
  return (
    combo.images?.map((image, index) => ({
      clientId: image.id ?? `persisted-combo-image-${index}`,
      persistedId: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text ?? "",
      isPrimary: image.is_primary === true || index === 0,
      isNew: false,
    })) ?? []
  );
}

export function comboHasPromotion(
  combo: Pick<
    AdminCommerceCombo,
    "promo_price" | "promo_label" | "promo_starts_at" | "promo_ends_at"
  >,
) {
  return productHasPromotion(combo);
}

export function getComboValidationMessage({
  editor,
  comboId,
  promotionEnabled,
  t,
}: BuildComboPayloadParams): string | null {
  if (!editor.name.trim()) return t("adminStore.combos.nameRequired");
  if (!editor.slug.trim()) return t("adminStore.combos.slugRequired");

  const price = parseDecimal(editor.price);
  if (price == null || price < 0) {
    return t("adminStore.combos.invalidPrice");
  }

  const promoPrice = parseDecimal(editor.promo_price);
  const promoStartsAt = toApiDateTime(editor.promo_starts_at);
  const promoEndsAt = toApiDateTime(editor.promo_ends_at);
  const promoMetadataPresent =
    editor.promo_label.trim().length > 0 ||
    editor.promo_starts_at.trim().length > 0 ||
    editor.promo_ends_at.trim().length > 0;

  if (promotionEnabled && promoPrice == null && promoMetadataPresent) {
    return t("adminStore.products.promoPriceRequired");
  }

  if (promotionEnabled && promoPrice != null && promoPrice >= price) {
    return t("adminStore.products.promoPriceTooHigh");
  }

  if (
    promoStartsAt &&
    promoEndsAt &&
    new Date(promoEndsAt).getTime() <= new Date(promoStartsAt).getTime()
  ) {
    return t("adminStore.products.promoWindowInvalid");
  }

  if (editor.items.length === 0) {
    return t("adminStore.combos.itemsRequired");
  }

  const seenProducts = new Set<string>();
  for (const item of editor.items) {
    if (!item.productId) {
      return t("adminStore.combos.itemProductRequired");
    }

    if (comboId && item.productId === comboId) {
      return t("adminStore.products.comboSelfReference");
    }

    if (seenProducts.has(item.productId)) {
      return t("adminStore.combos.duplicateProducts");
    }

    const quantity = parseInteger(item.quantity);
    if (quantity == null || quantity <= 0) {
      return t("adminStore.combos.invalidQuantity");
    }

    seenProducts.add(item.productId);
  }

  return null;
}

export function buildComboPayload({
  editor,
  comboId,
  promotionEnabled,
  t,
}: BuildComboPayloadParams): AdminCommerceComboInput {
  const validationMessage = getComboValidationMessage({
    editor,
    comboId,
    promotionEnabled,
    t,
  });
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const price = parseDecimal(editor.price)!;
  const promoPrice = parseDecimal(editor.promo_price);
  const promoStartsAt = toApiDateTime(editor.promo_starts_at);
  const promoEndsAt = toApiDateTime(editor.promo_ends_at);

  return {
    category_id: editor.category_id || null,
    name: editor.name.trim(),
    slug: slugify(editor.slug),
    description: editor.description.trim() || null,
    price,
    is_active: editor.is_active,
    is_featured: editor.is_featured,
    items: editor.items.map((item) => ({
      productId: item.productId,
      quantity: parseInteger(item.quantity) ?? 1,
    })),
    ...(promotionEnabled
      ? {
          promo_price: promoPrice ?? undefined,
          promo_starts_at: promoStartsAt ?? undefined,
          promo_ends_at: promoEndsAt ?? undefined,
          promo_label: editor.promo_label.trim() || undefined,
        }
      : {}),
  } as AdminCommerceComboInput;
}

export function getComboSourceProduct(
  productId: string,
  products: AdminCommerceProduct[],
) {
  return products.find((product) => product.id === productId) ?? null;
}

export function getComboOriginalTotal(
  items: ComboItemForm[],
  products: AdminCommerceProduct[],
) {
  return items.reduce((total, item) => {
    const product = getComboSourceProduct(item.productId, products);
    const quantity = parseInteger(item.quantity);
    const unitPrice = product?.pricing?.final_price ?? product?.price;

    if (!product || quantity == null || quantity <= 0 || unitPrice == null) {
      return total;
    }

    return total + unitPrice * quantity;
  }, 0);
}

export function getComboIncludedUnits(items: ComboItemForm[]) {
  return items.reduce((count, item) => count + (parseInteger(item.quantity) ?? 0), 0);
}

export function getComboProductCount(items: ComboItemForm[]) {
  return items.filter((item) => item.productId).length;
}

export function getComboListImage(combo: AdminCommerceCombo) {
  return getPrimaryImage(combo);
}
