"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const stepKeys = [
  "homeRedesign.howItWorks.steps.discover",
  "homeRedesign.howItWorks.steps.reserve",
  "homeRedesign.howItWorks.steps.enjoy",
] as const;

export function HowItWorks() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="como-funciona" className="w-full bg-[#efefef] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <p className="inline-flex border-2 border-black px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-biz-barbie-pink uppercase">
          {t("homeRedesign.howItWorks.eyebrow")}
        </p>

        <h2 className="mt-4 max-w-[900px] font-business-display text-[clamp(2.7rem,7vw,6.2rem)] leading-[0.84] font-black tracking-[-0.02em] text-black uppercase">
          <span className="block">{t("homeRedesign.howItWorks.title1")}</span>
          <span className="block">{t("homeRedesign.howItWorks.title2")}</span>
        </h2>

        <motion.div
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={
            prefersReducedMotion
              ? undefined
              : {
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.1,
                    },
                  },
                }
          }
          className="mt-11 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {stepKeys.map((stepKey) => (
            <motion.article
              key={stepKey}
              variants={
                prefersReducedMotion
                  ? undefined
                  : {
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }
              }
              className="max-w-[360px]"
            >
              <span className="block h-px w-full bg-black/30" />
              <p className="mt-4 font-bebas text-[24px] leading-none font-semibold tracking-[0.06em] text-biz-barbie-pink uppercase">
                {t(`${stepKey}.number`)}
              </p>
              <h3 className="mt-2 font-bebas text-[28px] leading-[0.9] font-semibold tracking-tight text-black uppercase">
                {t(`${stepKey}.title`)}
              </h3>
              <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-slate-600">
                {t(`${stepKey}.description`)}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
