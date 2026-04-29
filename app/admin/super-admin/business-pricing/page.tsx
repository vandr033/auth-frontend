"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, Loader2, RefreshCcw } from "lucide-react";

import {
  getSuperAdminBusinessPricing,
  updateSuperAdminBusinessPricingDiscounts,
  updateSuperAdminBusinessPricingProduct,
  type SuperAdminBusinessPricingConfig,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader, AdminPageShell, LoadingSkeleton } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import type {
  BusinessPricingProductKey,
  BusinessPricingProductType,
} from "@/lib/negocios/business-pricing";
import { useT } from "@/lib/i18n";

type ProductForm = {
  key: BusinessPricingProductKey;
  type: BusinessPricingProductType;
  displayName: string;
  monthlyPriceBs: string;
  isActive: boolean;
  isComingSoon: boolean;
  sortOrder: string;
};

type BundleTierForm = {
  id: number;
  minSelectedItems: string;
  discountPercent: string;
  label: string;
  isActive: boolean;
};

type SaveSection = "core" | "addons" | "discounts" | null;

function hydrateProductForms(config: SuperAdminBusinessPricingConfig): ProductForm[] {
  return config.products.map((product) => ({
    key: product.key,
    type: product.type,
    displayName: product.displayName,
    monthlyPriceBs: String(product.monthlyPriceBs),
    isActive: product.isActive,
    isComingSoon: product.isComingSoon,
    sortOrder: String(product.sortOrder),
  }));
}

function hydrateBundleTierForms(config: SuperAdminBusinessPricingConfig): BundleTierForm[] {
  return config.discounts.bundleTiers.map((tier) => ({
    id: tier.id,
    minSelectedItems: String(tier.minSelectedItems),
    discountPercent: String(tier.discountPercent),
    label: tier.label,
    isActive: tier.isActive,
  }));
}

function toNumber(value: string) {
  return Number(value.trim());
}

export default function SuperAdminBusinessPricingPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSection, setSavingSection] = useState<SaveSection>(null);
  const [pricingConfig, setPricingConfig] = useState<SuperAdminBusinessPricingConfig | null>(null);
  const [productForms, setProductForms] = useState<ProductForm[]>([]);
  const [bundleTierForms, setBundleTierForms] = useState<BundleTierForm[]>([]);
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState("15");
  const [trialLengthDays, setTrialLengthDays] = useState("30");
  const [firstMonthFree, setFirstMonthFree] = useState(true);

  const syncFromConfig = useCallback((config: SuperAdminBusinessPricingConfig) => {
    setPricingConfig(config);
    setProductForms(hydrateProductForms(config));
    setBundleTierForms(hydrateBundleTierForms(config));
    setAnnualDiscountPercent(String(config.discounts.annualDiscountPercent));
    setTrialLengthDays(String(config.discounts.trialLengthDays));
    setFirstMonthFree(config.discounts.firstMonthFree);
  }, []);

  const loadPricing = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextConfig = await getSuperAdminBusinessPricing();
      syncFromConfig(nextConfig);
    } catch (error) {
      await notify.error(
        error instanceof Error ? error.message : "No pudimos cargar la configuración de precios.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syncFromConfig]);

  useEffect(() => {
    void loadPricing();
  }, [loadPricing]);

  const coreProducts = useMemo(
    () => productForms.filter((product) => product.type === "CORE"),
    [productForms],
  );
  const addOnProducts = useMemo(
    () => productForms.filter((product) => product.type === "ADDON"),
    [productForms],
  );

  const updateProductForm = useCallback((key: BusinessPricingProductKey, patch: Partial<ProductForm>) => {
    setProductForms((current) =>
      current.map((product) => (product.key === key ? { ...product, ...patch } : product)),
    );
  }, []);

  const updateBundleTierForm = useCallback((id: number, patch: Partial<BundleTierForm>) => {
    setBundleTierForms((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    );
  }, []);

  const handleSaveProducts = useCallback(async (type: BusinessPricingProductType) => {
    const sectionKey = type === "CORE" ? "core" : "addons";
    const rows = productForms.filter((product) => product.type === type);

    setSavingSection(sectionKey);
    try {
      let latestConfig = pricingConfig;

      for (const product of rows) {
        latestConfig = await updateSuperAdminBusinessPricingProduct(product.key, {
          displayName: product.displayName.trim(),
          monthlyPriceBs: toNumber(product.monthlyPriceBs),
          isActive: product.isActive,
          isComingSoon: product.isComingSoon,
          sortOrder: Math.round(toNumber(product.sortOrder)),
        });
      }

      if (latestConfig) {
        syncFromConfig(latestConfig);
      }

      await notify.success("Precios actualizados");
    } catch (error) {
      await notify.error(
        error instanceof Error ? error.message : "No pudimos actualizar los productos.",
      );
    } finally {
      setSavingSection(null);
    }
  }, [pricingConfig, productForms, syncFromConfig]);

  const handleSaveDiscounts = useCallback(async () => {
    setSavingSection("discounts");
    try {
      const nextConfig = await updateSuperAdminBusinessPricingDiscounts({
        bundleTiers: bundleTierForms.map((tier) => ({
          minSelectedItems: Math.round(toNumber(tier.minSelectedItems)),
          discountPercent: toNumber(tier.discountPercent),
          label: tier.label.trim(),
          isActive: tier.isActive,
        })),
        annualDiscountPercent: toNumber(annualDiscountPercent),
        trialLengthDays: Math.round(toNumber(trialLengthDays)),
        firstMonthFree,
      });

      syncFromConfig(nextConfig);
      await notify.success("Precios actualizados");
    } catch (error) {
      await notify.error(
        error instanceof Error ? error.message : "No pudimos actualizar los descuentos.",
      );
    } finally {
      setSavingSection(null);
    }
  }, [
    annualDiscountPercent,
    bundleTierForms,
    firstMonthFree,
    trialLengthDays,
    syncFromConfig,
  ]);

  if (loading) {
    return <LoadingSkeleton variant="page" rows={6} />;
  }

  if (!pricingConfig) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow={t("adminNav.superAdmin")}
          title="Precios de productos"
          subtitle="No pudimos cargar la configuración de precios."
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow={t("adminNav.superAdmin")}
        title="Precios de productos"
        subtitle="Editá los precios públicos, descuentos y prueba gratis que impactan directamente en /negocios y en el alta self-service."
        actions={
          <Button
            variant="outline"
            onClick={() => void loadPricing("refresh")}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Recargar
          </Button>
        }
      />

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgePercent className="h-4 w-4 text-admin-brand" />
              Productos core
            </CardTitle>
            <p className="text-sm text-slate-500">
              Estos productos definen la base del plan modular en /negocios.
            </p>
          </div>
          <Button
            onClick={() => void handleSaveProducts("CORE")}
            disabled={savingSection !== null}
            className="bg-admin-brand text-white hover:bg-admin-brand-hover"
          >
            {savingSection === "core" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar core
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {coreProducts.map((product) => (
            <article key={product.key} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`product-name-${product.key}`}>Nombre visible</Label>
                  <Input
                    id={`product-name-${product.key}`}
                    value={product.displayName}
                    onChange={(event) => updateProductForm(product.key, { displayName: event.target.value })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`product-price-${product.key}`}>Precio mensual Bs</Label>
                    <Input
                      id={`product-price-${product.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.monthlyPriceBs}
                      onChange={(event) => updateProductForm(product.key, { monthlyPriceBs: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`product-order-${product.key}`}>Orden</Label>
                    <Input
                      id={`product-order-${product.key}`}
                      type="number"
                      min="0"
                      step="1"
                      value={product.sortOrder}
                      onChange={(event) => updateProductForm(product.key, { sortOrder: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Activo</p>
                      <p className="text-xs text-slate-500">Disponible para seleccionar</p>
                    </div>
                    <Switch
                      checked={product.isActive}
                      onCheckedChange={(checked) => updateProductForm(product.key, { isActive: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Próximamente</p>
                      <p className="text-xs text-slate-500">Visible pero bloqueado</p>
                    </div>
                    <Switch
                      checked={product.isComingSoon}
                      onCheckedChange={(checked) => updateProductForm(product.key, { isComingSoon: checked })}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Add-ons</CardTitle>
            <p className="text-sm text-slate-500">
              Estos precios afectan el configurador modular, el resumen y el alta pública.
            </p>
          </div>
          <Button
            onClick={() => void handleSaveProducts("ADDON")}
            disabled={savingSection !== null}
            className="bg-admin-brand text-white hover:bg-admin-brand-hover"
          >
            {savingSection === "addons" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar add-ons
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {addOnProducts.map((product) => (
            <article key={product.key} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`addon-name-${product.key}`}>Nombre visible</Label>
                  <Input
                    id={`addon-name-${product.key}`}
                    value={product.displayName}
                    onChange={(event) => updateProductForm(product.key, { displayName: event.target.value })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`addon-price-${product.key}`}>Precio mensual Bs</Label>
                    <Input
                      id={`addon-price-${product.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.monthlyPriceBs}
                      onChange={(event) => updateProductForm(product.key, { monthlyPriceBs: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`addon-order-${product.key}`}>Orden</Label>
                    <Input
                      id={`addon-order-${product.key}`}
                      type="number"
                      min="0"
                      step="1"
                      value={product.sortOrder}
                      onChange={(event) => updateProductForm(product.key, { sortOrder: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Activo</p>
                      <p className="text-xs text-slate-500">Disponible para seleccionar</p>
                    </div>
                    <Switch
                      checked={product.isActive}
                      onCheckedChange={(checked) => updateProductForm(product.key, { isActive: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Próximamente</p>
                      <p className="text-xs text-slate-500">Visible pero bloqueado</p>
                    </div>
                    <Switch
                      checked={product.isComingSoon}
                      onCheckedChange={(checked) => updateProductForm(product.key, { isComingSoon: checked })}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Descuentos bundle</CardTitle>
            <p className="text-sm text-slate-500">
              El bundle cuenta productos core activos y add-ons activos. Tienda no cuenta mientras esté coming soon o inactivo.
            </p>
          </div>
          <Button
            onClick={() => void handleSaveDiscounts()}
            disabled={savingSection !== null}
            className="bg-admin-brand text-white hover:bg-admin-brand-hover"
          >
            {savingSection === "discounts" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar descuentos y prueba
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {bundleTierForms.map((tier) => (
              <div key={tier.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
                <div className="grid gap-2">
                  <Label htmlFor={`tier-min-${tier.id}`}>Mínimo de selecciones</Label>
                  <Input
                    id={`tier-min-${tier.id}`}
                    type="number"
                    min="1"
                    step="1"
                    value={tier.minSelectedItems}
                    onChange={(event) => updateBundleTierForm(tier.id, { minSelectedItems: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tier-discount-${tier.id}`}>Porcentaje de descuento</Label>
                  <Input
                    id={`tier-discount-${tier.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tier.discountPercent}
                    onChange={(event) => updateBundleTierForm(tier.id, { discountPercent: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tier-label-${tier.id}`}>Etiqueta</Label>
                  <Input
                    id={`tier-label-${tier.id}`}
                    value={tier.label}
                    onChange={(event) => updateBundleTierForm(tier.id, { label: event.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 md:min-w-[180px]">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Activo</p>
                    <p className="text-xs text-slate-500">Visible en /negocios</p>
                  </div>
                  <Switch
                    checked={tier.isActive}
                    onCheckedChange={(checked) => updateBundleTierForm(tier.id, { isActive: checked })}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-2 rounded-xl border border-slate-200 p-4">
              <Label htmlFor="annualDiscountPercent">Descuento anual (%)</Label>
              <Input
                id="annualDiscountPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={annualDiscountPercent}
                onChange={(event) => setAnnualDiscountPercent(event.target.value)}
              />
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 p-4">
              <Label htmlFor="trialLengthDays">Duración de prueba (días)</Label>
              <Input
                id="trialLengthDays"
                type="number"
                min="0"
                max="365"
                step="1"
                value={trialLengthDays}
                onChange={(event) => setTrialLengthDays(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Primer mes gratis</p>
                <p className="text-xs text-slate-500">
                  Se refleja en /negocios y en el resumen del alta.
                </p>
              </div>
              <Switch checked={firstMonthFree} onCheckedChange={setFirstMonthFree} />
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
