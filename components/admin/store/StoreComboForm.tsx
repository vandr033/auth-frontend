"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ImagePlus,
  Package,
  Star,
  Trash2,
} from "lucide-react";

import type { AdminCommerceCategory, AdminCommerceProduct } from "@/app/admin/lib/adminCommerceApi";
import { ErrorBanner, FormSection } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";

import {
  formatCurrency,
  parseDecimal,
  parseInteger,
  type ProductEditorImage,
} from "./store-product-shared";
import type { ComboFormState } from "./store-combo-shared";
import {
  getComboIncludedUnits,
  getComboOriginalTotal,
  getComboProductCount,
  getComboSourceProduct,
} from "./store-combo-shared";

type StoreComboFormProps = {
  mode: "create" | "edit";
  currency: string | null;
  categories: AdminCommerceCategory[];
  sourceProducts: AdminCommerceProduct[];
  form: ComboFormState;
  images: ProductEditorImage[];
  canSubmit: boolean;
  saving: boolean;
  validationMessage?: string | null;
  submitError?: string | null;
  statusActionPending?: boolean;
  onFieldChange: <Key extends keyof ComboFormState>(
    field: Key,
    value: ComboFormState[Key],
  ) => void;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onAddImages: (files: FileList | null) => void;
  onMoveImage: (clientId: string, direction: -1 | 1) => void;
  onSetPrimaryImage: (clientId: string) => void;
  onRemoveImage: (clientId: string) => void;
  onImageAltChange: (clientId: string, value: string) => void;
  onAddItem: () => void;
  onItemChange: (
    rowId: string,
    field: "productId" | "quantity",
    value: string,
  ) => void;
  onRemoveItem: (rowId: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleStatus?: () => void;
  onSyncImagesFromProducts?: () => void;
};

function getProductStockCopy(
  product: AdminCommerceProduct | null,
  t: ReturnType<typeof useT>,
) {
  if (!product) return t("adminStore.combos.stockUnknown");
  if (product.track_stock === false) return t("adminStore.products.stockNotTracked");
  if (product.allow_out_of_stock_orders) {
    return t("adminStore.combos.stockFlexible", {
      stock: product.stock_quantity,
    });
  }

  return t("adminStore.combos.stockExact", {
    stock: product.stock_quantity,
  });
}

export function StoreComboForm({
  mode,
  currency,
  categories,
  sourceProducts,
  form,
  images,
  canSubmit,
  saving,
  validationMessage,
  submitError,
  statusActionPending = false,
  onFieldChange,
  onNameChange,
  onSlugChange,
  onAddImages,
  onMoveImage,
  onSetPrimaryImage,
  onRemoveImage,
  onImageAltChange,
  onAddItem,
  onItemChange,
  onRemoveItem,
  onSave,
  onCancel,
  onToggleStatus,
  onSyncImagesFromProducts,
}: StoreComboFormProps) {
  const t = useT();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const originalTotal = React.useMemo(
    () => getComboOriginalTotal(form.items, sourceProducts),
    [form.items, sourceProducts],
  );
  const comboPrice = parseDecimal(form.price);
  const savings = comboPrice != null ? originalTotal - comboPrice : null;
  const selectedProductIds = new Set(form.items.map((item) => item.productId).filter(Boolean));

  return (
    <div className="space-y-4">
      {submitError ? <ErrorBanner description={submitError} /> : null}
      {!submitError && validationMessage ? <ErrorBanner description={validationMessage} /> : null}

      <FormSection
        title={t("adminStore.combos.infoSection")}
        description={t("adminStore.combos.infoHint")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="combo-name">{t("adminStore.combos.nameLabel")}</Label>
            <Input
              id="combo-name"
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={t("adminStore.combos.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combo-slug">{t("adminStore.combos.slugLabel")}</Label>
            <Input
              id="combo-slug"
              value={form.slug}
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder={t("adminStore.combos.slugPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combo-category">{t("adminStore.table.category")}</Label>
            <select
              id="combo-category"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={form.category_id}
              onChange={(event) => onFieldChange("category_id", event.target.value)}
            >
              <option value="">{t("adminStore.products.noCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="combo-description">{t("adminStore.combos.descriptionLabel")}</Label>
            <textarea
              id="combo-description"
              rows={4}
              value={form.description}
              onChange={(event) => onFieldChange("description", event.target.value)}
              placeholder={t("adminStore.combos.descriptionPlaceholder")}
              className="admin-textarea min-h-[112px] resize-y"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.combos.priceSection")}
        description={t("adminStore.combos.priceHint")}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="combo-price">{t("adminStore.combos.priceLabel")}</Label>
            <Input
              id="combo-price"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => onFieldChange("price", event.target.value)}
              placeholder="89.00"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.combos.originalTotal")}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatCurrency(originalTotal, currency, t)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.combos.savings")}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {savings != null
                  ? formatCurrency(savings, currency, t)
                  : t("adminStore.overview.notAvailable")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("adminStore.combos.bundleUnits")}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {getComboIncludedUnits(form.items)}
              </p>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.combos.itemsSection")}
        description={t("adminStore.combos.itemsHint")}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={onAddItem}
            disabled={sourceProducts.length === 0}
          >
            <Boxes className="h-4 w-4" />
            {t("adminStore.combos.addItem")}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>
            {t("adminStore.combos.itemCount", {
              count: getComboProductCount(form.items),
            })}
          </span>
          <span>
            {t("adminStore.combos.totalUnits", {
              count: getComboIncludedUnits(form.items),
            })}
          </span>
        </div>

        {sourceProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            {t("adminStore.combos.noSourceProducts")}
          </div>
        ) : null}

        <div className="space-y-3">
          {form.items.map((item) => {
            const product = getComboSourceProduct(item.productId, sourceProducts);
            const quantity = parseInteger(item.quantity) ?? 0;
            const unitPrice = product?.pricing?.final_price ?? product?.price ?? 0;
            const lineTotal = quantity > 0 ? unitPrice * quantity : 0;

            return (
              <div
                key={item.rowId}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_120px_180px_auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={`combo-item-product-${item.rowId}`}>
                    {t("adminStore.combos.productLabel")}
                  </Label>
                  <select
                    id={`combo-item-product-${item.rowId}`}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    value={item.productId}
                    onChange={(event) => onItemChange(item.rowId, "productId", event.target.value)}
                  >
                    <option value="">{t("adminStore.combos.selectProduct")}</option>
                    {sourceProducts.map((sourceProduct) => {
                      const isTaken =
                        sourceProduct.id !== item.productId && selectedProductIds.has(sourceProduct.id);

                      return (
                        <option
                          key={sourceProduct.id}
                          value={sourceProduct.id}
                          disabled={isTaken}
                        >
                          {sourceProduct.name}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500">
                    {getProductStockCopy(product, t)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`combo-item-quantity-${item.rowId}`}>
                    {t("adminStore.combos.quantityLabel")}
                  </Label>
                  <Input
                    id={`combo-item-quantity-${item.rowId}`}
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(event) => onItemChange(item.rowId, "quantity", event.target.value)}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("adminStore.combos.lineTotal")}</Label>
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                    {formatCurrency(lineTotal, currency, t)}
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => onRemoveItem(item.rowId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            );
          })}

          {form.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
              {t("adminStore.combos.itemsEmpty")}
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.combos.availabilitySection")}
        description={t("adminStore.combos.availabilityHint")}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.combos.activeToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.combos.activeHint")}</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => onFieldChange("is_active", checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.combos.featuredToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.combos.featuredHint")}</p>
            </div>
            <Switch
              checked={form.is_featured}
              onCheckedChange={(checked) => onFieldChange("is_featured", checked)}
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.combos.imagesSection")}
        description={t("adminStore.combos.imagesHint")}
        actions={
          <div className="flex flex-wrap gap-2">
            {onSyncImagesFromProducts && form.items.some(item => item.productId) ? (
              <Button type="button" variant="outline" onClick={onSyncImagesFromProducts}>
                <ImagePlus className="h-4 w-4" />
                {t("adminStore.combos.syncImagesAction") || "Importar imágenes de productos"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              {t("adminStore.products.imagesUploadAction")}
            </Button>
          </div>
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            onAddImages(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{t("adminStore.products.imagesCount", { count: images.length })}</span>
          <span>{t("adminStore.products.imageUploadNote")}</span>
        </div>

        {images.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600">
            <ImagePlus className="h-6 w-6 text-slate-400" />
            <p>{t("adminStore.combos.imagesEmpty")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => {
              const imageUrl = getImageUrl(image.imageUrl) || image.imageUrl;

              return (
                <div
                  key={image.clientId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={image.altText || t("adminStore.combos.imagePreviewAlt")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {image.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">
                          <Star className="h-3.5 w-3.5" />
                          {t("adminStore.products.imagesPrimary")}
                        </span>
                      ) : null}
                      {image.isNew ? (
                        <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {t("adminStore.products.imagesPending")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={image.isPrimary ? "secondary" : "outline"}
                        onClick={() => onSetPrimaryImage(image.clientId)}
                        disabled={image.isPrimary}
                      >
                        <Star className="h-4 w-4" />
                        {image.isPrimary
                          ? t("adminStore.products.imagesPrimary")
                          : t("adminStore.products.imagesMarkPrimary")}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onMoveImage(image.clientId, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onMoveImage(image.clientId, 1)}
                        disabled={index === images.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() => onRemoveImage(image.clientId)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("adminStore.products.removeImage")}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`combo-image-alt-${image.clientId}`}>
                        {t("adminStore.products.imageAltLabel")}
                      </Label>
                      <Input
                        id={`combo-image-alt-${image.clientId}`}
                        value={image.altText}
                        onChange={(event) => onImageAltChange(image.clientId, event.target.value)}
                        placeholder={t("adminStore.products.imageAltPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      <FormSection
        title={t("adminStore.combos.actionsSection")}
        description={t("adminStore.combos.actionsHint")}
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {mode === "create"
                  ? t("adminStore.combos.createDescription")
                  : t("adminStore.combos.editDescription")}
              </p>
              <p className="text-xs text-slate-500">{t("adminStore.combos.actionsFootnote")}</p>
            </div>

            {mode === "edit" && onToggleStatus ? (
              <Button
                type="button"
                variant={form.is_active ? "destructive" : "outline"}
                onClick={onToggleStatus}
                disabled={statusActionPending}
                className={cn(!form.is_active && "border-slate-300")}
              >
                {form.is_active
                  ? t("adminStore.combos.deactivateAction")
                  : t("adminStore.combos.activate")}
              </Button>
            ) : null}
          </div>
        </div>
      </FormSection>

      <StickyFormActions
        onSave={onSave}
        onCancel={onCancel}
        loading={saving}
        disabled={!canSubmit}
        saveLabel={mode === "create" ? t("adminStore.combos.createAction") : t("common.save")}
        loadingLabel={t("common.saving")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
