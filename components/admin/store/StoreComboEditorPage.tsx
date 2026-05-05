"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
  createAdminCommerceCombo,
  deleteAdminCommerceCombo,
  deleteAdminCommerceComboImage,
  getAdminCommerceCombo,
  listAdminCommerceCategories,
  listAdminCommerceProducts,
  reorderAdminCommerceComboImages,
  setAdminCommerceComboPrimaryImage,
  updateAdminCommerceCombo,
  updateAdminCommerceComboImage,
  uploadAdminCommerceComboImage,
  type AdminCommerceCategory,
  type AdminCommerceProduct,
} from "@/app/admin/lib/adminCommerceApi";
import {
  AdminPageHeader,
  ConfirmDialog,
  ErrorBanner,
  LoadingSkeleton,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

import { StoreComboForm } from "./StoreComboForm";
import {
  INITIAL_COMBO_FORM_STATE,
  buildComboEditorImages,
  buildComboFormState,
  buildComboPayload,
  comboHasPromotion,
  getComboValidationMessage,
  type ComboFormState,
} from "./store-combo-shared";
import {
  buildPendingProductImage,
  moveItem,
  slugify,
  type ProductEditorImage,
} from "./store-product-shared";

const COMBOS_BASE_PATH = "/admin/dashboard/store/combos";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function StoreComboEditorPage({ comboId }: { comboId?: string }) {
  const t = useT();
  const router = useRouter();
  const { companyUser } = useAdminAuth();
  const currency = companyUser?.company?.currency ?? null;
  const isEditing = Boolean(comboId);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusActionPending, setStatusActionPending] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<AdminCommerceCategory[]>([]);
  const [sourceProducts, setSourceProducts] = React.useState<AdminCommerceProduct[]>([]);
  const [form, setForm] = React.useState<ComboFormState>(INITIAL_COMBO_FORM_STATE);
  const [images, setImages] = React.useState<ProductEditorImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = React.useState<string[]>([]);
  const [promotionVisible, setPromotionVisible] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const objectUrlsRef = React.useRef<Set<string>>(new Set());

  const revokeObjectUrl = React.useCallback((url: string) => {
    if (!url.startsWith("blob:")) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }, []);

  React.useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrls.clear();
    };
  }, []);

  const hydrateFromCombo = React.useCallback((combo: Awaited<ReturnType<typeof getAdminCommerceCombo>>) => {
    setForm(buildComboFormState(combo));
    setImages(buildComboEditorImages(combo));
    setPromotionVisible(comboHasPromotion(combo));
    setRemovedImageIds([]);
    setSlugTouched(true);
  }, []);

  const loadData = React.useCallback(async () => {
    const [nextCategories, nextProducts, nextCombo] = await Promise.all([
      listAdminCommerceCategories(),
      listAdminCommerceProducts({ productType: "SIMPLE" }),
      comboId ? getAdminCommerceCombo(comboId) : Promise.resolve(null),
    ]);

    setCategories(nextCategories);
    setSourceProducts(nextProducts);

    if (nextCombo) {
      if (nextCombo.product_type !== "COMBO") {
        router.replace(`/admin/dashboard/store/products/${nextCombo.id}`);
        return nextCombo;
      }

      hydrateFromCombo(nextCombo);
      return nextCombo;
    }

    setForm(INITIAL_COMBO_FORM_STATE);
    setImages([]);
    setPromotionVisible(false);
    setRemovedImageIds([]);
    setSlugTouched(false);
    return null;
  }, [comboId, hydrateFromCombo, router]);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setSubmitError(null);
        await loadData();
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
  }, [loadData, t]);

  const validationMessage = React.useMemo(
    () =>
      getComboValidationMessage({
        editor: form,
        comboId,
        promotionEnabled: promotionVisible,
        t,
      }),
    [comboId, form, promotionVisible, t],
  );

  const canSubmit =
    !saving &&
    !validationMessage &&
    form.name.trim().length > 0 &&
    form.slug.trim().length > 0;

  const handleFieldChange = React.useCallback(
    <Key extends keyof ComboFormState>(field: Key, value: ComboFormState[Key]) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleNameChange = React.useCallback(
    (value: string) => {
      setForm((current) => ({
        ...current,
        name: value,
        slug: slugTouched ? current.slug : slugify(value),
      }));
    },
    [slugTouched],
  );

  const handleSlugChange = React.useCallback((value: string) => {
    setSlugTouched(true);
    setForm((current) => ({
      ...current,
      slug: slugify(value),
    }));
  }, []);

  const handleAddImages = React.useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validImages: ProductEditorImage[] = [];
    const nextFiles = Array.from(files);

    for (const file of nextFiles) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        notify.error(t("adminStore.products.imageTypeError"));
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        notify.error(t("adminStore.products.imageSizeError"));
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      validImages.push(buildPendingProductImage(file, previewUrl));
    }

    if (validImages.length === 0) return;

    setImages((current) => {
      const hasPrimary = current.some((image) => image.isPrimary);
      if (!hasPrimary) {
        validImages[0] = {
          ...validImages[0],
          isPrimary: true,
        };
      }

      return [...current, ...validImages];
    });
  }, [t]);

  const handleMoveImage = React.useCallback((clientId: string, direction: -1 | 1) => {
    setImages((current) => {
      const currentIndex = current.findIndex((image) => image.clientId === clientId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      return moveItem(current, currentIndex, nextIndex);
    });
  }, []);

  const handleSetPrimaryImage = React.useCallback((clientId: string) => {
    setImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.clientId === clientId,
      })),
    );
  }, []);

  const handleRemoveImage = React.useCallback((clientId: string) => {
    setImages((current) => {
      const target = current.find((image) => image.clientId === clientId);
      if (!target) return current;

      if (target.isNew) {
        revokeObjectUrl(target.imageUrl);
      }

      if (target.persistedId) {
        setRemovedImageIds((existing) =>
          existing.includes(target.persistedId!) ? existing : [...existing, target.persistedId!],
        );
      }

      const nextImages = current.filter((image) => image.clientId !== clientId);
      if (target.isPrimary && nextImages.length > 0 && !nextImages.some((image) => image.isPrimary)) {
        nextImages[0] = {
          ...nextImages[0],
          isPrimary: true,
        };
      }

      return nextImages;
    });
  }, [revokeObjectUrl]);

  const handleImageAltChange = React.useCallback((clientId: string, value: string) => {
    setImages((current) =>
      current.map((image) =>
        image.clientId === clientId
          ? { ...image, altText: value }
          : image,
      ),
    );
  }, []);

  const handleAddItem = React.useCallback(() => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          rowId: crypto.randomUUID(),
          productId: sourceProducts[0]?.id ?? "",
          quantity: "1",
        },
      ],
    }));
  }, [sourceProducts]);

  const appendImagesFromProduct = React.useCallback((productId: string) => {
    const product = sourceProducts.find((p) => p.id === productId);
    if (!product?.images?.length) return;

    setImages((current) => {
      const seen = new Set(current.map(img => img.imageUrl));
      const derived: ProductEditorImage[] = [];

      const sorted = [...(product.images || [])].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      for (const img of sorted) {
        if (!img.image_url || seen.has(img.image_url)) continue;
        seen.add(img.image_url);
        derived.push({
          clientId: crypto.randomUUID(),
          persistedId: undefined,
          imageUrl: img.image_url,
          altText: img.alt_text || "",
          isPrimary: current.length === 0 && derived.length === 0, // first one becomes primary
          isNew: false,
          file: undefined,
        });
      }

      return [...current, ...derived];
    });
  }, [sourceProducts]);

  const handleItemChange = React.useCallback((
    rowId: string,
    field: "productId" | "quantity",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));

    // Auto-append images when a new product is selected in create mode
    if (field === "productId" && value && !comboId) {
      appendImagesFromProduct(value);
    }
  }, [appendImagesFromProduct, comboId]);

  const handleRemoveItem = React.useCallback((rowId: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.rowId !== rowId),
    }));
  }, []);

  // Sync images button for manual syncing if needed
  const handleSyncImagesFromProducts = React.useCallback(() => {
    const selectedProductIds = form.items.map((item) => item.productId).filter(Boolean);
    if (selectedProductIds.length === 0) return;

    const seen = new Set<string>();
    const derived: ProductEditorImage[] = [];

    for (const productId of selectedProductIds) {
      const product = sourceProducts.find((p) => p.id === productId);
      if (!product?.images?.length) continue;

      const sorted = [...(product.images || [])].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      for (const img of sorted) {
        if (!img.image_url || seen.has(img.image_url)) continue;
        seen.add(img.image_url);
        derived.push({
          clientId: crypto.randomUUID(),
          persistedId: undefined,
          imageUrl: img.image_url,
          altText: img.alt_text || "",
          isPrimary: derived.length === 0, // first one becomes primary
          isNew: false,
          file: undefined,
        });
      }
    }

    if (derived.length === 0) {
      notify.error(t("adminStore.combos.noProductImages") ?? "Los productos seleccionados no tienen imágenes.");
      return;
    }

    // Clear old persisted ids that need to be removed later
    setRemovedImageIds((existing) => [
      ...existing,
      ...images.filter((img) => img.persistedId).map((img) => img.persistedId!),
    ]);
    setImages(derived);
    notify.success(
      (t("adminStore.combos.imagesSyncedFromProducts") ?? "Imágenes sincronizadas desde los productos.") +
      ` (${derived.length})`,
    );
  }, [form.items, images, sourceProducts, t]);

  const syncImages = React.useCallback(async (targetComboId: string) => {
    const nextImages = [...images];

    for (const imageId of removedImageIds) {
      await deleteAdminCommerceComboImage(targetComboId, imageId);
    }

    for (let index = 0; index < nextImages.length; index += 1) {
      const image = nextImages[index];
      let fileToUpload = image.file;

      if (!image.persistedId && !fileToUpload && image.imageUrl) {
        try {
          const res = await fetch(image.imageUrl);
          const blob = await res.blob();
          const filename = image.imageUrl.split('/').pop() || 'combo-image.jpg';
          fileToUpload = new File([blob], filename, { type: blob.type });
        } catch (e) {
          console.error("Failed to fetch inherited image", e);
          continue;
        }
      }

      if (!fileToUpload) continue;

      const uploaded = await uploadAdminCommerceComboImage({
        comboId: targetComboId,
        file: fileToUpload,
        altText: image.altText,
        sortOrder: index,
        isPrimary: false,
      });

      if (!uploaded.image?.id) {
        throw new Error(t("adminStore.combos.imageUploadFailed"));
      }

      if (image.isNew) {
        revokeObjectUrl(image.imageUrl);
      }
      
      nextImages[index] = {
        ...image,
        persistedId: uploaded.image.id,
        imageUrl: uploaded.image.image_url,
        isNew: false,
        file: undefined,
      };
    }

    for (const image of nextImages) {
      if (!image.persistedId) continue;
      await updateAdminCommerceComboImage(targetComboId, image.persistedId, {
        alt_text: image.altText.trim() || null,
      });
    }

    const imageIds = nextImages
      .map((image) => image.persistedId)
      .filter((imageId): imageId is string => Boolean(imageId));

    if (imageIds.length > 0) {
      await reorderAdminCommerceComboImages(targetComboId, imageIds);

      const primaryImage = nextImages.find((image) => image.isPrimary) ?? nextImages[0];
      if (primaryImage?.persistedId) {
        await setAdminCommerceComboPrimaryImage(targetComboId, primaryImage.persistedId);
      }
    }

    return getAdminCommerceCombo(targetComboId);
  }, [images, removedImageIds, revokeObjectUrl, t]);

  const handleSave = React.useCallback(async () => {
    try {
      setSaving(true);
      setSubmitError(null);

      const payload = buildComboPayload({
        editor: form,
        comboId,
        promotionEnabled: promotionVisible,
        t,
      });

      const savedCombo = comboId
        ? await updateAdminCommerceCombo(comboId, payload)
        : await createAdminCommerceCombo(payload);

      const hasImageChanges = images.length > 0 || removedImageIds.length > 0;
      const refreshed = hasImageChanges
        ? await syncImages(savedCombo.id)
        : savedCombo;

      if (comboId) {
        hydrateFromCombo(refreshed);
        notify.success(t("adminStore.combos.updated"));
      } else {
        notify.success(t("adminStore.combos.created"));
        router.replace(`${COMBOS_BASE_PATH}/${refreshed.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      setSubmitError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    comboId,
    form,
    hydrateFromCombo,
    images.length,
    promotionVisible,
    removedImageIds.length,
    router,
    syncImages,
    t,
  ]);

  const handleToggleStatus = React.useCallback(async () => {
    if (!comboId) return;

    if (form.is_active) {
      setStatusDialogOpen(true);
      return;
    }

    try {
      setStatusActionPending(true);
      const updated = await updateAdminCommerceCombo(comboId, {
        is_active: true,
      });
      hydrateFromCombo(updated);
      notify.success(t("adminStore.combos.activated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.combos.toggleFailed");
      notify.error(message);
    } finally {
      setStatusActionPending(false);
    }
  }, [comboId, form.is_active, hydrateFromCombo, t]);

  const confirmDeactivate = React.useCallback(async () => {
    if (!comboId) return;

    try {
      setStatusActionPending(true);
      const updated = await deleteAdminCommerceCombo(comboId);
      hydrateFromCombo(updated);
      notify.success(t("adminStore.combos.deactivated"));
      setStatusDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.combos.toggleFailed");
      notify.error(message);
    } finally {
      setStatusActionPending(false);
    }
  }, [comboId, hydrateFromCombo, t]);

  if (loading) {
    return <LoadingSkeleton variant="page" rows={5} />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          isEditing
            ? t("adminStore.combos.editTitle", {
                name: form.name || t("adminStore.combos.comboLabel"),
              })
            : t("adminStore.combos.createTitle")
        }
        subtitle={
          isEditing
            ? t("adminStore.combos.editPageDescription")
            : t("adminStore.combos.newPageDescription")
        }
        actions={
          <Button asChild variant="outline">
            <Link href={COMBOS_BASE_PATH}>
              <ArrowLeft className="h-4 w-4" />
              {t("adminStore.combos.backToList")}
            </Link>
          </Button>
        }
      />

      {loadError ? <ErrorBanner description={loadError} /> : null}

      {!loadError ? (
        <StoreComboForm
          mode={isEditing ? "edit" : "create"}
          currency={currency}
          categories={categories}
          sourceProducts={sourceProducts}
          form={form}
          images={images}
          canSubmit={canSubmit}
          saving={saving}
          validationMessage={validationMessage}
          submitError={submitError}
          statusActionPending={statusActionPending}
          onFieldChange={handleFieldChange}
          onNameChange={handleNameChange}
          onSlugChange={handleSlugChange}
          onAddImages={handleAddImages}
          onMoveImage={handleMoveImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onRemoveImage={handleRemoveImage}
          onImageAltChange={handleImageAltChange}
          onAddItem={handleAddItem}
          onItemChange={handleItemChange}
          onRemoveItem={handleRemoveItem}
          onSave={() => void handleSave()}
          onCancel={() => router.push(COMBOS_BASE_PATH)}
          onToggleStatus={isEditing ? () => void handleToggleStatus() : undefined}
          onSyncImagesFromProducts={handleSyncImagesFromProducts}
        />
      ) : null}

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={t("adminStore.combos.deactivateConfirmTitle")}
        description={t("adminStore.combos.deactivateConfirmDescription", {
          name: form.name || t("adminStore.combos.comboLabel"),
        })}
        confirmLabel={t("adminStore.combos.deactivateAction")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        loading={statusActionPending}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
