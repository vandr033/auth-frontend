"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BusinessPricingBuilder } from "@/components/negocios/BusinessPricingBuilder";
import { cn } from "@/lib/utils";
import {
  ADD_ONS,
  CORE_PRODUCTS,
  NEGOCIOS_HERO_COPY,
  type PublicAddOnKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/catalog";

const FAQS = [
  {
    question: "¿Necesito tarjeta para empezar?",
    answer:
      "No. Podés crear tu cuenta y probar Priconpri por un mes sin ingresar tarjeta ni método de pago.",
  },
  {
    question: "¿Puedo cambiar mis productos después?",
    answer:
      "Sí. Podés empezar con un producto principal y después sumar más productos o add-ons según lo que necesite tu negocio.",
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
  {
    question: "¿Puedo usar solo Reservas, Eventos o Clases?",
    answer:
      "Sí. Solo necesitás elegir al menos un producto principal para empezar.",
  },
];

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

  return (
    <main className="bg-biz-surface text-biz-heading-dark">
      <section
        id="inicio"
        className="relative isolate overflow-hidden border-b border-black/10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-16 h-32 w-56 rotate-[-11deg] bg-biz-barbie-pink/15 blur-3xl" />
          <div className="absolute right-[8%] top-20 h-32 w-56 rotate-[12deg] bg-biz-yellow/30 blur-3xl" />
          <div className="absolute bottom-10 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-biz-sky-surge/18 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.06fr_0.94fr] lg:px-10 lg:py-20">
          <div className="relative z-10 max-w-[720px]">
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
              Modular, premium y listo para vender
            </p>
            <h1 className="mt-3 font-business-display text-[clamp(3.2rem,9vw,7.2rem)] uppercase leading-[0.84] tracking-[-0.03em]">
              {NEGOCIOS_HERO_COPY.title}
            </h1>
            <p className="mt-6 max-w-[560px] text-[1rem] leading-8 text-slate-700 sm:text-[1.08rem]">
              {NEGOCIOS_HERO_COPY.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="bg-biz-yellow px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Primer mes gratis
              </span>
              <span className="border border-black/15 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Sin tarjeta
              </span>
              <span className="border border-black/15 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                Sin vueltas
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[640px]">
            <div className="absolute -left-4 top-12 h-28 w-28 rounded-full bg-biz-barbie-pink/18 blur-[36px]" />
            <div className="absolute bottom-5 right-4 h-24 w-24 rounded-full bg-biz-yellow/30 blur-[36px]" />
            <div className="relative overflow-hidden border border-black bg-white p-4 shadow-[0_20px_40px_rgba(5,5,5,0.12)]">
              <Image
                src="/assets/priconpri/hero.webp"
                alt="Vista de la experiencia Priconpri"
                width={1200}
                height={1080}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
            Calculá tu plan después del mes gratis
          </p>
          <h2 className="mt-3 max-w-4xl font-business-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.84] tracking-[-0.03em]">
            Elegí al menos un producto principal y sumá los add-ons que necesitás.
          </h2>
          <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-slate-700">
            El primer mes va por nuestra cuenta. Mientras más armás, más te conviene. Si después activás anual, tenés un descuento adicional.
          </p>

          <div className="mt-8">
            <BusinessPricingBuilder value={selection} onChange={setSelection} />
          </div>
        </div>
      </section>

      <section id="productos" className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
                Elegí por dónde empieza tu operación
              </p>
              <h2 className="mt-2 font-business-display text-[clamp(2.8rem,7vw,5.5rem)] uppercase leading-[0.86] tracking-[-0.03em]">
                Core products
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-700">
              Reservas, Eventos y Clases se activan desde el día uno. Tienda ya aparece, pero queda marcada como Próximamente.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {CORE_PRODUCTS.map((product) => (
              <article
                key={product.key}
                className={cn(
                  "flex h-full flex-col border p-5",
                  product.disabled ? "border-black/10 bg-slate-100" : "border-black bg-white",
                )}
              >
                {product.badge ? (
                  <span className="inline-flex w-fit bg-biz-yellow px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
                    {product.badge}
                  </span>
                ) : null}
                <h3 className="mt-4 font-business-display text-[clamp(2rem,4vw,3rem)] uppercase leading-[0.9]">
                  {product.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{product.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-700">
                  {product.bullets.map((bullet) => (
                    <li key={`${product.key}-${bullet}`}>{bullet}</li>
                  ))}
                </ul>
                <Link
                  href={product.href}
                  className={cn(
                    "mt-auto inline-flex h-11 items-center justify-center border text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
                    product.disabled
                      ? "cursor-not-allowed border-black/10 bg-slate-200 text-slate-500"
                      : "border-black bg-black text-white hover:bg-biz-barbie-pink hover:border-biz-barbie-pink",
                  )}
                >
                  {product.disabled ? "Ver lo que viene" : `Ver ${product.shortTitle}`}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="addons" className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
                Sumá potencia cuando la necesités
              </p>
              <h2 className="mt-2 font-business-display text-[clamp(2.8rem,7vw,5.5rem)] uppercase leading-[0.86] tracking-[-0.03em]">
                Add-ons
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-700">
              CRM Base, Personalización Base y Mensajería Base ya vienen incluidas. Los add-ons desbloquean la parte avanzada.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {ADD_ONS.map((product) => (
              <article key={product.key} className="flex h-full flex-col border border-black bg-white p-5">
                <h3 className="font-business-display text-[clamp(2rem,4vw,3rem)] uppercase leading-[0.9]">
                  {product.shortTitle}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{product.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-700">
                  {product.bullets.map((bullet) => (
                    <li key={`${product.key}-${bullet}`}>{bullet}</li>
                  ))}
                </ul>
                {product.includedNote ? (
                  <p className="mt-4 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {product.includedNote}
                  </p>
                ) : null}
                <Link
                  href={product.href}
                  className="mt-auto inline-flex h-11 items-center justify-center border border-black bg-black text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:border-biz-barbie-pink hover:bg-biz-barbie-pink"
                >
                  Ver {product.shortTitle}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="bundle" className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-4">
          {[
            { label: "Precio mensual", value: "Desde 300 Bs" },
            { label: "Descuento por bundle", value: "Hasta 15%" },
            { label: "Descuento anual", value: "15% extra" },
            { label: "Primer mes", value: "Gratis" },
          ].map((item) => (
            <div key={item.label} className="border border-black bg-white p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-4 font-business-display text-[clamp(2rem,5vw,3.4rem)] uppercase leading-[0.9]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="trial" className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl border border-black bg-black px-6 py-8 text-white lg:px-8">
          <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-yellow">
            Probalo un mes gratis
          </p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-business-display text-[clamp(2.8rem,7vw,5.5rem)] uppercase leading-[0.86] tracking-[-0.03em]">
                Creá tu cuenta, elegí tus productos y entrá directo al onboarding.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                No necesitás tarjeta para empezar. Elegís lo que querés probar y empezás a configurar tu negocio desde el panel.
              </p>
            </div>
            <Button
              asChild
              className="h-12 rounded-none bg-biz-yellow px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-[#edf222]"
            >
              <Link href="/negocios/crear-cuenta">Crear mi cuenta gratis</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
            FAQ
          </p>
          <h2 className="mt-2 font-business-display text-[clamp(2.8rem,7vw,5.5rem)] uppercase leading-[0.86] tracking-[-0.03em]">
            Lo que suele aparecer antes de activar
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {FAQS.map((item) => (
              <article key={item.question} className="border border-black bg-white p-5">
                <h3 className="font-bebas text-[1.35rem] uppercase tracking-[0.04em]">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
