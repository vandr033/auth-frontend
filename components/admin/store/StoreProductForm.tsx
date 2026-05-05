"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Package,
  Star,
  Tag,
  Trash2,
} from "lucide-react";

import type {
  AdminCommerceCategory,
} from "@/app/admin/lib/adminCommerceApi";
import { ErrorBanner, FormSection } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";

import type {
  ProductEditorImage,
  ProductFormState,
} from "./store-product-shared";

type StoreProductFormProps = {
  mode: "create" | "edit";
  categories: AdminCommerceCategory[];
  form: ProductFormState;
  images: ProductEditorImage[];
  promotionVisible: boolean;
  canSubmit: boolean;
  saving: boolean;
  submitError?: string | null;
  statusActionPending?: boolean;
  onFieldChange: <Key extends keyof ProductFormState>(
    field: Key,
    value: ProductFormState[Key],
  ) => void;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onShowPromotion: () => void;
  onRemovePromotion: () => void;
  onAddImages: (files: FileList | null) => void;
  onMoveImage: (clientId: string, direction: -1 | 1) => void;
  onSetPrimaryImage: (clientId: string) => void;
  onRemoveImage: (clientId: string) => void;
  onImageAltChange: (clientId: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleStatus?: () => void;
};

export function StoreProductForm({
  mode,
  categories,
  form,
  images,
  promotionVisible,
  canSubmit,
  saving,
  submitError,
  statusActionPending = false,
  onFieldChange,
  onNameChange,
  onSlugChange,
  onShowPromotion,
  onRemovePromotion,
  onAddImages,
  onMoveImage,
  onSetPrimaryImage,
  onRemoveImage,
  onImageAltChange,
  onSave,
  onCancel,
  onToggleStatus,
}: StoreProductFormProps) {
  const t = useT();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-4">
      {submitError ? <ErrorBanner description={submitError} /> : null}

      <FormSection
        title={t("adminStore.products.infoSection")}
        description={t("adminStore.products.infoHint")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="product-name">{t("adminStore.products.nameLabel")}</Label>
            <Input
              id="product-name"
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={t("adminStore.products.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-slug">{t("adminStore.products.slugLabel")}</Label>
            <Input
              id="product-slug"
              value={form.slug}
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder={t("adminStore.products.slugPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category">{t("adminStore.table.category")}</Label>
            <select
              id="product-category"
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
            <Label htmlFor="product-description">{t("adminStore.products.descriptionLabel")}</Label>
            <textarea
              id="product-description"
              rows={4}
              value={form.description}
              onChange={(event) => onFieldChange("description", event.target.value)}
              placeholder={t("adminStore.products.descriptionPlaceholder")}
              className="admin-textarea min-h-[112px] resize-y"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.products.priceSection")}
        description={t("adminStore.products.priceHint")}
      >
        <div className="grid gap-4 lg:max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="product-price">{t("adminStore.products.singlePriceLabel")}</Label>
            <Input
              id="product-price"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => onFieldChange("price", event.target.value)}
              placeholder="25.00"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.products.promoSection")}
        description={t("adminStore.products.promoSectionHint")}
        actions={
          promotionVisible ? (
            <Button type="button" variant="outline" onClick={onRemovePromotion}>
              <Trash2 className="h-4 w-4" />
              {t("adminStore.products.promotionRemoveAction")}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onShowPromotion}>
              <Tag className="h-4 w-4" />
              {t("adminStore.products.promotionAddAction")}
            </Button>
          )
        }
      >
        {promotionVisible ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-promo-price">{t("adminStore.products.promoPriceLabel")}</Label>
              <Input
                id="product-promo-price"
                inputMode="decimal"
                value={form.promo_price}
                onChange={(event) => onFieldChange("promo_price", event.target.value)}
                placeholder="22.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-promo-label">{t("adminStore.products.promoLabelLabel")}</Label>
              <Input
                id="product-promo-label"
                value={form.promo_label}
                onChange={(event) => onFieldChange("promo_label", event.target.value)}
                placeholder={t("adminStore.products.promoLabelPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-promo-start">{t("adminStore.products.promoStartsLabel")}</Label>
              <Input
                id="product-promo-start"
                type="datetime-local"
                value={form.promo_starts_at}
                onChange={(event) => onFieldChange("promo_starts_at", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-promo-end">{t("adminStore.products.promoEndsLabel")}</Label>
              <Input
                id="product-promo-end"
                type="datetime-local"
                value={form.promo_ends_at}
                onChange={(event) => onFieldChange("promo_ends_at", event.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            <p>{t("adminStore.products.promotionCollapsedHint")}</p>
          </div>
        )}
      </FormSection>

      <FormSection
        title={t("adminStore.products.catalogSection")}
        description={t("adminStore.products.catalogHint")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-stock">{t("adminStore.products.stockLabel")}</Label>
            <Input
              id="product-stock"
              inputMode="numeric"
              value={form.stock_quantity}
              onChange={(event) => onFieldChange("stock_quantity", event.target.value)}
              placeholder="0"
              disabled={!form.track_stock}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-low-stock">{t("adminStore.products.lowStockLabel")}</Label>
            <Input
              id="product-low-stock"
              inputMode="numeric"
              value={form.low_stock_threshold}
              onChange={(event) => onFieldChange("low_stock_threshold", event.target.value)}
              placeholder="5"
              disabled={!form.track_stock}
            />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.activeToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.activeHint")}</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => onFieldChange("is_active", checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.featuredToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.featuredToggleHint")}</p>
            </div>
            <Switch
              checked={form.is_featured}
              onCheckedChange={(checked) => onFieldChange("is_featured", checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.trackStockToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.trackStockHint")}</p>
            </div>
            <Switch
              checked={form.track_stock}
              onCheckedChange={(checked) => onFieldChange("track_stock", checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.outOfStockToggle")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.outOfStockHint")}</p>
            </div>
            <Switch
              checked={form.allow_out_of_stock_orders}
              onCheckedChange={(checked) => onFieldChange("allow_out_of_stock_orders", checked)}
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Checkbox
              checked={form.available_for_pickup}
              onCheckedChange={(checked) =>
                onFieldChange("available_for_pickup", checked === true)
              }
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.pickupLabel")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.pickupHint")}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Checkbox
              checked={form.available_for_delivery}
              onCheckedChange={(checked) =>
                onFieldChange("available_for_delivery", checked === true)
              }
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{t("adminStore.products.deliveryLabel")}</p>
              <p className="text-xs text-slate-500">{t("adminStore.products.deliveryHint")}</p>
            </div>
          </label>
        </div>
      </FormSection>

      <FormSection
        title={t("adminStore.products.imagesSection")}
        description={t("adminStore.products.imagesHint")}
        actions={
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {t("adminStore.products.imagesUploadAction")}
          </Button>
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
            <p>{t("adminStore.products.imagesEmpty")}</p>
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
                        alt={image.altText || t("adminStore.products.imagePreviewAlt")}
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
                      <Label htmlFor={`product-image-alt-${image.clientId}`}>
                        {t("adminStore.products.imageAltLabel")}
                      </Label>
                      <Input
                        id={`product-image-alt-${image.clientId}`}
                        value={image.altText}
                        onChange={(event) =>
                          onImageAltChange(image.clientId, event.target.value)
                        }
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
        title={t("adminStore.products.actionsSection")}
        description={t("adminStore.products.actionsHint")}
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {mode === "create"
                  ? t("adminStore.products.createDescription")
                  : t("adminStore.products.editDescription")}
              </p>
              <p className="text-xs text-slate-500">{t("adminStore.products.actionsFootnote")}</p>
            </div>

            {mode === "edit" && onToggleStatus ? (
              <Button
                type="button"
                variant={form.is_active ? "destructive" : "outline"}
                onClick={onToggleStatus}
                disabled={statusActionPending}
                className={cn(!form.is_active && "border-slate-300")}
              >
                {form.is_active ? (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t("adminStore.products.deactivateAction")}
                  </>
                ) : (
                  <>
                    <Tag className="h-4 w-4" />
                    {t("adminStore.products.activate")}
                  </>
                )}
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
        saveLabel={mode === "create" ? t("adminStore.products.createAction") : t("common.save")}
        loadingLabel={t("common.saving")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
