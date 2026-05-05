"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteAdminCommerceProduct,
  deleteAdminCommerceProductImage,
  getAdminCommerceProduct,
  listAdminCommerceCategories,
  reorderAdminCommerceProductImages,
  setAdminCommerceProductPrimaryImage,
  updateAdminCommerceProduct,
  updateAdminCommerceProductImage,
  uploadAdminCommerceProductImage,
  createAdminCommerceProduct,
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

import { StoreProductForm } from "./StoreProductForm";
import {
  INITIAL_PRODUCT_FORM_STATE,
  buildPendingProductImage,
  buildProductEditorImages,
  buildProductFormState,
  buildProductPayload,
  moveItem,
  productHasPromotion,
  slugify,
  type ProductEditorImage,
  type ProductFormState,
} from "./store-product-shared";

const PRODUCTS_BASE_PATH = "/admin/dashboard/store/products";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function StoreProductEditorPage({ productId }: { productId?: string }) {
  const t = useT();
  const router = useRouter();
  const isEditing = Boolean(productId);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusActionPending, setStatusActionPending] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<AdminCommerceCategory[]>([]);
  const [form, setForm] = React.useState<ProductFormState>(INITIAL_PRODUCT_FORM_STATE);
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

  const hydrateFromProduct = React.useCallback((product: AdminCommerceProduct) => {
    setForm(buildProductFormState(product));
    setImages(buildProductEditorImages(product));
    setPromotionVisible(productHasPromotion(product));
    setRemovedImageIds([]);
    setSlugTouched(true);
  }, []);

  const loadData = React.useCallback(async () => {
    const [nextCategories, nextProduct] = await Promise.all([
      listAdminCommerceCategories(),
      productId ? getAdminCommerceProduct(productId) : Promise.resolve(null),
    ]);

    setCategories(nextCategories);

    if (nextProduct) {
      if (nextProduct.product_type === "COMBO") {
        router.replace(`/admin/dashboard/store/combos/${nextProduct.id}`);
        return nextProduct;
      }

      hydrateFromProduct(nextProduct);
      return nextProduct;
    }

    setForm(INITIAL_PRODUCT_FORM_STATE);
    setImages([]);
    setPromotionVisible(false);
    setRemovedImageIds([]);
    setSlugTouched(false);
    return null;
  }, [hydrateFromProduct, productId, router]);

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

  const canSubmit =
    !saving &&
    form.name.trim().length > 0 &&
    form.slug.trim().length > 0 &&
    form.price.trim().length > 0;

  const handleFieldChange = React.useCallback(
    <Key extends keyof ProductFormState>(field: Key, value: ProductFormState[Key]) => {
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

  const syncImages = React.useCallback(async (targetProductId: string) => {
    const nextImages = [...images];

    for (const imageId of removedImageIds) {
      await deleteAdminCommerceProductImage(targetProductId, imageId);
    }

    for (let index = 0; index < nextImages.length; index += 1) {
      const image = nextImages[index];
      if (!image?.isNew || !image.file) continue;

      const uploaded = await uploadAdminCommerceProductImage({
        productId: targetProductId,
        file: image.file,
        altText: image.altText,
        sortOrder: index,
        isPrimary: false,
      });

      if (!uploaded.image?.id) {
        throw new Error(t("adminStore.products.imageUploadFailed"));
      }

      revokeObjectUrl(image.imageUrl);
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
      await updateAdminCommerceProductImage(targetProductId, image.persistedId, {
        alt_text: image.altText.trim() || null,
      });
    }

    const imageIds = nextImages
      .map((image) => image.persistedId)
      .filter((imageId): imageId is string => Boolean(imageId));

    if (imageIds.length > 0) {
      await reorderAdminCommerceProductImages(targetProductId, imageIds);

      const primaryImage = nextImages.find((image) => image.isPrimary) ?? nextImages[0];
      if (primaryImage?.persistedId) {
        await setAdminCommerceProductPrimaryImage(targetProductId, primaryImage.persistedId);
      }
    }

    return getAdminCommerceProduct(targetProductId);
  }, [images, removedImageIds, revokeObjectUrl, t]);

  const handleSave = React.useCallback(async () => {
    try {
      setSaving(true);
      setSubmitError(null);

      const payload = buildProductPayload({
        editor: form,
        productId,
        promotionEnabled: promotionVisible,
        t,
      });

      const savedProduct = productId
        ? await updateAdminCommerceProduct(productId, payload)
        : await createAdminCommerceProduct(payload);

      const hasImageChanges = images.length > 0 || removedImageIds.length > 0;
      const refreshed = hasImageChanges
        ? await syncImages(savedProduct.id)
        : savedProduct;

      if (productId) {
        hydrateFromProduct(refreshed);
        notify.success(t("adminStore.products.updated"));
      } else {
        notify.success(t("adminStore.products.created"));
        router.replace(`${PRODUCTS_BASE_PATH}/${refreshed.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      setSubmitError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    form,
    hydrateFromProduct,
    images.length,
    productId,
    promotionVisible,
    removedImageIds.length,
    router,
    syncImages,
    t,
  ]);

  const handleToggleStatus = React.useCallback(async () => {
    if (!productId) return;

    if (form.is_active) {
      setStatusDialogOpen(true);
      return;
    }

    try {
      setStatusActionPending(true);
      const updated = await updateAdminCommerceProduct(productId, {
        is_active: true,
      });
      hydrateFromProduct(updated);
      notify.success(t("adminStore.products.activated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.products.toggleFailed");
      notify.error(message);
    } finally {
      setStatusActionPending(false);
    }
  }, [form.is_active, hydrateFromProduct, productId, t]);

  const confirmDeactivate = React.useCallback(async () => {
    if (!productId) return;

    try {
      setStatusActionPending(true);
      const updated = await deleteAdminCommerceProduct(productId);
      hydrateFromProduct(updated);
      notify.success(t("adminStore.products.deactivated"));
      setStatusDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("adminStore.products.toggleFailed");
      notify.error(message);
    } finally {
      setStatusActionPending(false);
    }
  }, [hydrateFromProduct, productId, t]);

  if (loading) {
    return <LoadingSkeleton variant="page" rows={5} />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          isEditing
            ? t("adminStore.products.editTitle", {
                name: form.name || t("adminStore.products.productLabel"),
              })
            : t("adminStore.products.createTitle")
        }
        subtitle={
          isEditing
            ? t("adminStore.products.editPageDescription")
            : t("adminStore.products.newPageDescription")
        }
        actions={
          <Button asChild variant="outline">
            <Link href={PRODUCTS_BASE_PATH}>
              <ArrowLeft className="h-4 w-4" />
              {t("adminStore.products.backToList")}
            </Link>
          </Button>
        }
      />

      {loadError ? <ErrorBanner description={loadError} /> : null}

      {!loadError ? (
        <StoreProductForm
          mode={isEditing ? "edit" : "create"}
          categories={categories}
          form={form}
          images={images}
          promotionVisible={promotionVisible}
          canSubmit={canSubmit}
          saving={saving}
          submitError={submitError}
          statusActionPending={statusActionPending}
          onFieldChange={handleFieldChange}
          onNameChange={handleNameChange}
          onSlugChange={handleSlugChange}
          onShowPromotion={() => setPromotionVisible(true)}
          onRemovePromotion={() => {
            setPromotionVisible(false);
            setForm((current) => ({
              ...current,
              promo_price: "",
              promo_label: "",
              promo_starts_at: "",
              promo_ends_at: "",
            }));
          }}
          onAddImages={handleAddImages}
          onMoveImage={handleMoveImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onRemoveImage={handleRemoveImage}
          onImageAltChange={handleImageAltChange}
          onSave={() => void handleSave()}
          onCancel={() => router.push(PRODUCTS_BASE_PATH)}
          onToggleStatus={isEditing ? () => void handleToggleStatus() : undefined}
        />
      ) : null}

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={t("adminStore.products.deactivateConfirmTitle")}
        description={t("adminStore.products.deactivateConfirmDescription", {
          name: form.name || t("adminStore.products.productLabel"),
        })}
        confirmLabel={t("adminStore.products.deactivateAction")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        loading={statusActionPending}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
