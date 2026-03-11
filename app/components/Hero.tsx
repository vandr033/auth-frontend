"use client";

import { motion, useReducedMotion, type Transition, type Variants } from "framer-motion";

import { SearchForm } from "./SearchForm";
import { useT } from "@/lib/i18n";

export function Hero() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 26 }, visible: { opacity: 1, y: 0 } };

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  const getTransition = (delay: number): Transition =>
    prefersReducedMotion
      ? { duration: 0 }
      : { delay, duration: 0.55, ease };

  return (
    <section id="home" className="relative overflow-hidden bg-[#f3f3f3] scroll-mt-16">
      <div className="mx-auto w-full max-w-[1560px] px-4 pt-14 pb-16 text-center sm:px-6 md:pt-18 md:pb-18 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.p
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0)}
          className="font-bebas text-[14px] leading-none tracking-[0.18em] text-biz-barbie-pink uppercase"
        >
          {t("homeRedesign.hero.eyebrow")}
        </motion.p>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0.1)}
          style={{ fontSize: "clamp(4.5rem, 11vw, 12.5rem)" }}
          className="mx-auto mt-4 max-w-[1420px] font-business-display leading-[0.82] font-black tracking-[-0.028em] text-black uppercase"
        >
          <span className="block">{t("homeRedesign.hero.line1")}</span>
          <span className="block">
            <span className="text-biz-barbie-pink">{t("homeRedesign.hero.line2Pink")}</span>{" "}
            <span className="text-biz-sky-surge">{t("homeRedesign.hero.line2Blue")}</span>
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0.2)}
          className="mx-auto mt-8 max-w-[860px] text-[clamp(1.45rem,2vw,2.05rem)] leading-[1.34] text-slate-600"
        >
          {t("homeRedesign.hero.subtitle")}
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0.3)}
          className="mx-auto mt-10 w-full max-w-[1360px]"
        >
          <SearchForm />
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0.42)}
          className="mx-auto mt-10 flex w-full max-w-[820px] flex-wrap items-center justify-center text-[14px] leading-none font-semibold tracking-[0.12em] text-slate-600 uppercase"
        >
          <span>{t("homeRedesign.hero.metricInstant")}</span>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={getTransition(0.5)}
          className="mt-6"
        >
          <a
            href="/negocios"
            className="inline-flex items-center justify-center text-[14px] leading-none font-semibold tracking-[0.12em] text-black uppercase transition-colors hover:text-biz-barbie-pink"
          >
            {t("homeRedesign.hero.businessPrompt")}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
