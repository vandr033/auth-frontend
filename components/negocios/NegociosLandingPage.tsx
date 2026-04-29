"use client";

import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  ADD_ONS,
  CORE_PRODUCTS,
  NEGOCIOS_HERO_COPY,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/catalog";
import {
  calculateBusinessPricing,
  formatBsAmount,
} from "@/lib/negocios/pricing";

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
      "Todavía no. Tienda está en camino y aparece como Próximamente.",
  },
];

const BILLBOARD_TIERS = [
  { label: "1 producto", value: "0%" },
  { label: "2 productos", value: "10%" },
  { label: "3 productos", value: "15%" },
  { label: "4+ productos", value: "20%" },
  { label: "Contrato anual", value: "+15% adicional" },
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
}: {
  index: number;
  product: (typeof CORE_PRODUCTS)[number];
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const cardClasses = [
    "md:col-span-2 bg-black text-white",
    "bg-white text-black",
    "bg-[linear-gradient(135deg,rgba(6,180,227,0.12),rgba(255,255,255,0.98))] text-black",
    "md:col-span-2 bg-slate-100 text-slate-700",
  ];

  return (
    <article
      className={cn(
        "group relative overflow-hidden border border-black p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6",
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

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
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

        {product.badge ? (
          <span className="inline-flex bg-biz-yellow px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
            {product.badge}
          </span>
        ) : null}
      </div>

      <div className="relative mt-7 max-w-[34rem]">
        <h3 className="font-business-display text-[clamp(2.15rem,3.6vw,3.3rem)] uppercase leading-[0.9] tracking-[-0.03em]">
          {product.title}
        </h3>
        <p
          className={cn(
            "mt-3 max-w-[34ch] text-sm leading-6",
            index === 0 ? "text-white/[0.78]" : "text-slate-700",
            product.disabled && "text-slate-500",
          )}
        >
          {product.tagline}
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {product.bullets.slice(0, 3).map((bullet) => (
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

      <div className="relative mt-6 flex items-center justify-between gap-4">
        <p
          className={cn(
            "font-bebas text-[2.3rem] uppercase tracking-[0.04em]",
            index === 0 ? "text-biz-yellow" : "text-biz-barbie-pink",
            product.disabled && "text-slate-400",
          )}
        >
          {product.priceMonthly} Bs
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
          {product.disabled ? "Ver lo que viene" : `Ver ${product.shortTitle}`}
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
  product: (typeof ADD_ONS)[number];
}) {
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const offsets = ["", "xl:translate-y-3", "", ""];
  const accents = ["text-biz-barbie-pink", "text-biz-sky-surge", "text-black", "text-biz-barbie-pink"];

  return (
    <article
      className={cn(
        "relative flex h-full flex-col border border-black/[0.08] bg-white p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6",
        offsets[index],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center border border-black/[0.08] bg-black/[0.03] text-black">
          <Icon className="h-5 w-5" />
        </span>
        <span className={cn("text-[11px] font-black uppercase tracking-[0.08em]", accents[index])}>
          + módulo
        </span>
      </div>

      <h3 className="mt-5 font-business-display text-[clamp(1.8rem,2.5vw,2.35rem)] uppercase leading-[0.92] tracking-[-0.03em]">
        {product.shortTitle}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{product.tagline}</p>

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
          <p className="mb-4 text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {product.includedNote}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <p className="font-bebas text-[2rem] uppercase tracking-[0.04em] text-biz-barbie-pink">
            {product.priceMonthly} Bs
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
  const [selection, setSelection] = useState<{
    coreProducts: SelectableCoreProductKey[];
    addOns: PublicAddOnKey[];
    billingCycle: "monthly" | "annual";
  }>({
    coreProducts: ["RESERVAS"],
    addOns: [],
    billingCycle: "monthly",
  });

  const pricing = calculateBusinessPricing(selection);

  return (
    <main className="bg-biz-surface text-biz-heading-dark">
      <section
        id="inicio"
        className="relative isolate overflow-hidden border-b border-black/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(231,56,134,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(250,255,54,0.24),transparent_18%),linear-gradient(180deg,#f3f3f3_0%,#f6f2ed_100%)] lg:min-h-[calc(100svh-3.5rem)]"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-16 h-28 w-44 rotate-[-6deg] border border-black/[0.08] bg-white/[0.45]" />
          <div className="absolute right-[8%] top-24 h-20 w-32 bg-biz-sky-surge/[0.12] blur-3xl" />
          <div className="absolute bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-biz-barbie-pink/[0.16] blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[0.98fr_1.02fr] lg:px-10 lg:py-10">
          <div className="relative z-10 max-w-[620px]">
            <div className="flex flex-wrap gap-3">
              <span className="bg-biz-yellow px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Primer mes gratis
              </span>
              <span className="border border-black/[0.1] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Modular desde el día uno
              </span>
            </div>

            <SectionEyebrow className="mt-7 text-biz-barbie-pink">
              Editorial pop premium
            </SectionEyebrow>
            <h1 className="mt-3 font-business-display text-[clamp(3.25rem,7vw,6.1rem)] uppercase leading-[0.84] tracking-[-0.04em]">
              ARMÁ TU SISTEMA.
            </h1>
            <p className="mt-4 max-w-[32rem] text-[0.98rem] leading-7 text-slate-700 sm:text-[1.04rem]">
              Elegís Reservas, Eventos, Clases y los módulos extra que te convienen. Priconpri te deja probar todo el flujo con un primer mes gratis, sin romper la lógica real de tu negocio.
            </p>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-slate-600">
              {NEGOCIOS_HERO_COPY.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none bg-biz-cta-primary px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-cta-hover"
              >
                <Link href="/negocios/crear-cuenta">{NEGOCIOS_HERO_COPY.primaryCta}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-black bg-transparent px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-black hover:text-white"
              >
                <Link href="#productos">{NEGOCIOS_HERO_COPY.secondaryCta}</Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="border border-black bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Base activa
                </p>
                <p className="mt-3 font-business-display text-[2.4rem] uppercase leading-none">
                  {selection.coreProducts.length}
                </p>
              </div>
              <div className="border border-black bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Extras
                </p>
                <p className="mt-3 font-business-display text-[2.4rem] uppercase leading-none">
                  {selection.addOns.length}
                </p>
              </div>
              <div className="border border-black bg-black p-4 text-white">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                  Después gratis
                </p>
                <p className="mt-3 font-business-display text-[2.4rem] uppercase leading-none text-biz-yellow">
                  {formatBsAmount(pricing.finalMonthly)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px]">
            <div className="relative min-h-[390px]">
              <div className="absolute left-0 top-8 h-[250px] w-[61%] rotate-[-2deg] border border-black bg-white p-5 shadow-[0_24px_46px_rgba(15,23,42,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bebas text-[14px] uppercase tracking-[0.16em] text-biz-barbie-pink">
                      Selección actual
                    </p>
                    <p className="mt-2 font-business-display text-[clamp(2rem,3vw,2.9rem)] uppercase leading-[0.92]">
                      Tu sistema.
                    </p>
                  </div>
                  <span className="border border-black/[0.1] bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black">
                    Modular
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {pricing.selectedProducts.map((item) => (
                    <span
                      key={item}
                      className="inline-flex border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 border border-black/[0.08] bg-black/[0.03] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                    Lógica de selección
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Primero activás un producto principal. Después sumás extras, combo y anual según lo que necesités.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                      Mensual estimado
                    </p>
                    <p className="mt-2 font-bebas text-[2rem] uppercase tracking-[0.04em] text-biz-barbie-pink">
                      {formatBsAmount(pricing.finalMonthly)}
                    </p>
                  </div>
                  <Link
                    href="#pricing"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-black px-4 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white"
                  >
                    Calcular
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 z-10 w-[66%] rotate-[1.5deg] border border-black bg-black p-5 text-white shadow-[0_28px_52px_rgba(5,5,5,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bebas text-[14px] uppercase tracking-[0.16em] text-biz-yellow">
                      Resumen premium
                    </p>
                    <p className="mt-2 font-business-display text-[clamp(2rem,4vw,3.1rem)] uppercase leading-[0.9]">
                      Hoy pagás 0 Bs.
                    </p>
                  </div>
                  <span className="border border-white/[0.14] bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    {selection.billingCycle === "annual" ? "Anual" : "Mensual"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="border border-white/[0.12] bg-white/[0.06] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                      Primer mes
                    </p>
                    <p className="mt-2 font-bebas text-[2rem] uppercase tracking-[0.04em] text-biz-yellow">
                      Gratis
                    </p>
                  </div>
                  <div className="border border-white/[0.12] bg-white/[0.06] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/[0.58]">
                      Después
                    </p>
                    <p className="mt-2 font-bebas text-[2rem] uppercase tracking-[0.04em] text-white">
                      {formatBsAmount(pricing.finalMonthly)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 max-w-[24ch] text-sm leading-6 text-white/[0.76]">
                  Bundle y anual se calculan automáticamente cuando llegás al configurador real.
                </p>
              </div>

              <div className="absolute right-10 top-2 z-20 rotate-[2deg] bg-biz-yellow px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[0_18px_34px_rgba(0,0,0,0.14)]">
                Primer mes gratis
              </div>

              <div className="absolute bottom-20 left-[30%] z-0 hidden h-[160px] w-[160px] border border-black/[0.08] bg-white/[0.5] p-2 lg:block">
                <Image
                  src="/assets/priconpri/mascot.webp"
                  alt="Mascota Priconpri"
                  width={160}
                  height={160}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="productos" className="border-b border-black/[0.08] bg-white px-6 py-12 lg:px-10 lg:py-16">
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
                  Reservas, Eventos, Clases y pronto Tienda.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {CORE_PRODUCTS.map((product, index) => (
                <CoreProductFeature key={product.key} index={index} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="addons"
        className="border-b border-black/[0.08] bg-[linear-gradient(180deg,#f6f2ed_0%,#eef7fb_100%)] px-6 py-12 lg:px-10 lg:py-16"
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
              {ADD_ONS.map((product, index) => (
                <AddOnFeature key={product.key} index={index} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-b border-black/[0.08] bg-[linear-gradient(180deg,#ece8e3_0%,#f7f4ef_100%)] px-6 py-12 lg:px-10 lg:py-16"
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
            <BusinessPricingBuilder value={selection} onChange={setSelection} />
          </div>
        </div>
      </section>

      <section id="bundle" className="border-b border-black bg-biz-yellow px-6 py-12 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
            <div className="max-w-[34rem]">
              <SectionEyebrow className="text-black">
                MIENTRAS MÁS SUMÁS, MÁS AHORRÁS.
              </SectionEyebrow>
              <h2 className="mt-3 font-business-display text-[clamp(2.7rem,5.8vw,4.8rem)] uppercase leading-[0.84] tracking-[-0.04em] text-black">
                El descuento también es parte del diseño del plan.
              </h2>
              <p className="mt-4 max-w-[30rem] text-[1rem] leading-7 text-black/80">
                Bundle y anual no son notas al pie. Son una parte importante de cómo escala tu sistema cuando sumás más operación.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {BILLBOARD_TIERS.map((tier, index) => (
                <article
                  key={tier.label}
                  className={cn(
                    "border border-black p-4",
                    index % 2 === 0 ? "bg-white text-black" : "bg-black text-white",
                    index === 1 && "sm:translate-y-3",
                    index === 4 && "sm:col-span-2 xl:col-span-1",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-black uppercase tracking-[0.08em]",
                      index % 2 === 0 ? "text-slate-500" : "text-white/[0.58]",
                    )}
                  >
                    {tier.label}
                  </p>
                  <p className="mt-3 font-business-display text-[clamp(1.9rem,3vw,2.9rem)] uppercase leading-[0.9] tracking-[-0.03em]">
                    {tier.value}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="sectores" className="border-b border-black/[0.08] bg-white px-6 py-12 lg:px-10 lg:py-16">
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

      <section id="como-funciona" className="border-b border-black/[0.08] bg-[#f5f3ef] px-6 py-12 lg:px-10 lg:py-[3.75rem]">
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
