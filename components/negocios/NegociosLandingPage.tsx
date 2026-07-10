"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { BusinessPricingBuilder } from "@/components/negocios/BusinessPricingBuilder";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  getDefaultTierForCoreProduct,
  type CoreTierSelection,
  type PublicAddOnKey,
} from "@/lib/negocios/business-pricing";
import { sanitizePricingSelection } from "@/lib/negocios/pricing";
import { usePublicBusinessPricing } from "@/lib/negocios/usePublicBusinessPricing";

const FAQ_KEYS = ["card", "products", "trial", "store"] as const;

const SECTORS = [
  { key: "aesthetics", image: "/assets/priconpri/negocios cards/aesthetics.webp" },
  { key: "wellness", image: "/assets/priconpri/negocios cards/wellness.webp" },
  { key: "movement", image: "/assets/priconpri/negocios cards/movement.webp" },
  { key: "academies", image: "/assets/priconpri/negocios cards/health.webp" },
] as const;

function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-bebas text-[15px] uppercase tracking-[0.18em]", className)}>{children}</p>;
}

function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "font-heading text-balance text-[clamp(2rem,4.2vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-biz-heading-dark",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function NegociosLandingPage() {
  const t = useT();
  const {
    pricingConfig,
    isLoading: pricingLoading,
    error: pricingError,
    retry: retryPricing,
  } = usePublicBusinessPricing();
  const [selection, setSelection] = useState<{
    coreSelections: CoreTierSelection[];
    addOns: PublicAddOnKey[];
    billingCycle: "monthly" | "annual";
  }>({
    coreSelections: [{ productKey: "RESERVAS", tierKey: getDefaultTierForCoreProduct("RESERVAS") }],
    addOns: [],
    billingCycle: "monthly",
  });

  useEffect(() => {
    if (!pricingConfig) return;

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
      <section id="inicio" className="relative isolate overflow-hidden border-b border-black bg-biz-surface">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-[36%] bg-biz-yellow sm:h-48" />
        <div className="pointer-events-none absolute bottom-0 left-[52%] hidden h-16 w-16 bg-biz-sky-surge lg:block" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-center lg:gap-16 lg:px-10 lg:py-24 xl:gap-24">
          <div className="max-w-[45rem]">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center border border-black bg-biz-yellow px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">{t("businessLanding.hero.trialBadge")}</span>
              <span className="inline-flex items-center border border-black bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black">{t("businessLanding.hero.noCardBadge")}</span>
            </div>
            <SectionEyebrow className="mt-8 text-biz-barbie-pink">{t("businessLanding.hero.eyebrow")}</SectionEyebrow>
            <h1 className="mt-3 max-w-[10ch] font-business-display text-[clamp(3.7rem,9vw,7.6rem)] uppercase leading-[0.8] tracking-[-0.06em]">{t("businessLanding.hero.title")}</h1>
            <p className="mt-6 max-w-[38rem] text-[clamp(1rem,1.7vw,1.2rem)] leading-7 text-slate-700">
              {t("businessLanding.hero.description")}
            </p>
            <div className="mt-8">
              <Button asChild className="min-h-14 rounded-none bg-biz-cta-primary px-7 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_0_rgba(5,5,5,0.14)] transition-transform hover:bg-biz-cta-hover hover:shadow-[0_6px_0_rgba(5,5,5,0.14)] active:translate-y-1 active:shadow-none">
                <Link href="#pricing">{t("businessLanding.hero.cta")} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">{t("businessLanding.hero.microcopy")}</p>
          </div>

          <aside className="relative border border-black bg-black p-6 text-white sm:p-8" aria-label={t("businessLanding.hero.systemAria")}>
            <div className="absolute -right-4 -top-4 hidden h-20 w-20 border border-black bg-biz-yellow lg:block" />
            <SectionEyebrow className="text-biz-yellow">{t("businessLanding.hero.systemEyebrow")}</SectionEyebrow>
            <div className="mt-8 space-y-5">
              {([
                ["01", "choose"],
                ["02", "configure"],
                ["03", "create"],
              ] as const).map(([number, key]) => (
                <div key={number} className="grid grid-cols-[2.6rem_1fr] gap-3 border-t border-white/15 pt-4">
                  <span className="font-bebas text-[1.7rem] leading-none text-biz-yellow">{number}</span>
                  <div>
                    <p className="font-business-display text-[1.8rem] uppercase leading-none">{t(`businessLanding.hero.steps.${key}.title`)}</p>
                    <p className="mt-1 text-sm leading-5 text-white/65">{t(`businessLanding.hero.steps.${key}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Image src="/assets/priconpri/mascot.webp" alt="" width={180} height={180} className="pointer-events-none absolute -bottom-11 -right-3 hidden h-36 w-36 object-contain xl:block" />
          </aside>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 border-b border-black/10 bg-[#f7f4ef] px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <SectionEyebrow className="text-biz-barbie-pink">{t("businessLanding.pricing.configurator.eyebrow")}</SectionEyebrow>
              <SectionHeading className="mt-3 max-w-[18ch]">{t("businessLanding.pricing.configurator.title")}</SectionHeading>
            </div>
            <p className="max-w-[48ch] text-[1rem] leading-7 text-slate-700">{t("businessLanding.pricing.configurator.description")}</p>
          </div>
          <BusinessPricingBuilder
            value={selection}
            onChange={setSelection}
            pricingConfig={pricingConfig}
            isPricingLoading={pricingLoading}
            pricingError={pricingError}
            onRetryPricing={retryPricing}
          />
        </div>
      </section>

      <section id="sectores" className="border-b border-black/10 bg-white px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-start lg:gap-16">
            <div>
              <SectionEyebrow className="text-biz-sky-surge">{t("businessLanding.sectors.eyebrow")}</SectionEyebrow>
              <SectionHeading className="mt-3 max-w-[18ch]">{t("businessLanding.sectors.title")}</SectionHeading>
              <p className="mt-5 max-w-[34ch] text-base leading-7 text-slate-700">{t("businessLanding.sectors.description")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTORS.map((sector) => (
                <article key={sector.key} className="group relative min-h-[190px] overflow-hidden border border-black bg-black text-white">
                  <Image src={sector.image} alt={t(`businessLanding.sectors.cards.${sector.key}.title`)} fill className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.04]" sizes="(max-width: 640px) 100vw, 40vw" />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-heading text-[1.45rem] font-semibold leading-tight tracking-[-0.025em]">{t(`businessLanding.sectors.cards.${sector.key}.title`)}</h3>
                    <p className="mt-2 max-w-[28ch] text-sm leading-5 text-white/80">{t(`businessLanding.sectors.cards.${sector.key}.note`)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-b border-black/10 bg-[#eef7fb] px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <SectionEyebrow className="text-biz-barbie-pink">{t("businessLanding.faq.eyebrow")}</SectionEyebrow>
            <SectionHeading className="mt-3 max-w-[14ch]">{t("businessLanding.faq.title")}</SectionHeading>
          </div>
          <div className="divide-y divide-black/15 border-y border-black/15">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="group py-5 sm:py-6">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-left font-heading text-[1.1rem] font-semibold leading-[1.25] tracking-[-0.02em] marker:hidden sm:text-[1.2rem]">
                  {t(`businessLanding.faq.items.${key}.question`)}
                  <ChevronDown className="h-5 w-5 shrink-0 text-biz-barbie-pink transition-transform group-open:rotate-180" />
                </summary>
                <p className="max-w-[58ch] pt-3 text-base leading-7 text-slate-700">{t(`businessLanding.faq.items.${key}.answer`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-biz-barbie-pink px-6 py-16 text-black lg:px-10 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionEyebrow>{t("businessLanding.finalCta.eyebrow")}</SectionEyebrow>
            <h2 className="mt-3 max-w-[22ch] font-heading text-balance text-[clamp(2rem,4.5vw,3.8rem)] font-semibold leading-[0.98] tracking-[-0.045em]">{t("businessLanding.finalCta.title")}</h2>
            <p className="mt-4 max-w-[42rem] text-base leading-7 text-black/75">{t("businessLanding.finalCta.body")}</p>
          </div>
          <Link href="#pricing" className="inline-flex min-h-14 items-center justify-center gap-2 border border-black bg-black px-7 text-xs font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-black">{t("businessLanding.finalCta.cta")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}
