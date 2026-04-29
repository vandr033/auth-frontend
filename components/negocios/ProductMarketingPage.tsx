import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ALL_NEGOCIOS_PRODUCTS, type NegociosProductCard } from "@/lib/negocios/catalog";

export function ProductMarketingPage({ product }: { product: NegociosProductCard }) {
  const relatedProducts = ALL_NEGOCIOS_PRODUCTS.filter(
    (item) =>
      item.key !== product.key &&
      product.recommendedCombos.some(
        (combo) => combo === item.shortTitle || combo === item.title,
      ),
  );

  return (
    <main className="bg-biz-surface text-biz-heading-dark">
      <section className="border-b border-black/10 px-6 py-14 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            {product.badge ? (
              <span className="inline-flex bg-biz-yellow px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                {product.badge}
              </span>
            ) : (
              <span className="inline-flex bg-biz-barbie-pink px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                {product.kind === "core" ? "Core product" : "Add-on"}
              </span>
            )}
            <h1 className="mt-4 font-business-display text-[clamp(3rem,8vw,6.5rem)] uppercase leading-[0.84] tracking-[-0.03em]">
              {product.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-[1rem] leading-8 text-slate-700">
              {product.heroDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none bg-biz-cta-primary px-6 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-cta-hover"
              >
                <Link href="/negocios/crear-cuenta">{product.ctaLabel}</Link>
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
              { label: "Precio", value: `${product.priceMonthly} Bs / mes` },
              { label: "Incluye", value: product.kind === "core" ? "Producto principal" : "Add-on activable" },
              { label: "Ideal para", value: product.forWho },
              { label: "Nota", value: product.includedNote ?? "Se activa dentro del mismo negocio, sin cambiar de plataforma." },
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
              {product.tagline}
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-700">{product.forWho}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {product.bullets.map((bullet) => (
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
              {product.includedItems.map((item) => (
                <li key={`${product.key}-included-${item}`}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="border border-black bg-black p-6 text-white">
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-yellow">
              Combinaciones recomendadas
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-white/80">
              {product.recommendedCombos.map((item) => (
                <li key={`${product.key}-combo-${item}`}>{item}</li>
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
              <Link href="/negocios/crear-cuenta">{product.ctaLabel}</Link>
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
