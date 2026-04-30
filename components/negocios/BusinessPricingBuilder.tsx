"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Check,
  Dumbbell,
  MessageCircle,
  Sparkles,
  Store,
  SwatchBook,
  Ticket,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_BUSINESS_PRICING_CONFIG,
  getDefaultTierForCoreProduct,
  getTierByKey,
  type BusinessPricingConfig,
  type BusinessPricingCoreTierKey,
  type BusinessPricingProduct,
  type CoreTierSelection,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/business-pricing";
import {
  calculateBusinessPricing,
  formatBsAmount,
  formatBsCompact,
} from "@/lib/negocios/pricing";

type PricingSelectionState = {
  coreSelections: CoreTierSelection[];
  addOns: PublicAddOnKey[];
  billingCycle: PricingBillingCycle;
};

type BusinessPricingBuilderProps = {
  value: PricingSelectionState;
  onChange: (nextValue: PricingSelectionState) => void;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
  compact?: boolean;
  pricingConfig?: BusinessPricingConfig;
  isPricingLoading?: boolean;
};

const PRODUCT_ICONS: Record<
  PublicCoreProductKey | PublicAddOnKey,
  ComponentType<{ className?: string }>
> = {
  RESERVAS: CalendarDays,
  EVENTOS: Ticket,
  CLASES: Dumbbell,
  TIENDA: Store,
  PERSONALIZACION_PRO: SwatchBook,
  METRICAS: BarChart3,
  MENSAJERIA_PRO: MessageCircle,
  CRM_PRO: Users,
};

function BillingToggle({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center border px-4 text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-200",
        active
          ? "border-black bg-black text-white shadow-[0_12px_24px_rgba(5,5,5,0.12)]"
          : "border-black/[0.15] bg-white text-black hover:-translate-y-0.5 hover:border-black hover:bg-biz-yellow",
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  dimmed = false,
}: {
  label: string;
  value: string;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-white/10 py-2.5 text-sm">
      <span className={cn("min-w-0 text-white/[0.72]", dimmed && "text-white/[0.54]")}>{label}</span>
      <span className="max-w-[16ch] text-right font-black text-white">{value}</span>
    </div>
  );
}

function TierToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center border px-3 text-[10px] font-black uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black hover:bg-biz-yellow",
      )}
    >
      {label}
    </button>
  );
}

