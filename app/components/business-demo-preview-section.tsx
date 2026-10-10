import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { demoAddons, demoProducts, type DemoAddon, type DemoProductKey } from "@/app/demo/_lib/catalog";
import { useT } from "@/lib/i18n";

const productNameKeys: Record<DemoProductKey, string> = {
  reservas: "businessLanding.demo.products.reservas",
  restaurante: "businessLanding.demo.products.restaurante",
  eventos: "businessLanding.demo.products.eventos",
  clases: "businessLanding.demo.products.clases",
  tienda: "businessLanding.demo.products.tienda",
};

const addonNameKeys: Record<DemoAddon["key"], string> = {
  crm: "businessLanding.demo.addons.crm",
  metricas: "businessLanding.demo.addons.metricas",
  branding: "businessLanding.demo.addons.branding",
};

export function BusinessDemoPreviewSection() {
  const t = useT();

  return (
    <section
      id="demo"
      aria-labelledby="business-demo-preview-title"
      className="relative w-full overflow-hidden bg-slate-950 py-16 text-white sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-biz-barbie-pink/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-biz-sky-surge/15 blur-[80px]" />

      <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="grid gap-8 border-b border-white/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="inline-flex border-2 border-white/20 px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-biz-barbie-pink uppercase">
              {t("businessLanding.demo.eyebrow")}
            </p>
            <h2
              id="business-demo-preview-title"
              className="mt-5 font-business-display text-[clamp(2.8rem,7vw,5.8rem)] leading-[0.84] font-black tracking-[-0.02em] uppercase"
            >
              {t("businessLanding.demo.heading")}
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-slate-300 sm:text-lg">
              {t("businessLanding.demo.description")}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3">
            <div className="flex w-full flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-biz-barbie-pink px-5 font-bebas text-sm font-semibold tracking-[0.06em] uppercase transition-colors hover:bg-biz-barbie-pink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {t("businessLanding.demo.exploreDemos")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/demo/completo"
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 px-5 font-bebas text-sm font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:border-biz-yellow hover:text-biz-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {t("businessLanding.demo.completeSuite")} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="font-bebas text-xs tracking-[0.1em] text-slate-400 uppercase">
              {t("businessLanding.demo.reassurance")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 font-bebas text-sm tracking-[0.08em] uppercase">
          <span className="inline-flex items-center gap-2 text-white">
            <span className="h-2 w-2 rounded-full bg-biz-barbie-pink" aria-hidden="true" />
            {t("businessLanding.demo.customerView")}
          </span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="inline-flex items-center gap-2 text-biz-yellow">
            <span className="h-2 w-2 rounded-full bg-biz-yellow" aria-hidden="true" />
            {t("businessLanding.demo.adminView")}
          </span>
          <span className="text-xs font-normal normal-case tracking-normal text-slate-400">
            {t("businessLanding.demo.sharedExperience")}
          </span>
        </div>

        <div className="mt-9">
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
            <h3 className="font-bebas text-xl tracking-[0.08em] uppercase">{t("businessLanding.demo.productsHeading")}</h3>
            <span className="font-bebas text-xs tracking-[0.08em] text-slate-400 uppercase">{t("businessLanding.demo.productsCount")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {demoProducts.map((product) => (
              <article key={product.key} className="flex min-w-0 flex-col border border-white/15 bg-white/[0.04] p-4 sm:p-5">
                <p className="font-bebas text-xs tracking-[0.12em] text-biz-yellow uppercase">{product.number} / {t("businessLanding.demo.productLabel")}</p>
                <h4 className="mt-3 font-business-display text-2xl font-black uppercase leading-none tracking-tight">{t(productNameKeys[product.key])}</h4>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">{t(`businessLanding.demo.productDescriptions.${product.key}`)}</p>
                <Link
                  href={product.href}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 self-start font-bebas text-xs tracking-[0.08em] text-biz-yellow uppercase transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {t("businessLanding.demo.exploreProduct")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
            <h3 className="font-bebas text-xl tracking-[0.08em] uppercase">{t("businessLanding.demo.addonsHeading")}</h3>
            <span className="font-bebas text-xs tracking-[0.08em] text-slate-400 uppercase">{t("businessLanding.demo.addonsCount")}</span>
          </div>
          <div className="grid gap-x-6 md:grid-cols-3">
            {demoAddons.map((addon) => (
              <article key={addon.key} className="flex min-w-0 flex-col border-b border-white/15 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="font-bebas text-xs tracking-[0.12em] text-biz-yellow uppercase">{addon.number} / {t("businessLanding.demo.addonLabel")}</p>
                  <h4 className="mt-1 font-business-display text-xl font-black uppercase leading-tight">{t(addonNameKeys[addon.key])}</h4>
                </div>
                <Link
                  href={addon.href}
                  className="mt-2 inline-flex min-h-10 shrink-0 items-center gap-2 self-start font-bebas text-xs tracking-[0.06em] text-biz-yellow uppercase transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:mt-0"
                >
                  {t("businessLanding.demo.exploreAddon")} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-heading text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
            {t("businessLanding.demo.conversionQuestion")}
          </p>
          <Link
            href="#pricing"
            className="inline-flex min-h-11 items-center gap-2 self-start font-bebas text-sm font-semibold tracking-[0.08em] text-biz-yellow uppercase transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {t("businessLanding.demo.conversionCta")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
