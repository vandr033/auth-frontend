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
  ADD_ONS,
  CORE_PRODUCTS,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
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
        "inline-flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em]",
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
        "group relative flex h-full flex-col overflow-hidden border transition-all duration-300",
        isCore ? "min-h-[320px] p-6" : "min-h-[260px] p-5",
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

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
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

      <div className="relative mt-6 space-y-4">
        <div>
          <h3
            className={cn(
              "font-business-display uppercase leading-[0.88] tracking-[-0.03em]",
              isCore ? "text-[clamp(2.3rem,4vw,3.5rem)]" : "text-[clamp(1.9rem,3vw,2.8rem)]",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-3 max-w-[36ch] text-sm leading-7",
              selected ? "text-white/[0.78]" : "text-slate-700",
              disabled && "text-slate-500",
            )}
          >
            {description}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <p
            className={cn(
              "font-bebas text-[2.4rem] leading-none uppercase tracking-[0.04em]",
              selected ? "text-biz-yellow" : "text-biz-barbie-pink",
              disabled && "text-slate-400",
            )}
          >
            {price} Bs
          </p>
          <p
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.08em]",
              selected ? "text-white/[0.58]" : "text-slate-500",
              disabled && "text-slate-400",
            )}
          >
            por mes
          </p>
        </div>

        <ul className="grid gap-2">
          {bullets.slice(0, isCore ? 4 : 3).map((bullet) => (
            <li
              key={`${title}-${bullet}`}
              className={cn(
                "flex items-start gap-2 text-sm leading-6",
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

      <div className="relative mt-auto pt-6">
        {note ? (
          <p
            className={cn(
              "mb-4 max-w-[32ch] text-[11px] uppercase tracking-[0.08em]",
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
    <div className="flex items-center justify-between gap-4 border-t border-white/10 py-3 text-sm">
      <span className={cn("text-white/[0.72]", dimmed && "text-white/[0.54]")}>{label}</span>
      <span className="font-black text-white">{value}</span>
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

  const totalSelections = value.coreProducts.length + value.addOns.length;
  const bundleMessage =
    pricing.bundleDiscountPercent > 0
      ? `Tu combinación ya activó un ${pricing.bundleDiscountPercent}% de ahorro por combo.`
      : "Mientras más productos y herramientas sumás, más baja el total final.";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-hidden border border-black/10 bg-white">
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6">
          <div>
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
              Configurador modular
            </p>
            <h3 className="mt-2 font-business-display text-[clamp(2.1rem,5vw,3.6rem)] uppercase leading-[0.9] tracking-[-0.03em] text-biz-heading-dark">
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
              Anual +15%
            </BillingToggle>
            <span className="inline-flex min-h-11 items-center bg-biz-yellow px-4 text-[11px] font-black uppercase tracking-[0.08em] text-black">
              Primer mes gratis
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6",
          compact
            ? "xl:grid-cols-[minmax(0,1fr)_340px]"
            : "xl:grid-cols-[minmax(0,1fr)_390px]",
        )}
      >
        <div className="space-y-6">
          <section className="overflow-hidden border border-black/10 bg-white">
            <div className="grid gap-4 border-b border-black/[0.08] px-5 py-5 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
                  1. Producto principal
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(2rem,4vw,3.2rem)] uppercase leading-[0.9] tracking-[-0.03em] text-biz-heading-dark">
                  Elegí qué querés gestionar.
                </h4>
              </div>
              <p className="max-w-[42ch] text-sm leading-7 text-slate-700">
                Empezá por Reservas, Eventos o Clases. Tienda queda visible para que veas lo que viene, pero sigue bloqueada como Próximamente.
              </p>
            </div>

            <div className={cn("grid gap-4 p-4 sm:p-5", compact ? "lg:grid-cols-2" : "lg:grid-cols-2")}>
              {CORE_PRODUCTS.map((product) => (
                <ProductCard
                  key={product.key}
                  productKey={product.key}
                  title={product.title}
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
            <div className="grid gap-4 border-b border-black/[0.08] px-5 py-5 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
              <div>
                <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-sky-surge">
                  2. Herramientas extra
                </p>
                <h4 className="mt-2 font-business-display text-[clamp(2rem,4vw,3.2rem)] uppercase leading-[0.9] tracking-[-0.03em] text-biz-heading-dark">
                  Después sumá lo que te hace crecer.
                </h4>
              </div>
              <p className="max-w-[42ch] text-sm leading-7 text-slate-700">
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
              {ADD_ONS.map((product) => {
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
                    disabled={!hasCoreProducts}
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
            "relative h-fit overflow-hidden border border-black bg-black p-5 text-white sm:p-6",
            compact ? "xl:sticky xl:top-6" : "xl:sticky xl:top-24",
          )}
        >
          <div className="pointer-events-none absolute right-[-22px] top-6 rotate-[8deg] bg-biz-yellow px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            Primer mes gratis
          </div>

          <div className="relative">
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-yellow">
              Tu resumen
            </p>
            <h4 className="mt-2 max-w-[10ch] font-business-display text-[clamp(2.4rem,5vw,4.1rem)] uppercase leading-[0.88] tracking-[-0.03em]">
              Calculá tu plan.
            </h4>
            <p className="mt-4 max-w-[28ch] text-sm leading-7 text-white/[0.76]">
              {bundleMessage}
            </p>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                Hoy pagás
              </p>
              <p className="mt-3 font-business-display text-[clamp(2.2rem,5vw,3.2rem)] uppercase leading-none text-biz-yellow">
                0 Bs
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                Después del mes gratis
              </p>
              <p className="mt-3 font-business-display text-[clamp(2.2rem,5vw,3.2rem)] uppercase leading-none text-white">
                {formatBsAmount(pricing.finalMonthly)}
              </p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.54]">
                {value.billingCycle === "annual" ? "Con contrato anual" : "Con pago mensual"}
              </p>
            </div>
          </div>

          <div className="mt-6 border border-white/10 bg-white/[0.06] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SelectionPill tone="dark">{totalSelections} selecciones</SelectionPill>
              <SelectionPill tone="dark">
                {value.billingCycle === "annual" ? "Modo anual" : "Modo mensual"}
              </SelectionPill>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {pricing.selectedProducts.length > 0 ? (
                pricing.selectedProducts.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-transform duration-200 hover:-translate-y-0.5"
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
            <div className="mt-6 border border-biz-yellow/30 bg-biz-yellow/[0.12] p-4 text-sm text-biz-yellow">
              {pricing.validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <SummaryRow label="Primer mes" value="Gratis" />
            <SummaryRow label="Subtotal mensual" value={formatBsAmount(pricing.subtotalMonthly)} />
            <SummaryRow
              label="Descuento por bundle"
              value={
                pricing.bundleDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.bundleDiscountAmount)} (${pricing.bundleDiscountPercent}%)`
                  : "0.00 Bs"
              }
              dimmed={pricing.bundleDiscountPercent === 0}
            />
            <SummaryRow
              label="Descuento anual"
              value={
                pricing.annualDiscountPercent > 0
                  ? `-${formatBsAmount(pricing.annualDiscountAmount)} (${pricing.annualDiscountPercent}%)`
                  : "0.00 Bs"
              }
              dimmed={pricing.annualDiscountPercent === 0}
            />
            <SummaryRow label="Equivalente anual" value={formatBsAmount(pricing.finalAnnualEquivalent)} />
          </div>

          <div className="mt-6 space-y-3">
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