function CoreProductCard({
  product,
  activeSelection,
  onChooseTier,
  onRemove,
}: {
  product: BusinessPricingProduct;
  activeSelection?: CoreTierSelection;
  onChooseTier: (tierKey: BusinessPricingCoreTierKey) => void;
  onRemove: () => void;
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const activeTier = getTierByKey(product, activeSelection?.tierKey ?? getDefaultTierForCoreProduct(product.key as SelectableCoreProductKey));
  const isSelected = Boolean(activeSelection);
  const isDisabled = !product.isActive || product.isComingSoon;

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col border p-5 transition-all duration-300 sm:p-6",
        isSelected
          ? "border-black bg-black text-white shadow-[0_22px_48px_rgba(5,5,5,0.2)]"
          : "border-black/[0.12] bg-white text-black",
        isDisabled && "border-black/[0.08] bg-slate-100 text-slate-500",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center border",
              isSelected ? "border-white/[0.16] bg-white/[0.08] text-white" : "border-black/10 bg-black/[0.03] text-black",
              isDisabled && "border-black/[0.08] bg-black/[0.03] text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          {product.isComingSoon ? (
            <span className="inline-flex bg-biz-yellow px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
              Próximamente
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(product.tiers ?? []).map((tier) => (
            <TierToggle
              key={tier.tierKey}
              label={tier.label}
              active={activeTier?.tierKey === tier.tierKey}
              onClick={() => !isDisabled && onChooseTier(tier.tierKey)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 min-w-0">
        <h3 className="max-w-full text-balance break-words font-business-display text-[clamp(1.8rem,3vw,2.7rem)] uppercase leading-[0.96] tracking-[-0.02em]">
          {product.displayName}
        </h3>
        <p className={cn("mt-3 text-sm leading-6", isSelected ? "text-white/[0.78]" : "text-slate-700", isDisabled && "text-slate-500")}>
          {product.description}
        </p>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className={cn("text-[11px] font-black uppercase tracking-[0.08em]", isSelected ? "text-white/[0.58]" : "text-slate-500")}>
            {activeTier?.label ?? "Base"}
          </p>
          <p className={cn("mt-1 font-bebas text-[2.2rem] uppercase tracking-[0.04em]", isSelected ? "text-biz-yellow" : "text-biz-barbie-pink", isDisabled && "text-slate-400")}>
            {formatBsCompact(activeTier?.monthlyPriceBs ?? product.monthlyPriceBs)}
          </p>
        </div>
        <p className={cn("text-[11px] font-black uppercase tracking-[0.08em]", isSelected ? "text-white/[0.58]" : "text-slate-500")}>
          por mes
        </p>
      </div>

      <ul className="mt-5 grid gap-2">
        {(activeTier?.featureList ?? product.featureList).slice(0, 5).map((bullet) => (
          <li
            key={`${product.key}-${bullet}`}
            className={cn("flex items-start gap-2 text-sm leading-[1.35rem]", isSelected ? "text-white/[0.76]" : "text-slate-700", isDisabled && "text-slate-500")}
          >
            <Check className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {!isDisabled && activeTier?.label === "Base" && activeTier.proUnlocks.length > 0 ? (
        <div className={cn("mt-5 border p-3", isSelected ? "border-white/[0.12] bg-white/[0.06]" : "border-black/[0.08] bg-black/[0.03]")}>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.08em]", isSelected ? "text-biz-yellow" : "text-biz-barbie-pink")}>
            Pro desbloquea
          </p>
          <p className={cn("mt-2 text-sm leading-6", isSelected ? "text-white/[0.72]" : "text-slate-700")}>
            {activeTier.proUnlocks.join(" · ")}
          </p>
        </div>
      ) : null}

      <div className="mt-auto pt-6">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => (isSelected ? onRemove() : onChooseTier(activeTier?.tierKey ?? getDefaultTierForCoreProduct(product.key as SelectableCoreProductKey)))}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center border text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-200",
            isSelected
              ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
              : "border-black text-black hover:bg-black hover:text-white",
            isDisabled && "cursor-not-allowed border-black/[0.08] bg-black/[0.03] text-slate-400",
          )}
        >
          {isDisabled ? "Próximamente" : isSelected ? "Quitar" : `Agregar ${activeTier?.label ?? "Base"}`}
        </button>
      </div>
    </article>
  );
}

function AddOnProductCard({
  product,
  selected,
  disabled,
  onToggle,
}: {
  product: BusinessPricingProduct;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col border p-5 transition-all duration-300",
        selected
          ? "border-black bg-black text-white shadow-[0_22px_48px_rgba(5,5,5,0.2)]"
          : "border-black/[0.12] bg-white text-black",
        disabled && "border-black/[0.08] bg-slate-100 text-slate-500",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={cn("inline-flex h-11 w-11 items-center justify-center border", selected ? "border-white/[0.16] bg-white/[0.08] text-white" : "border-black/10 bg-black/[0.03] text-black", disabled && "border-black/[0.08] bg-black/[0.03] text-slate-400")}>
          <Icon className="h-5 w-5" />
        </span>
        {product.includedNote ? (
          <span className={cn("text-[10px] font-black uppercase tracking-[0.08em]", selected ? "text-biz-yellow" : "text-slate-500")}>
            Pro
          </span>
        ) : null}
      </div>

      <h3 className="mt-5 max-w-full text-balance break-words font-business-display text-[clamp(1.45rem,2.1vw,2.1rem)] uppercase leading-[0.96] tracking-[-0.02em]">
        {product.displayName}
      </h3>
      <p className={cn("mt-3 text-sm leading-6", selected ? "text-white/[0.78]" : "text-slate-700", disabled && "text-slate-500")}>
        {product.description}
      </p>

      <ul className="mt-5 grid gap-2">
        {product.featureList.slice(0, 5).map((bullet) => (
          <li
            key={`${product.key}-${bullet}`}
            className={cn("flex items-start gap-2 text-sm leading-[1.35rem]", selected ? "text-white/[0.76]" : "text-slate-700", disabled && "text-slate-500")}
          >
            <Check className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        {product.includedNote ? (
          <p className={cn("mb-4 text-[11px] uppercase tracking-[0.08em]", selected ? "text-white/[0.58]" : "text-slate-500")}>
            {product.includedNote}
          </p>
        ) : null}
        <div className="flex items-end justify-between gap-4">
          <p className={cn("font-bebas text-[2rem] uppercase tracking-[0.04em]", selected ? "text-biz-yellow" : "text-biz-barbie-pink", disabled && "text-slate-400")}>
            {formatBsCompact(product.monthlyPriceBs)}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className={cn(
              "inline-flex h-11 items-center justify-center border px-4 text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-200",
              selected
                ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
                : "border-black text-black hover:bg-black hover:text-white",
              disabled && "cursor-not-allowed border-black/[0.08] bg-black/[0.03] text-slate-400",
            )}
          >
            {selected ? "Quitar" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function BusinessPricingBuilder({
  value,
  onChange,
  ctaHref = "/negocios/crear-cuenta",
  ctaLabel = "Crear mi cuenta gratis",
  className,
  compact = false,
  pricingConfig = DEFAULT_BUSINESS_PRICING_CONFIG,
  isPricingLoading = false,
}: BusinessPricingBuilderProps) {
  const coreProducts = pricingConfig.products.filter((product) => product.type === "CORE");
  const addOnProducts = pricingConfig.products.filter((product) => product.type === "ADDON");
  const pricing = calculateBusinessPricing(value, pricingConfig);
  const hasCoreProducts = value.coreSelections.length > 0;

  const setCoreSelection = (selection: CoreTierSelection) => {
    const nextSelections = value.coreSelections.filter((item) => item.productKey !== selection.productKey);
    onChange({
      ...value,
      coreSelections: [...nextSelections, selection],
    });
  };

  const removeCoreSelection = (productKey: SelectableCoreProductKey) => {
    const nextCoreSelections = value.coreSelections.filter((item) => item.productKey !== productKey);
    onChange({
      ...value,
      coreSelections: nextCoreSelections,
      addOns: nextCoreSelections.length === 0 ? [] : value.addOns,
    });
  };

  const toggleAddOn = (key: PublicAddOnKey) => {
    if (!hasCoreProducts) return;
    const exists = value.addOns.includes(key);
    onChange({
      ...value,
      addOns: exists
        ? value.addOns.filter((item) => item !== key)
        : [...value.addOns, key],
    });
  };

  const bundleMessage =
    pricing.bundleDiscountPercent > 0
      ? `Tu combinación ya activó un ${pricing.bundleDiscountPercent}% de ahorro por combo.`
      : "Mientras más productos y herramientas sumás, más baja el total final.";

  return (
    <div className={cn("space-y-5 overflow-x-clip", className)}>
      <div className="overflow-hidden border border-black/10 bg-white">
        <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6">
          <div>
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
              Configurador modular
            </p>
            <h3 className="mt-2 font-business-display text-[clamp(1.9rem,4vw,3rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
              Mezclá Base y Pro como realmente opera tu negocio.
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <BillingToggle
              active={value.billingCycle === "monthly"}
              onClick={() => onChange({ ...value, billingCycle: "monthly" })}
            >
              Mensual
            </BillingToggle>
            <BillingToggle
              active={value.billingCycle === "annual"}
              onClick={() => onChange({ ...value, billingCycle: "annual" })}
            >
              Anual +{pricingConfig.discounts.annualDiscountPercent}%
            </BillingToggle>
            <span className="inline-flex min-h-11 items-center bg-biz-yellow px-4 text-[11px] font-black uppercase tracking-[0.08em] text-black">
              {pricing.firstMonthFree ? "Primer mes gratis" : `${pricing.trialLengthDays} días de prueba`}
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5",
          !compact && "xl:grid-cols-[minmax(0,1fr)_370px]",
        )}
      >
        <div className="space-y-5 min-w-0">
          <section className="overflow-hidden border border-black/10 bg-white">
            <div
              className={cn(
                "grid gap-3 border-b border-black/[0.08] px-5 py-4 lg:px-6",
                !compact && "lg:grid-cols-[0.95fr_1.05fr]",
              )}
            >
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
                  1. Producto principal
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(1.85rem,3.5vw,2.8rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
                  Elegí tu core y el tier correcto.
                </h4>
              </div>
              <p className="max-w-[40ch] text-sm leading-6 text-slate-700">
                Cada producto core tiene Base y Pro. Podés mezclar tiers sin forzar todo el combo al mismo nivel.
              </p>
            </div>

            <div className={cn("grid gap-4 p-4 sm:p-5", !compact && "lg:grid-cols-2")}>
              {coreProducts.map((product) => {
                if (product.key === "TIENDA") {
                  return (
                    <CoreProductCard
                      key={product.key}
                      product={product}
                      onChooseTier={() => undefined}
                      onRemove={() => undefined}
                    />
                  );
                }

                const activeSelection = value.coreSelections.find((item) => item.productKey === product.key);
                return (
                  <CoreProductCard
                    key={product.key}
                    product={product}
                    activeSelection={activeSelection}
                    onChooseTier={(tierKey) => setCoreSelection({ productKey: product.key as SelectableCoreProductKey, tierKey })}
                    onRemove={() => removeCoreSelection(product.key as SelectableCoreProductKey)}
                  />
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden border border-black/10 bg-[linear-gradient(180deg,rgba(6,180,227,0.08),rgba(255,255,255,0.96))]">
            <div
              className={cn(
                "grid gap-3 border-b border-black/[0.08] px-5 py-4 lg:px-6",
                !compact && "lg:grid-cols-[0.95fr_1.05fr]",
              )}
            >
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-sky-surge">
                  2. Herramientas extra
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(1.85rem,3.5vw,2.8rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
                  Después sumá los módulos pro.
                </h4>
              </div>
              <p className="max-w-[40ch] text-sm leading-6 text-slate-700">
                Los add-ons siguen siendo tierless. Primero activás al menos un producto core y después armás el resto.
              </p>
            </div>

            <div className={cn("grid gap-4 p-4 sm:p-5", !compact && "lg:grid-cols-2")}>
              {addOnProducts.map((product) => (
                <AddOnProductCard
                  key={product.key}
                  product={product}
                  selected={value.addOns.includes(product.key as PublicAddOnKey)}
                  disabled={!hasCoreProducts || !product.isActive || product.isComingSoon}
                  onToggle={() => toggleAddOn(product.key as PublicAddOnKey)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside
          className={cn(
            "relative min-w-0 border border-black bg-black p-4 text-white sm:p-5",
            !compact && "xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto",
          )}
        >
          <div className="pointer-events-none absolute right-4 top-4 max-w-[9rem] bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            {pricing.firstMonthFree ? "Primer mes gratis" : `${pricing.trialLengthDays} días`}
          </div>

          <div className="relative min-w-0 pr-28">
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-yellow">
              Tu resumen
            </p>
            <h4 className="mt-2 text-balance font-business-display text-[clamp(1.7rem,3vw,2.4rem)] uppercase leading-[0.94] tracking-[-0.03em]">
              Plan mezclado, precio claro.
            </h4>
            <p className="mt-2 text-sm leading-6 text-white/[0.76]">
              {bundleMessage}
            </p>
            {isPricingLoading ? (
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.45]">
                Actualizando precios...
              </p>
            ) : null}
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="border border-white/10 bg-white/[0.06] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                Hoy pagás
              </p>
              <p className="mt-2 font-business-display text-[clamp(1.8rem,4vw,2.5rem)] uppercase leading-none text-biz-yellow">
                0 Bs
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.06] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                {pricing.firstMonthFree ? "Después del mes gratis" : "Después de la prueba"}
              </p>
              <p className="mt-2 font-business-display text-[clamp(1.8rem,4vw,2.5rem)] uppercase leading-none text-white">
                {formatBsAmount(pricing.finalMonthly)}
              </p>
            </div>
          </div>

          <div className="mt-4 border border-white/10 bg-white/[0.06] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 whitespace-normal break-words border border-white/[0.16] bg-white/[0.10] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                {pricing.selectedItemCount} selecciones
              </span>
              <span className="inline-flex max-w-full items-center gap-2 whitespace-normal break-words border border-white/[0.16] bg-white/[0.10] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                {value.billingCycle === "annual" ? "Modo anual" : "Modo mensual"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {pricing.selectedProducts.length > 0 ? (
                pricing.selectedProducts.map((item) => (
                  <span
                    key={item}
                    className="inline-flex max-w-full items-center whitespace-normal break-words bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-black"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-white/[0.68]">
                  Todavía no elegiste productos.
                </p>
              )}
            </div>
          </div>

          {pricing.validationErrors.length > 0 ? (
            <div className="mt-4 border border-biz-yellow/30 bg-biz-yellow/[0.12] p-3.5 text-sm text-biz-yellow">
              {pricing.validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <SummaryRow
              label={pricing.firstMonthFree ? "Primer mes" : "Prueba"}
              value={pricing.firstMonthFree ? "Gratis" : `${pricing.trialLengthDays} días`}
            />
            <SummaryRow label="Subtotal mensual" value={formatBsAmount(pricing.subtotalMonthly)} />
            <SummaryRow
              label="Descuento por bundle"
              value={
                pricing.bundleDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.bundleDiscountAmount)} (${pricing.bundleDiscountPercent}%)`
                  : formatBsAmount(0)
              }
              dimmed={pricing.bundleDiscountPercent === 0}
            />
            <SummaryRow
              label="Descuento anual"
              value={
                pricing.annualDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.annualDiscountAmount)} (${pricing.annualDiscountPercent}%)`
                  : formatBsAmount(0)
              }
              dimmed={pricing.annualDiscountPercent === 0}
            />
            <SummaryRow label="Equivalente anual" value={formatBsAmount(pricing.finalAnnualEquivalent)} />
          </div>

          <div className="mt-5 space-y-3">
            <Button
              asChild
              className="h-12 w-full rounded-none bg-biz-yellow text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-[#edf222]"
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            <Link
              href="/negocios#productos"
              className="inline-flex h-12 w-full items-center justify-center border border-white/[0.14] text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Ver productos
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
