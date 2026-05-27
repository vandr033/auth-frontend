"use client";

import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Dumbbell,
  MessageCircle,
  Sparkles,
  Store,
  SwatchBook,
  Ticket,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BusinessPricingBuilder } from "@/components/negocios/BusinessPricingBuilder";
import { cn } from "@/lib/utils";
import {
  NEGOCIOS_HERO_COPY,
  applyPricingConfigToCatalog,
} from "@/lib/negocios/catalog";
import {
  type BusinessPricingCoreTierKey,
  getDefaultTierForCoreProduct,
  getTierByKey,
  type CoreTierSelection,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/business-pricing";
import {
  calculateBusinessPricing,
  formatBsAmount,
  formatBsCompact,
  sanitizePricingSelection,
} from "@/lib/negocios/pricing";
import { usePublicBusinessPricing } from "@/lib/negocios/usePublicBusinessPricing";

const FAQS = [
  {
    question: "¿Necesito tarjeta para empezar?",
    answer:
      "No. Podés crear tu cuenta y probar Priconpri por un mes sin ingresar tarjeta ni método de pago.",
  },
  {
    question: "¿Puedo cambiar mis productos después?",
    answer:
      "Sí. Podés empezar con un producto principal y después sumar más productos o extras según lo que necesite tu negocio.",
  },
  {
    question: "¿Qué pasa después del mes gratis?",
    answer:
      "Tu cuenta sigue existiendo y tus datos no se borran. Las funciones del plan quedan bloqueadas hasta que activés tu plan.",
  },
  {
    question: "¿Tienda ya está disponible?",
    answer:
      "Sí. Ya podés activar Tienda para vender productos, manejar pedidos y sumar checkout QR desde tu página pública.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Elegí lo que necesitás",
    description:
      "Arrancás con Reservas, Eventos o Clases. Después sumás las herramientas extra que hagan sentido para tu negocio.",
  },
  {
    step: "02",
    title: "Calculá tu plan",
    description:
      "Ves el ahorro por combo, el modo mensual o anual y cuánto queda después del primer mes gratis.",
  },
  {
    step: "03",
    title: "Creá tu cuenta",
    description:
      "Entrás al onboarding, configurás tu negocio y empezás a operar con el combo que elegiste.",
  },
];

const SECTORS = [
  {
    title: "Estética",
    note: "Citas, cabinas y seguimiento.",
    image: "/assets/priconpri/negocios cards/aesthetics.webp",
    className: "xl:col-span-4",
  },
  {
    title: "Bienestar",
    note: "Experiencia premium y recompra.",
    image: "/assets/priconpri/negocios cards/wellness.webp",
    className: "xl:col-span-4",
  },
  {
    title: "Movimiento",
    note: "Sesiones, cupos y recurrencia.",
    image: "/assets/priconpri/negocios cards/movement.webp",
    className: "xl:col-span-4 xl:translate-y-2",
  },
  {
    title: "Academias",
    note: "Clases, asistencia y alumnos.",
    image: "/assets/priconpri/negocios cards/health.webp",
    className: "xl:col-span-4",
  },
  {
    title: "Experiencias",
    note: "Entradas, registros y asistencia.",
    image: "/assets/priconpri/negocios cards/performance.webp",
    className: "xl:col-span-4",
  },
  {
    title: "Cuidado de piel",
    note: "Venta consultiva y seguimiento.",
    image: "/assets/priconpri/negocios cards/skincare.webp",
    className: "xl:col-span-4",
  },
];

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

function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-bebas text-[15px] uppercase tracking-[0.18em]",
        className,
      )}
    >
      {children}
    </p>
  );
}

