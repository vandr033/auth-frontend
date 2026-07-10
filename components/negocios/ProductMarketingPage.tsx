"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  applyPricingConfigToCatalog,
  type NegociosProductCard,
} from "@/lib/negocios/catalog";
import { usePublicBusinessPricing } from "@/lib/negocios/usePublicBusinessPricing";

export function ProductMarketingPage({ product }: { product: NegociosProductCard }) {
  const { pricingConfig, isLoading, error, retry } = usePublicBusinessPricing();
  const catalog = useMemo(
    () => (pricingConfig ? applyPricingConfigToCatalog(pricingConfig) : null),
    [pricingConfig],
  );
  if (!pricingConfig || !catalog) {
    return (
      <main className="bg-biz-surface px-6 py-16 text-biz-heading-dark lg:px-10 lg:py-24">
        <div className="mx-auto max-w-2xl border border-black bg-white p-6 sm:p-8" role={error ? "alert" : "status"}>
          <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">Precios vigentes</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em]">
            {isLoading ? "Cargando la información actual." : "No pudimos cargar la información."}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {isLoading ? "Estamos consultando la disponibilidad y el precio vigente." : error ?? "Volvé a intentarlo para consultar este producto."}
          </p>
          {!isLoading ? (
            <button type="button" onClick={retry} className="mt-6 inline-flex min-h-11 items-center justify-center border border-black bg-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-barbie-pink">
              Volver a intentar
            </button>
          ) : null}
        </div>
      </main>
    );
  }
  const { allProducts } = catalog;
  const resolvedProduct =
    allProducts.find((item) => item.key === product.key) ?? product;
  const relatedProducts = allProducts.filter(
    (item) =>
      item.key !== resolvedProduct.key &&
      resolvedProduct.recommendedCombos.some(
        (combo) => combo === item.shortTitle || combo === item.title,
      ),
  );

  return (
    <main className="bg-biz-surface text-biz-heading-dark">
      <section className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            {resolvedProduct.badge ? (
              <span className="inline-flex bg-biz-yellow px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                {resolvedProduct.badge}
              </span>
            ) : (
              <span className="inline-flex bg-biz-barbie-pink px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                {resolvedProduct.kind === "core" ? "Core product" : "Add-on"}
              </span>
            )}
            <h1 className="mt-4 font-business-display text-[clamp(3rem,8vw,6.5rem)] uppercase leading-[0.84] tracking-[-0.03em]">
              {resolvedProduct.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-[1rem] leading-8 text-slate-700">
              {resolvedProduct.heroDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none bg-biz-cta-primary px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-cta-hover"
              >
                <Link href="/negocios/crear-cuenta">{resolvedProduct.ctaLabel}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-black bg-transparent px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-black hover:text-white"
              >
                <Link href="/negocios#pricing">Ir al pricing builder</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 self-start lg:grid-cols-2">
            {[
              { label: "Precio", value: `${resolvedProduct.priceMonthly} Bs / mes` },
              { label: "Incluye", value: resolvedProduct.kind === "core" ? "Producto principal" : "Add-on activable" },
              { label: "Ideal para", value: resolvedProduct.forWho },
              { label: "Nota", value: resolvedProduct.includedNote ?? "Se activa dentro del mismo negocio, sin cambiar de plataforma." },
            ].map((item) => (
              <article key={item.label} className="border border-black bg-white p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
              Para quién es
            </p>
            <h2 className="mt-2 font-business-display text-[clamp(2.6rem,6vw,4.8rem)] uppercase leading-[0.86] tracking-[-0.03em]">
              {resolvedProduct.tagline}
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-700">{resolvedProduct.forWho}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {resolvedProduct.bullets.map((bullet) => (
              <article key={bullet} className="border border-black bg-white p-5">
                <p className="font-bebas text-[1.2rem] uppercase tracking-[0.04em]">{bullet}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <article className="border border-black bg-white p-6">
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
              Qué incluye
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              {resolvedProduct.includedItems.map((item) => (
                <li key={`${resolvedProduct.key}-included-${item}`}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="border border-black bg-black p-6 text-white">
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-yellow">
              Combinaciones recomendadas
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-white/80">
              {resolvedProduct.recommendedCombos.map((item) => (
                <li key={`${resolvedProduct.key}-combo-${item}`}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
          <div className="mx-auto max-w-7xl">
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
              Sumale otras capas
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {relatedProducts.map((item) => (
                <article key={item.key} className="border border-black bg-white p-5">
                  <h3 className="font-business-display text-[clamp(2rem,4vw,3rem)] uppercase leading-[0.9]">
                    {item.shortTitle}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{item.tagline}</p>
                  <Link
                    href={item.href}
                    className="mt-5 inline-flex h-11 items-center justify-center border border-black bg-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:border-biz-barbie-pink hover:bg-biz-barbie-pink"
                  >
                    Ver {item.shortTitle}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border border-black bg-black px-6 py-8 text-white lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-yellow">
              Probalo gratis
            </p>
            <h2 className="mt-2 font-business-display text-[clamp(2.6rem,6vw,4.8rem)] uppercase leading-[0.86] tracking-[-0.03em]">
              Armá tu combinación y entrá directo al onboarding.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-none bg-biz-yellow px-6 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-[#edf222]"
            >
              <Link href="/negocios/crear-cuenta">{resolvedProduct.ctaLabel}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-none border-white bg-transparent px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-white hover:text-black"
            >
              <Link href="/negocios#pricing">Volver al builder</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
