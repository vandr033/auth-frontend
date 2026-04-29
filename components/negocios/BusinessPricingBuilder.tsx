"use client";

import { useMemo } from "react";
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
  applyPricingConfigToCatalog,
} from "@/lib/negocios/catalog";
import {
  DEFAULT_BUSINESS_PRICING_CONFIG,
  type BusinessPricingConfig,
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

function SelectionPill({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 whitespace-normal break-words px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]",
        tone === "dark"
          ? "border border-white/[0.16] bg-white/10 text-white"
          : "border border-black/10 bg-black/[0.03] text-black",
      )}
    >
      {children}
    </span>
  );
}

function ProductCard({
  productKey,
  title,
  price,
  description,
  bullets,
  selected,
  disabled,
  badge,
  note,
  variant,
  onToggle,
}: {
  productKey: PublicCoreProductKey | PublicAddOnKey;
  title: string;
  price: number;
  description: string;
  bullets: string[];
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  note?: string;
  variant: "core" | "addon";
  onToggle: () => void;
}) {
  const Icon = PRODUCT_ICONS[productKey] ?? Sparkles;
  const isCore = variant === "core";

  return (
    <article
      className={cn(
        "group relative flex h-full min-w-0 flex-col border transition-all duration-300",
        isCore ? "min-h-[280px] p-5 sm:p-6" : "min-h-[220px] p-5",
        selected
          ? "border-black bg-black text-white shadow-[0_22px_48px_rgba(5,5,5,0.2)]"
          : "border-black/[0.12] bg-white text-black hover:-translate-y-1 hover:border-black hover:shadow-[0_20px_40px_rgba(15,23,42,0.1)]",
        disabled &&
          "border-black/[0.08] bg-slate-100 text-slate-500 hover:translate-y-0 hover:border-black/[0.08] hover:shadow-none",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute right-[-18px] top-[-18px] h-24 w-24 rotate-[12deg] border transition-colors duration-300",
            selected
              ? "border-white/[0.12] bg-white/[0.06]"
              : "border-black/[0.06] bg-biz-yellow/[0.65]",
            disabled && "border-black/[0.05] bg-black/[0.03]",
          )}
        />
      </div>

      <div className="relative flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          {badge ? (
            <span className="inline-flex w-fit bg-biz-yellow px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
              {badge}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center border",
              selected
                ? "border-white/[0.16] bg-white/[0.08] text-white"
                : "border-black/10 bg-black/[0.03] text-black",
              disabled && "border-black/[0.08] bg-black/[0.03] text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <span
          className={cn(
            "inline-flex h-10 min-w-10 items-center justify-center border px-3 text-[10px] font-black uppercase tracking-[0.08em]",
            disabled
              ? "border-black/[0.08] bg-black/[0.03] text-slate-400"
              : selected
                ? "border-white/[0.16] bg-white/[0.08] text-white"
                : "border-black/10 bg-white text-black",
          )}
        >
          {disabled ? "Pronto" : selected ? "Activo" : "Listo"}
        </span>
      </div>

      <div className="relative mt-6 min-w-0 space-y-4">
        <div className="min-w-0">
          <h3
            className={cn(
              "max-w-full text-balance break-words font-business-display uppercase leading-[0.96] tracking-[-0.02em]",
              isCore ? "text-[clamp(1.8rem,3vw,2.7rem)]" : "text-[clamp(1.45rem,2.1vw,2.1rem)]",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-3 max-w-[34ch] text-sm leading-6 break-words",
              selected ? "text-white/[0.78]" : "text-slate-700",
              disabled && "text-slate-500",
            )}
          >
            {description}
          </p>
        </div>

        <div className="flex min-w-0 items-end justify-between gap-4">
          <p
            className={cn(
              "min-w-0 font-bebas text-[2.2rem] leading-none uppercase tracking-[0.04em]",
              selected ? "text-biz-yellow" : "text-biz-barbie-pink",
              disabled && "text-slate-400",
            )}
          >
            {formatBsCompact(price)}
          </p>
          <p
            className={cn(
              "shrink-0 text-[11px] font-black uppercase tracking-[0.08em]",
              selected ? "text-white/[0.58]" : "text-slate-500",
              disabled && "text-slate-400",
            )}
          >
            por mes
          </p>
        </div>

        <ul className="grid gap-2">
          {bullets.slice(0, 3).map((bullet) => (
            <li
              key={`${title}-${bullet}`}
              className={cn(
                "flex items-start gap-2 text-sm leading-[1.35rem]",
                selected ? "text-white/[0.76]" : "text-slate-700",
                disabled && "text-slate-500",
              )}
            >
              <Check className="mt-1 h-3.5 w-3.5 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-auto min-w-0 pt-6">
        {note ? (
          <p
            className={cn(
              "mb-4 max-w-[32ch] text-[11px] uppercase tracking-[0.08em] break-words",
              selected ? "text-white/[0.58]" : "text-slate-500",
              disabled && "text-slate-400",
            )}
          >
            {note}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center border text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-200",
            selected
              ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
              : "border-black text-black hover:bg-black hover:text-white",
            disabled &&
              "cursor-not-allowed border-black/[0.08] bg-black/[0.03] text-slate-400 hover:bg-black/[0.03] hover:text-slate-400",
          )}
        >
          {disabled ? "Próximamente" : selected ? "Seleccionado" : "Agregar"}
        </button>
      </div>
    </article>
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
      <span className="max-w-[14ch] text-right font-black text-white">{value}</span>
    </div>
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
  const { coreProducts: coreProductCards, addOns: addOnCards } = useMemo(
    () => applyPricingConfigToCatalog(pricingConfig),
    [pricingConfig],
  );
  const pricing = calculateBusinessPricing(value, pricingConfig);
  const hasCoreProducts = pricing.selectedItemCount > 0;

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

  const totalSelections = pricing.selectedItemCount;
  const bundleMessage =
    pricing.bundleDiscountPercent > 0
      ? `Tu combinación ya activó un ${pricing.bundleDiscountPercent}% de ahorro por combo.`
      : "Mientras más productos y herramientas sumás, más baja el total final.";

  return (
    <div className={cn("space-y-5", className)}>
      <div className="overflow-hidden border border-black/10 bg-white">
        <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6">
          <div>
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
              Configurador modular
            </p>
            <h3 className="mt-2 font-business-display text-[clamp(1.9rem,4vw,3rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
              Elegí tu base y armá el resto a medida.
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
          compact
            ? "xl:grid-cols-[minmax(0,1fr)_340px]"
            : "xl:grid-cols-[minmax(0,1fr)_370px]",
        )}
      >
        <div className="space-y-5">
          <section className="overflow-hidden border border-black/10 bg-white">
            <div className="grid gap-3 border-b border-black/[0.08] px-5 py-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
                  1. Producto principal
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(1.85rem,3.5vw,2.8rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
                  Elegí qué querés gestionar.
                </h4>
              </div>
              <p className="max-w-[40ch] text-sm leading-6 text-slate-700">
                Empezá por Reservas, Eventos o Clases. Tienda queda visible para que veas lo que viene, pero sigue bloqueada como Próximamente.
              </p>
            </div>

            <div className={cn("grid gap-4 p-4 sm:p-5", compact ? "lg:grid-cols-2" : "lg:grid-cols-2")}>
              {coreProductCards.map((product) => (
                <ProductCard
                  key={product.key}
                  productKey={product.key}
                  title={product.shortTitle}
                  price={product.priceMonthly}
                  description={product.tagline}
                  bullets={product.bullets}
                  selected={
                    product.key !== "TIENDA" &&
                    value.coreProducts.includes(product.key as SelectableCoreProductKey)
                  }
                  disabled={product.disabled}
                  badge={product.badge}
                  note={product.disabled ? "Se viene, pero todavía no se puede activar." : undefined}
                  variant="core"
                  onToggle={() => {
                    if (product.key === "TIENDA") return;
                    toggleCoreProduct(product.key as SelectableCoreProductKey);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="overflow-hidden border border-black/10 bg-[linear-gradient(180deg,rgba(6,180,227,0.08),rgba(255,255,255,0.96))]">
            <div className="grid gap-3 border-b border-black/[0.08] px-5 py-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-sky-surge">
                  2. Herramientas extra
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(1.85rem,3.5vw,2.8rem)] uppercase leading-[0.92] tracking-[-0.03em] text-biz-heading-dark">
                  Después sumá lo que te hace crecer.
                </h4>
              </div>
              <p className="max-w-[40ch] text-sm leading-6 text-slate-700">
                CRM Base, Personalización Base y Mensajería Base ya vienen incluidas. Estos extras desbloquean la parte más avanzada.
              </p>
            </div>

            {!hasCoreProducts ? (
              <div className="border-b border-black/[0.08] px-5 py-4 lg:px-6">
                <SelectionPill>
                  Elegí primero al menos un producto principal para activar extras.
                </SelectionPill>
              </div>
            ) : null}

            <div className={cn("grid gap-4 p-4 sm:p-5", compact ? "lg:grid-cols-2" : "lg:grid-cols-2")}>
              {addOnCards.map((product) => {
                const addOnKey = product.key as PublicAddOnKey;

                return (
                  <ProductCard
                    key={product.key}
                    productKey={product.key}
                    title={product.shortTitle}
                    price={product.priceMonthly}
                    description={product.tagline}
                    bullets={product.bullets}
                    selected={value.addOns.includes(addOnKey)}
                    disabled={!hasCoreProducts || product.disabled}
                    note={product.includedNote}
                    variant="addon"
                    onToggle={() => toggleAddOn(addOnKey)}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <aside
          className={cn(
            "relative border border-black bg-black p-4 text-white sm:p-5",
            compact
              ? "xl:sticky xl:top-4 xl:max-h-[calc(100vh-1.5rem)] xl:overflow-y-auto"
              : "xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto",
          )}
        >
          <div className="pointer-events-none absolute right-[-18px] top-4 rotate-[3deg] bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            {pricing.firstMonthFree ? "Primer mes gratis" : `${pricing.trialLengthDays} días`}
          </div>

          <div className="relative min-w-0">
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-yellow">
              Tu resumen
            </p>
            <h4 className="mt-2 max-w-[12ch] text-balance font-business-display text-[clamp(1.7rem,3vw,2.45rem)] uppercase leading-[0.94] tracking-[-0.03em]">
              Calculá tu plan.
            </h4>
            <p className="mt-2 max-w-[30ch] text-sm leading-6 text-white/[0.76]">
              {bundleMessage}
            </p>
            {isPricingLoading ? (
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.08em] text-white/45">
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
              <p className="mt-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.54]">
                {value.billingCycle === "annual" ? "Con contrato anual" : "Con pago mensual"}
              </p>
            </div>
          </div>

          <div className="mt-4 border border-white/10 bg-white/[0.06] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <SelectionPill tone="dark">{totalSelections} selecciones</SelectionPill>
              <SelectionPill tone="dark">
                {value.billingCycle === "annual" ? "Modo anual" : "Modo mensual"}
              </SelectionPill>
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