function CoreProductFeature({
  index,
  product,
  activeSelection,
  onChooseTier,
}: {
  index: number;
  product: ReturnType<typeof applyPricingConfigToCatalog>["coreProducts"][number];
  activeSelection?: CoreTierSelection;
  onChooseTier?: (tierKey: BusinessPricingCoreTierKey) => void;
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const activeTier =
    product.key !== "TIENDA"
      ? getTierByKey(
          product as never,
          activeSelection?.tierKey ?? getDefaultTierForCoreProduct(product.key as SelectableCoreProductKey),
        )
      : null;
  const cardClasses = [
    "md:col-span-2 bg-black text-white",
    "bg-white text-black",
    "bg-[linear-gradient(135deg,rgba(6,180,227,0.12),rgba(255,255,255,0.98))] text-black",
    "md:col-span-2 bg-slate-100 text-slate-700",
  ];

  return (
    <article
      className={cn(
        "group relative min-w-0 border border-black p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6",
        cardClasses[index],
        product.disabled && "border-black/[0.08]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute right-[-24px] top-[-24px] h-28 w-28 rotate-[12deg] border",
            index === 0
              ? "border-white/[0.14] bg-white/[0.08]"
              : "border-black/[0.08] bg-biz-yellow/[0.22]",
          )}
        />
      </div>

      <div className="relative flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <span
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center border",
              index === 0
                ? "border-white/[0.16] bg-white/[0.08] text-white"
                : "border-black/[0.1] bg-black/[0.03] text-black",
              product.disabled && "border-black/[0.08] bg-black/[0.03] text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "inline-flex text-[11px] font-black uppercase tracking-[0.08em]",
              index === 0 ? "text-biz-yellow" : "text-biz-barbie-pink",
              product.disabled && "text-slate-500",
            )}
          >
            0{index + 1}
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {activeTier && !product.disabled ? (
            <>
              {(product.tiers ?? []).map((tier) => (
                <button
                  key={tier.tierKey}
                  type="button"
                  onClick={() => onChooseTier?.(tier.tierKey)}
                  className={cn(
                    "inline-flex h-10 items-center justify-center border px-3 text-[10px] font-black uppercase tracking-[0.08em]",
                    activeTier.tierKey === tier.tierKey
                      ? index === 0
                        ? "border-biz-yellow bg-biz-yellow text-black"
                        : "border-black bg-black text-white"
                      : index === 0
                        ? "border-white/[0.16] bg-white/[0.08] text-white"
                        : "border-black/[0.08] bg-white text-black",
                  )}
                >
                  {tier.label}
                </button>
              ))}
            </>
          ) : null}
          {product.badge ? (
            <span className="inline-flex bg-biz-yellow px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
              {product.badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mt-7 min-w-0 max-w-[34rem]">
        <h3 className="max-w-full text-balance break-words font-business-display text-[clamp(1.95rem,3.1vw,2.9rem)] uppercase leading-[0.96] tracking-[-0.02em]">
          {product.title}
        </h3>
        <p
          className={cn(
            "mt-3 max-w-[34ch] break-words text-sm leading-6",
            index === 0 ? "text-white/[0.78]" : "text-slate-700",
            product.disabled && "text-slate-500",
          )}
        >
          {product.tagline}
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {(activeTier?.featureList ?? product.bullets).slice(0, 3).map((bullet) => (
          <span
            key={`${product.key}-${bullet}`}
            className={cn(
              "inline-flex border px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em]",
              index === 0
                ? "border-white/[0.16] bg-white/[0.08] text-white"
                : "border-black/[0.08] bg-white/[0.8] text-black",
              product.disabled && "border-black/[0.08] bg-black/[0.02] text-slate-500",
            )}
          >
            {bullet}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex min-w-0 items-center justify-between gap-4">
        <p
          className={cn(
            "min-w-0 font-bebas text-[2.15rem] uppercase tracking-[0.04em]",
            index === 0 ? "text-biz-yellow" : "text-biz-barbie-pink",
            product.disabled && "text-slate-400",
          )}
        >
          {formatBsCompact(activeTier?.monthlyPriceBs ?? product.priceMonthly)}
        </p>

        <Link
          href={product.href}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 border px-5 text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
            product.disabled
              ? "cursor-not-allowed border-black/[0.08] bg-black/[0.03] text-slate-400"
              : index === 0
                ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
                : "border-black bg-black text-white hover:bg-biz-barbie-pink hover:border-biz-barbie-pink",
          )}
        >
          {product.disabled ? "Ver lo que viene" : activeTier ? `${product.shortTitle} ${activeTier.label}` : `Ver ${product.shortTitle}`}
          {!product.disabled ? <ArrowUpRight className="h-4 w-4" /> : null}
        </Link>
      </div>
    </article>
  );
}

function AddOnFeature({
  index,
  product,
}: {
  index: number;
  product: ReturnType<typeof applyPricingConfigToCatalog>["addOns"][number];
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const offsets = ["", "xl:translate-y-3", "", ""];
  const accents = ["text-biz-barbie-pink", "text-biz-sky-surge", "text-black", "text-biz-barbie-pink"];

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col border border-black/[0.08] bg-white p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6",
        offsets[index],
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center border border-black/[0.08] bg-black/[0.03] text-black">
          <Icon className="h-5 w-5" />
        </span>
        <span className={cn("text-[11px] font-black uppercase tracking-[0.08em]", accents[index])}>
          + módulo
        </span>
      </div>

      <h3 className="mt-5 max-w-full text-balance break-words font-business-display text-[clamp(1.45rem,2.1vw,2.05rem)] uppercase leading-[0.96] tracking-[-0.02em]">
        {product.shortTitle}
      </h3>
      <p className="mt-3 break-words text-sm leading-6 text-slate-700">{product.tagline}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {product.bullets.slice(0, 3).map((bullet) => (
          <span
            key={`${product.key}-${bullet}`}
            className="inline-flex border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black"
          >
            {bullet}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-6">
        {product.includedNote ? (
          <p className="mb-4 break-words text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {product.includedNote}
          </p>
        ) : null}

        <div className="flex min-w-0 items-center justify-between gap-4">
          <p className="font-bebas text-[2rem] uppercase tracking-[0.04em] text-biz-barbie-pink">
            {formatBsCompact(product.priceMonthly)}
          </p>
          <Link
            href={product.href}
            className="inline-flex h-11 items-center justify-center gap-2 border border-black px-4 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white"
          >
            Ver
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectorCard({
  sector,
}: {
  sector: (typeof SECTORS)[number];
}) {
  return (
    <article
      className={cn(
        "group relative min-h-[220px] overflow-hidden border border-black bg-black text-white",
        sector.className,
      )}
    >
      <Image
        src={sector.image}
        alt={sector.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        sizes="(max-width: 1280px) 100vw, 30vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.04),rgba(5,5,5,0.72))]" />
      <div className="absolute left-4 top-4 bg-biz-yellow px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
        Sector
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-business-display text-[clamp(1.95rem,3vw,2.7rem)] uppercase leading-[0.92] tracking-[-0.03em]">
          {sector.title}
        </h3>
        <p className="mt-2 max-w-[20ch] text-sm leading-6 text-white/[0.82]">
          {sector.note}
        </p>
      </div>
    </article>
  );
}

export function NegociosLandingPage() {
  const { pricingConfig, isLoading: pricingLoading } = usePublicBusinessPricing();
  const [selection, setSelection] = useState<{
    coreSelections: CoreTierSelection[];
    addOns: PublicAddOnKey[];
    billingCycle: "monthly" | "annual";
  }>({
    coreSelections: [
      {
        productKey: "RESERVAS",
        tierKey: getDefaultTierForCoreProduct("RESERVAS"),
      },
    ],
    addOns: [],
    billingCycle: "monthly",
  });

  const sanitizedSelection = useMemo(
    () => sanitizePricingSelection(selection, pricingConfig),
    [pricingConfig, selection],
  );
  const pricing = useMemo(
    () => calculateBusinessPricing(sanitizedSelection, pricingConfig),
    [pricingConfig, sanitizedSelection],
  );
  const { coreProducts, addOns } = useMemo(
    () => applyPricingConfigToCatalog(pricingConfig),
    [pricingConfig],
  );
  const bundleDiscountTiers = useMemo(() => {
    const seen = new Set<string>();

    return pricingConfig.discounts.bundleTiers.filter((tier) => {
      const key = `${tier.minSelectedItems}-${tier.discountPercent}-${tier.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pricingConfig]);
  const annualDiscountPercent = pricingConfig.discounts.annualDiscountPercent;
  const heroTrialLabel = pricing.firstMonthFree
    ? "Primer mes gratis"
    : `${pricing.trialLengthDays} días de prueba`;
  const heroAfterTrialLabel = pricing.firstMonthFree
    ? "Después del mes gratis"
    : "Después de la prueba";
  const heroBundleMessage =
    pricing.bundleDiscountPercent > 0
      ? `Tu combinación actual ya activa ${pricing.bundleDiscountPercent}% de ahorro por combo.`
      : "Sumá productos y extras para destrabar ahorro por combo sin meterte en un paquete cerrado.";

  useEffect(() => {
    setSelection((current) => {
      const nextSelection = sanitizePricingSelection(current, pricingConfig);
      const hasChanged =
        JSON.stringify(nextSelection.coreSelections) !== JSON.stringify(current.coreSelections) ||
        nextSelection.addOns.join("|") !== current.addOns.join("|");

      return hasChanged ? nextSelection : current;
    });
  }, [pricingConfig]);

  return (
    <main className="bg-biz-surface text-biz-heading-dark">
      <section
        id="inicio"
        className="relative isolate overflow-hidden border-b border-black/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(231,56,134,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(250,255,54,0.24),transparent_18%),linear-gradient(180deg,#f3f3f3_0%,#f6f2ed_100%)] lg:min-h-[calc(100svh-6rem)]"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[8%] top-16 h-20 w-32 bg-biz-sky-surge/[0.12] blur-3xl" />
          <div className="absolute bottom-6 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-biz-barbie-pink/[0.14] blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:px-10 lg:py-8 xl:gap-12 xl:py-10">
          <div className="relative z-10 flex max-w-[39rem] flex-col gap-5 lg:gap-6">
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center border border-black bg-biz-yellow px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[0_12px_20px_rgba(15,23,42,0.08)]">
                {heroTrialLabel}
              </span>
              <span className="inline-flex items-center border border-black/[0.1] bg-white/90 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Modular desde el día uno
              </span>
            </div>

            <div className="space-y-3">
              <SectionEyebrow className="text-biz-barbie-pink">
                Editorial pop premium
              </SectionEyebrow>
              <div className="space-y-3.5">
                <h1 className="max-w-[8ch] font-business-display text-[clamp(3.25rem,7vw,6.15rem)] uppercase leading-[0.84] tracking-[-0.04em]">
                  ARMÁ TU SISTEMA.
                </h1>
                <p className="max-w-[31rem] text-[clamp(1rem,1.55vw,1.14rem)] leading-7 text-slate-700">
                  Elegís Reservas, Eventos, Clases y los extras que te convienen. Armás un sistema a medida, lo probás gratis por un mes y activás solo lo que necesitás.
                </p>
                <p className="max-w-[34rem] text-sm leading-6 text-slate-600">
                  Ves una lógica comercial real desde el primer clic, con configuración viva, precio estimado y una página premium lista para vender más.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  asChild
                  className="h-12 rounded-none bg-biz-cta-primary px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_26px_rgba(231,56,134,0.26)] transition-transform hover:-translate-y-0.5 hover:bg-biz-cta-hover"
                >
                  <Link href="/negocios/crear-cuenta">
                    {NEGOCIOS_HERO_COPY.primaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-none border-black bg-white/70 px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-black hover:text-white"
                >
                  <Link href="#productos">{NEGOCIOS_HERO_COPY.secondaryCta}</Link>
                </Button>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                Sin tarjeta. Armás tu combinación y la activás cuando te cierre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden border border-black bg-black/[0.12] sm:grid-cols-3">
              <div className="bg-white p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Base activa
                </p>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <p className="font-business-display text-[2rem] uppercase leading-none">
                    {sanitizedSelection.coreSelections.length}
                  </p>
                  <p className="max-w-[8ch] text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {sanitizedSelection.coreSelections.length === 1 ? "producto core" : "productos core"}
                  </p>
                </div>
              </div>
              <div className="bg-white p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Extras
                </p>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <p className="font-business-display text-[2rem] uppercase leading-none">
                    {sanitizedSelection.addOns.length}
                  </p>
                  <p className="max-w-[8ch] text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {sanitizedSelection.addOns.length === 1 ? "módulo pro" : "módulos pro"}
                  </p>
                </div>
              </div>
              <div className="col-span-2 bg-black p-3.5 text-white sm:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                  {heroAfterTrialLabel}
                </p>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <p className="font-business-display text-[1.9rem] uppercase leading-none text-biz-yellow">
                    {formatBsAmount(pricing.finalMonthly)}
                  </p>
                  <p className="max-w-[9ch] text-right text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                    {selection.billingCycle === "annual" ? "modo anual" : "modo mensual"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[43rem] min-w-0">
            <div className="relative border border-black bg-white p-5 shadow-[0_24px_46px_rgba(15,23,42,0.12)] sm:p-6 lg:min-h-[28rem] lg:pr-[16.75rem] lg:rotate-[-0.5deg]">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="font-bebas text-[14px] uppercase tracking-[0.16em] text-biz-barbie-pink">
                    Configuración viva
                  </p>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Tu sistema
                    </p>
                    <p className="mt-1 max-w-[10ch] font-business-display text-[clamp(1.9rem,3vw,2.7rem)] uppercase leading-[0.9]">
                      Base + extras, bien configurado.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center border border-black/[0.1] bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black">
                  {selection.billingCycle === "annual" ? "Modo anual" : "Modo mensual"}
                </span>
              </div>

              <div className="mt-5 min-w-0 space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                    Productos elegidos
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {pricing.selectedProducts.map((item) => (
                      <span
                        key={item}
                        className="inline-flex border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="border border-black/[0.08] bg-black/[0.02] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Producto activo
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-black">
                      {sanitizedSelection.coreSelections.length}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      {sanitizedSelection.coreSelections.length === 1 ? "producto core" : "productos core"}
                    </p>
                  </div>
                  <div className="border border-black/[0.08] bg-black/[0.02] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Extras elegidos
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-black">
                      {sanitizedSelection.addOns.length}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      {sanitizedSelection.addOns.length === 1 ? "módulo pro" : "módulos pro"}
                    </p>
                  </div>
                  <div className="border border-black/[0.08] bg-black/[0.02] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Ahorro bundle
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-biz-barbie-pink">
                      {pricing.bundleDiscountPercent > 0 ? `-${pricing.bundleDiscountPercent}%` : "0%"}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      según productos core
                    </p>
                  </div>
                  <div className="border border-black/[0.08] bg-black/[0.02] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Mensual estimado
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-black">
                      {formatBsAmount(pricing.finalMonthly)}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                      después del mes gratis
                    </p>
                  </div>
                </div>

                <div className="border-t border-black/[0.08] pt-4">
                  <div className="flex flex-col items-start gap-2.5">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                        Cómo se arma
                      </p>
                      <p className="mt-1 max-w-[30rem] text-sm leading-6 text-slate-700">
                        Elegís tu core, sumás extras y el descuento se ajusta solo.
                      </p>
                      {pricingLoading ? (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Actualizando precios...
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href="#pricing"
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white"
                    >
                      Calcular precio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-4 min-w-0 border border-black bg-black p-4 text-white shadow-[0_24px_44px_rgba(5,5,5,0.16)] sm:p-5 lg:absolute lg:bottom-5 lg:right-5 lg:mt-0 lg:w-[14.5rem]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bebas text-[14px] uppercase tracking-[0.16em] text-biz-yellow">
                      Resumen premium
                    </p>
                    <p className="mt-2 font-business-display text-[clamp(1.65rem,2.6vw,2.3rem)] uppercase leading-[0.9]">
                      Hoy pagás 0 Bs.
                    </p>
                  </div>
                  <span className="inline-flex items-center border border-white/[0.14] bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    {selection.billingCycle === "annual" ? "Anual" : "Mensual"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="border border-white/[0.12] bg-white/[0.06] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                      {pricing.firstMonthFree ? "Primer mes" : "Prueba"}
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-biz-yellow">
                      {pricing.firstMonthFree ? "Gratis" : `${pricing.trialLengthDays} días`}
                    </p>
                  </div>
                  <div className="border border-white/[0.12] bg-white/[0.06] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                      {heroAfterTrialLabel}
                    </p>
                    <p className="mt-2 font-bebas text-[1.75rem] uppercase tracking-[0.04em] text-white">
                      {formatBsAmount(pricing.finalMonthly)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border border-white/[0.12] bg-white/[0.05] p-3.5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.08em]">
                    <span className="text-white/[0.58]">Selecciones</span>
                    <span className="text-white">{pricing.selectedItemCount}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.08em]">
                    <span className="text-white/[0.58]">Ahorro bundle</span>
                    <span className={pricing.bundleDiscountPercent > 0 ? "text-biz-yellow" : "text-white"}>
                      {pricing.bundleDiscountPercent > 0 ? `-${pricing.bundleDiscountPercent}%` : "0%"}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.08em]">
                    <span className="text-white/[0.58]">Equivalente anual</span>
                    <span className="text-white">{formatBsAmount(pricing.finalAnnualEquivalent)}</span>
                  </div>
                </div>

                <p className="mt-3 text-[12px] leading-5 text-white/[0.74]">
                  {heroBundleMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="productos" className="scroll-mt-20 border-b border-black/[0.08] bg-white px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[0.64fr_1.36fr]">
            <div className="max-w-[30rem]">
              <SectionEyebrow className="text-biz-barbie-pink">
                ELEGÍ QUÉ QUERÉS GESTIONAR.
              </SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.5rem,5vw,4.4rem)] uppercase leading-[0.88] tracking-[-0.04em]">
                El corazón de tu operación.
              </h2>
              <p className="mt-4 text-[1rem] leading-7 text-slate-700">
                Estos son los productos que realmente definen tu sistema. Son más grandes porque son la base desde donde después crece el resto.
              </p>
              <div className="mt-6 border border-black bg-biz-yellow p-4 text-black">
                <p className="text-[11px] font-black uppercase tracking-[0.08em]">
                  Punto de partida
                </p>
                <p className="mt-3 font-business-display text-[2.4rem] uppercase leading-[0.9]">
                  Reservas, Eventos, Clases y Tienda en un mismo sistema.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {coreProducts.map((product, index) => (
                <CoreProductFeature
                  key={product.key}
                  index={index}
                  product={product}
                  activeSelection={
                    product.key !== "TIENDA"
                      ? selection.coreSelections.find((item) => item.productKey === product.key)
                      : undefined
                  }
                  onChooseTier={(tierKey) => {
                    if (product.key === "TIENDA") return;
                    const productKey = product.key as SelectableCoreProductKey;
                    setSelection((current) => ({
                      ...current,
                      coreSelections: [
                        ...current.coreSelections.filter((item) => item.productKey !== productKey),
                        { productKey, tierKey },
                      ],
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="addons"
        className="scroll-mt-20 border-b border-black/[0.08] bg-[linear-gradient(180deg,#f6f2ed_0%,#eef7fb_100%)] px-6 py-12 lg:px-10 lg:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[0.62fr_1.38fr]">
            <div className="max-w-[28rem]">
              <SectionEyebrow className="text-biz-sky-surge">
                DESPUÉS SUMÁ HERRAMIENTAS PARA CRECER.
              </SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.3rem,4.6vw,3.9rem)] uppercase leading-[0.9] tracking-[-0.04em]">
                Módulos más livianos, impacto más profundo.
              </h2>
              <p className="mt-4 text-[1rem] leading-7 text-slate-700">
                Acá no compiten con el core. Se sienten como piezas que activás cuando tu marca, tu comunicación o tus números te piden un nivel más.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-start">
              {addOns.map((product, index) => (
                <AddOnFeature key={product.key} index={index} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="scroll-mt-20 border-b border-black/[0.08] bg-[linear-gradient(180deg,#ece8e3_0%,#f7f4ef_100%)] px-6 py-12 lg:px-10 lg:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr] xl:items-end">
            <div>
              <SectionEyebrow className="text-biz-barbie-pink">
                CALCULÁ TU PLAN DESPUÉS DEL MES GRATIS.
              </SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.5rem,5vw,4.5rem)] uppercase leading-[0.88] tracking-[-0.04em]">
                Un configurador que se siente a la altura.
              </h2>
            </div>
            <p className="max-w-[44ch] text-[1rem] leading-7 text-slate-700">
              La lógica no cambia: seguís eligiendo productos, extras, combo y anual como ahora. Lo que cambia es la presentación, el ritmo y el peso visual del resumen.
            </p>
          </div>

          <div className="mt-8">
            <BusinessPricingBuilder
              value={selection}
              onChange={setSelection}
              pricingConfig={pricingConfig}
              isPricingLoading={pricingLoading}
            />
          </div>
        </div>
      </section>

      <section id="bundle" className="scroll-mt-20 border-b border-black bg-biz-yellow px-6 py-12 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[0.76fr_1.24fr] xl:items-start">
            <div className="max-w-[34rem]">
              <SectionEyebrow className="text-black">
                MIENTRAS MÁS SUMÁS, MÁS AHORRÁS.
              </SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.7rem,5.8vw,4.8rem)] uppercase leading-[0.84] tracking-[-0.04em] text-black">
                EL DESCUENTO TAMBIÉN ES PARTE DEL PLAN.
              </h2>
              <p className="mt-4 max-w-[30rem] text-[1rem] leading-7 text-black/80">
                Cuando combinás más productos, el precio mejora automáticamente. Y si elegís contrato anual, sumás un descuento adicional.
              </p>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
              <article className="min-w-0 border border-black bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black pb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Tu combo mejora así
                    </p>
                    <p className="mt-2 font-business-display text-[clamp(1.9rem,3vw,2.8rem)] uppercase leading-[0.92] tracking-[-0.03em] text-black">
                      Descuento bundle
                    </p>
                  </div>
                  <span className="inline-flex items-center border border-black bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black">
                    automático
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {bundleDiscountTiers.map((tier, index) => (
                    <div
                      key={tier.label}
                      className={cn(
                        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-black p-4",
                        index === 0 ? "bg-[#f8f6f1]" : "bg-white",
                        index === 1 && "lg:translate-x-3",
                        index === 2 && "lg:translate-x-6",
                        index >= 3 && "lg:translate-x-9",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          {tier.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          Descuento por cantidad de productos core activos.
                        </p>
                      </div>
                      <p className="font-bebas text-[2.5rem] uppercase leading-none tracking-[0.04em] text-black">
                        {tier.discountPercent}%
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="flex min-w-0 flex-col justify-between border border-black bg-black p-5 text-white sm:p-6">
                <div>
                  <p className="font-bebas text-[14px] uppercase tracking-[0.16em] text-biz-yellow">
                    Contrato anual
                  </p>
                  <p className="mt-3 font-business-display text-[clamp(2rem,3.2vw,3rem)] uppercase leading-[0.9] tracking-[-0.03em] text-white">
                    +{annualDiscountPercent}% adicional
                  </p>
                  <p className="mt-4 text-sm leading-6 text-white/[0.76]">
                    Este descuento se suma encima del ahorro bundle cuando elegís facturación anual.
                  </p>
                </div>

                <div className="mt-5 border border-white/[0.12] bg-white/[0.06] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                    Cómo leerlo
                  </p>
                  <div className="mt-3 space-y-3 text-[11px] font-black uppercase tracking-[0.08em]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white/[0.58]">Bundle</span>
                      <span className="text-white">según productos core</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white/[0.58]">Anual</span>
                      <span className="text-biz-yellow">extra sobre el bundle</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="sectores" className="scroll-mt-20 border-b border-black/[0.08] bg-white px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 xl:grid-cols-12">
            <article className="border border-black bg-black p-5 text-white xl:col-span-4 xl:row-span-2 sm:p-6">
              <SectionEyebrow className="text-biz-yellow">
                HECHO PARA NEGOCIOS QUE VIVEN DE SU AGENDA, SUS CUPOS O SU COMUNIDAD.
              </SectionEyebrow>
              <h2 className="mt-4 font-business-display text-[clamp(2.3rem,4.2vw,3.6rem)] uppercase leading-[0.9] tracking-[-0.04em]">
                Sectores que necesitan ritmo, orden y marca.
              </h2>
              <p className="mt-4 max-w-[28ch] text-sm leading-6 text-white/[0.78]">
                Estética, bienestar, movimiento, estudios, academias y experiencias comparten una cosa: venden mejor cuando su operación no se siente improvisada.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["agenda", "cupos", "comunidad"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex border border-white/[0.12] bg-white/[0.08] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>

            {SECTORS.map((sector) => (
              <SectorCard key={sector.title} sector={sector} />
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 border-b border-black/[0.08] bg-[#f5f3ef] px-6 py-12 lg:px-10 lg:py-[3.75rem]">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow className="text-slate-500">EMPEZAR ES SIMPLE.</SectionEyebrow>
          <h2 className="mt-3 max-w-[16ch] font-business-display text-[clamp(2.4rem,4.8vw,4rem)] uppercase leading-[0.9] tracking-[-0.04em]">
            Tres pasos y entrás.
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <article key={item.step} className="border border-black/[0.08] bg-white p-5 sm:p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-biz-barbie-pink">
                  Paso {item.step}
                </p>
                <h3 className="mt-4 font-business-display text-[clamp(1.8rem,3vw,2.5rem)] uppercase leading-[0.92] tracking-[-0.03em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 border border-black bg-black px-6 py-6 text-white lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-biz-yellow">
                  CTA directo
                </p>
                <h3 className="mt-3 font-business-display text-[clamp(2rem,4vw,3.1rem)] uppercase leading-[0.9] tracking-[-0.04em]">
                  El primer mes es completamente gratis.
                </h3>
              </div>
              <Button
                asChild
                className="h-12 rounded-none bg-biz-yellow px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-[#edf222]"
              >
                <Link href="/negocios/crear-cuenta">Crear mi cuenta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-b border-black/[0.08] bg-white px-6 py-12 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[0.7fr_1.3fr]">
            <div>
              <SectionEyebrow className="text-biz-barbie-pink">Preguntas frecuentes</SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.3rem,4.4vw,3.8rem)] uppercase leading-[0.9] tracking-[-0.04em]">
                Lo que suele aparecer antes de activar.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {FAQS.map((item) => (
                <article key={item.question} className="border border-black/[0.08] bg-[#f6f2ed] p-5">
                  <h3 className="font-bebas text-[1.5rem] uppercase tracking-[0.05em] text-black">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-biz-barbie-pink px-6 py-12 text-black lg:px-10 lg:py-[3.75rem]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-4%] top-8 h-24 w-40 rotate-[-5deg] border border-black/[0.08] bg-white/[0.2]" />
          <div className="absolute right-[8%] top-10 h-40 w-40 rounded-full bg-biz-yellow/[0.38] blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <SectionEyebrow className="text-black">PROBÁ PRICONPRI GRATIS.</SectionEyebrow>
            <h2 className="mt-3 max-w-[12ch] font-business-display text-[clamp(2.9rem,6vw,5.1rem)] uppercase leading-[0.84] tracking-[-0.05em]">
              Cerrá la idea. Abrí tu cuenta.
            </h2>
            <p className="mt-4 max-w-[34rem] text-[1rem] leading-7 text-black/[0.78]">
              Si ya sabés qué querés gestionar, no hace falta esperar más. Armás tu sistema, probás el primer mes gratis y después decidís cómo escalar.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none bg-black px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-black/90"
              >
                <Link href="/negocios/crear-cuenta">Crear mi cuenta gratis</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-black bg-transparent px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-white hover:text-black"
              >
                <Link href="#pricing">Ver configurador</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto h-[220px] w-full max-w-[240px] border border-black bg-white/[0.24] p-4">
            <Image
              src="/assets/priconpri/mascot.webp"
              alt="Mascota Priconpri"
              fill
              className="object-contain p-4"
              sizes="240px"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
