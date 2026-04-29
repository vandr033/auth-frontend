"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADD_ONS,
  CORE_PRODUCTS,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/catalog";
import {
  calculateBusinessPricing,
  formatBsAmount,
} from "@/lib/negocios/pricing";

type PricingSelectionState = {
  coreProducts: SelectableCoreProductKey[];
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
};

function Pill({
  active,
  children,
  onClick,
  disabled = false,
}: {
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center border px-4 text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-black bg-black text-white"
          : "border-black/20 bg-white text-black hover:bg-black hover:text-white",
        disabled && "cursor-not-allowed border-black/10 bg-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-400",
      )}
    >
      {children}
    </button>
  );
}

function ProductCard({
  title,
  price,
  description,
  bullets,
  selected,
  disabled,
  badge,
  note,
  onToggle,
}: {
  title: string;
  price: number;
  description: string;
  bullets: string[];
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  note?: string;
  onToggle: () => void;
}) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col border p-5 transition-all",
        selected
          ? "border-black bg-black text-white shadow-[0_16px_36px_rgba(5,5,5,0.18)]"
          : "border-black/15 bg-white text-black",
        disabled && "border-black/10 bg-slate-100 text-slate-500",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge ? (
            <span className="inline-flex bg-biz-yellow px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
              {badge}
            </span>
          ) : null}
          <h3 className="mt-3 font-business-display text-[clamp(1.8rem,4vw,2.8rem)] uppercase leading-[0.9]">
            {title}
          </h3>
        </div>
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center border",
            selected
              ? "border-white/30 bg-white/10 text-white"
              : "border-black/20 bg-white text-black",
            disabled && "border-black/10 bg-slate-200 text-slate-400",
          )}
        >
          {disabled ? <Lock className="h-4 w-4" /> : selected ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
      </div>

      <p className={cn("mt-4 text-sm leading-6", selected ? "text-white/82" : "text-slate-700")}>
        {description}
      </p>
      <p
        className={cn(
          "mt-5 font-bebas text-[2rem] uppercase tracking-[0.04em]",
          selected ? "text-biz-yellow" : "text-biz-barbie-pink",
        )}
      >
        {price} Bs / mes
      </p>

      <ul className="mt-5 space-y-2">
        {bullets.map((bullet) => (
          <li
            key={`${title}-${bullet}`}
            className={cn(
              "text-sm leading-6",
              selected ? "text-white/78" : "text-slate-700",
            )}
          >
            {bullet}
          </li>
        ))}
      </ul>

      {note ? (
        <p className={cn("mt-4 text-xs uppercase tracking-[0.08em]", selected ? "text-white/65" : "text-slate-500")}>
          {note}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "mt-auto inline-flex h-11 items-center justify-center border text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
          selected
            ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
            : "border-black text-black hover:bg-black hover:text-white",
          disabled && "cursor-not-allowed border-black/10 bg-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-400",
        )}
      >
        {disabled ? "Próximamente" : selected ? "Seleccionado" : "Agregar"}
      </button>
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
}: BusinessPricingBuilderProps) {
  const pricing = calculateBusinessPricing(value);
  const hasCoreProducts = value.coreProducts.length > 0;

  const toggleCoreProduct = (key: SelectableCoreProductKey) => {
    const exists = value.coreProducts.includes(key);
    const coreProducts = exists
      ? value.coreProducts.filter((item) => item !== key)
      : [...value.coreProducts, key];

    onChange({
      ...value,
      coreProducts,
      addOns: coreProducts.length === 0 ? [] : value.addOns,
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

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Pill
          active={value.billingCycle === "monthly"}
          onClick={() => onChange({ ...value, billingCycle: "monthly" })}
        >
          Mensual
        </Pill>
        <Pill
          active={value.billingCycle === "annual"}
          onClick={() => onChange({ ...value, billingCycle: "annual" })}
        >
          Anual -15%
        </Pill>
        <span className="bg-biz-yellow px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
          Primer mes gratis. Sin tarjeta. Sin vueltas.
        </span>
      </div>

      <div className={cn("grid gap-4", compact ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
        {CORE_PRODUCTS.map((product) => (
          <ProductCard
            key={product.key}
            title={product.title}
            price={product.priceMonthly}
            description={product.tagline}
            bullets={product.bullets}
            selected={product.key !== "TIENDA" && value.coreProducts.includes(product.key as SelectableCoreProductKey)}
            disabled={product.disabled}
            badge={product.badge}
            note={product.disabled ? "Se viene, pero todavía no se puede activar." : undefined}
            onToggle={() => {
              if (product.key === "TIENDA") return;
              toggleCoreProduct(product.key as SelectableCoreProductKey);
            }}
          />
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bebas text-[15px] uppercase tracking-[0.14em] text-biz-barbie-pink">
              Add-ons
            </p>
            <h3 className="mt-1 font-business-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.88] text-biz-heading-dark">
              Sumá potencia cuando la necesités
            </h3>
          </div>
          {!hasCoreProducts ? (
            <p className="max-w-xs text-sm leading-6 text-slate-600">
              Elegí primero al menos un producto principal para activar add-ons.
            </p>
          ) : null}
        </div>

        <div className={cn("grid gap-4", compact ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
          {ADD_ONS.map((product) => {
            const addOnKey = product.key as PublicAddOnKey;

            return (
              <ProductCard
                key={product.key}
                title={product.title}
                price={product.priceMonthly}
                description={product.tagline}
                bullets={product.bullets}
                selected={value.addOns.includes(addOnKey)}
                disabled={!hasCoreProducts}
                note={product.includedNote}
                onToggle={() => toggleAddOn(addOnKey)}
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-black bg-white p-6">
          <p className="font-bebas text-[15px] uppercase tracking-[0.14em] text-biz-barbie-pink">
            Resumen
          </p>
          <h3 className="mt-2 font-business-display text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.88] text-biz-heading-dark">
            Calculá tu plan después del mes gratis
          </h3>
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3">
              <span>Subtotal mensual</span>
              <span className="font-black text-black">{formatBsAmount(pricing.subtotalMonthly)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3">
              <span>Descuento por bundle</span>
              <span className="font-black text-black">
                {pricing.bundleDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.bundleDiscountAmount)} (${pricing.bundleDiscountPercent}%)`
                  : "0.00 Bs"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3">
              <span>Descuento anual</span>
              <span className="font-black text-black">
                {pricing.annualDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.annualDiscountAmount)} (${pricing.annualDiscountPercent}%)`
                  : "0.00 Bs"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-base">
              <span>Total estimado por mes</span>
              <span className="font-black text-black">{formatBsAmount(pricing.finalMonthly)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-base">
              <span>Equivalente anual</span>
              <span className="font-black text-black">{formatBsAmount(pricing.finalAnnualEquivalent)}</span>
            </div>
          </div>
        </section>

        <section className="border border-black bg-black p-6 text-white">
          <p className="font-bebas text-[15px] uppercase tracking-[0.14em] text-biz-yellow">
            Tu selección
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pricing.selectedProducts.length > 0 ? (
              pricing.selectedProducts.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-sm leading-6 text-white/75">
                Todavía no elegiste productos.
              </span>
            )}
          </div>

          {pricing.validationErrors.length > 0 ? (
            <div className="mt-5 space-y-2 text-sm text-biz-yellow">
              {pricing.validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-white/76">
              El primer mes va por nuestra cuenta. Después, activás el plan que mejor cierre con tu operación.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              asChild
              className="h-12 rounded-none bg-biz-yellow text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-[#edf222]"
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            <Link
              href="/negocios#productos"
              className="inline-flex h-12 items-center justify-center border border-white/25 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Ver productos
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
