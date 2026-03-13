"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const DEMO_HREF = "https://cal.com/priconpri/demo";
const HOW_IT_WORKS_HREF = "#funcionalidades";

export function BusinessHero() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  const textInitial = prefersReducedMotion ? false : { opacity: 0, y: 26 };
  const textAnimate = { opacity: 1, y: 0 };
  const visualInitial = prefersReducedMotion ? false : { opacity: 0, y: 10 };
  const visualAnimate = { opacity: 1, y: 0 };

  return (
    <section
      id="inicio"
      aria-labelledby="business-hero-heading"
      className="relative isolate overflow-hidden bg-biz-surface scroll-mt-20"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[20%] top-[28%] h-44 w-44 rounded-full bg-biz-cherry-blossom/35 blur-[88px]" />
        <div className="absolute bottom-0 right-0 h-28 w-28 bg-biz-yellow/45 blur-[40px]" />
        <div className="absolute -left-12 top-[10%] h-36 w-64 rotate-[-11deg] bg-[radial-gradient(ellipse_at_center,rgba(240,52,162,0.24)_0%,rgba(240,52,162,0.1)_42%,rgba(240,52,162,0)_74%)] blur-[16px]" />
        <div className="absolute left-[52%] top-[12%] h-40 w-56 rotate-[16deg] bg-[radial-gradient(ellipse_at_center,rgba(242,242,87,0.22)_0%,rgba(242,242,87,0.08)_44%,rgba(242,242,87,0)_75%)] blur-[18px]" />
        <div className="absolute right-[3%] top-[34%] h-48 w-64 rotate-[-8deg] bg-[radial-gradient(ellipse_at_center,rgba(45,191,255,0.2)_0%,rgba(45,191,255,0.08)_42%,rgba(45,191,255,0)_76%)] blur-[18px]" />
      </div>

      <div className="mx-auto grid min-h-[calc(100svh-3.5rem)] w-full max-w-[1240px] grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-16">
        <motion.div
          initial={textInitial}
          animate={textAnimate}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-[660px]"
        >
          <h1
            id="business-hero-heading"
            className="font-business-display text-[clamp(3.2rem,10vw,6.8rem)] leading-[0.86] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
          >
            <span className="block">{t("businessHero.line1")}</span>
            <span className="block">{t("businessHero.line2")}</span>
            <span className="block text-biz-sky-surge">{t("businessHero.line3")}</span>
            <span className="block">{t("businessHero.line4")}</span>
            <span className="block text-biz-barbie-pink">{t("businessHero.line5")}</span>
          </h1>

          <p className="mt-6 max-w-[470px] text-[clamp(0.95rem,1.6vw,1.22rem)] leading-relaxed text-slate-700">
            {t("businessHero.description")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Button
              asChild
              className="h-11 rounded-none bg-biz-cta-primary px-6 text-[11px] font-bold tracking-[0.04em] text-white uppercase hover:bg-biz-cta-hover"
            >
              <a href={DEMO_HREF} target="_blank" rel="noopener noreferrer">
                {t("businessHero.requestDemo")}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-none border border-slate-900 bg-transparent px-6 text-[11px] font-bold tracking-[0.04em] text-slate-900 uppercase hover:bg-slate-100"
            >
              <a href={HOW_IT_WORKS_HREF}>{t("businessHero.viewHowItWorks")}</a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 font-bebas text-[13px] tracking-[0.12em] text-biz-barbie-pink uppercase transition-colors hover:text-biz-barbie-pink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
            >
              {t("businessHero.previewPanel")}
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bebas text-[13px] tracking-[0.12em] text-slate-500 uppercase transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
            >
              {t("businessHero.bookingMicrocopy")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={visualInitial}
          animate={visualAnimate}
          transition={{ duration: 0.6, delay: prefersReducedMotion ? 0 : 0.12, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[660px]"
        >
          <div className="relative aspect-[10/9] w-full">
            <div className="absolute -left-3 top-8 h-28 w-28 rounded-full bg-biz-barbie-pink/18 blur-[38px]" />
            <div className="absolute bottom-6 right-4 h-24 w-24 rounded-full bg-biz-sky-surge/18 blur-[32px]" />
            <div className="absolute left-[42%] top-[14%] h-28 w-36 rotate-[12deg] bg-[radial-gradient(ellipse_at_center,rgba(242,242,87,0.18)_0%,rgba(242,242,87,0.06)_42%,rgba(242,242,87,0)_74%)] blur-[14px]" />

            <div className="relative h-full w-full">
              <Image
                src="/assets/priconpri/hero.png"
                alt="Vista previa de PRICONPRI"
                fill
                priority
                sizes="(min-width: 1024px) 660px, 92vw"
                className="object-contain object-center scale-[1.16] drop-shadow-[0_26px_50px_rgba(15,23,42,0.22)]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
