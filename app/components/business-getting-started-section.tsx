"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const stepKeys = [
  "businessGettingStarted.steps.demo",
  "businessGettingStarted.steps.onboarding",
  "businessGettingStarted.steps.review",
  "businessGettingStarted.steps.online",
] as const;

export function BusinessGettingStartedSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="empezar"
      aria-labelledby="business-getting-started-title"
      className="w-full bg-biz-surface py-16 sm:py-20 lg:py-24 xl:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        <motion.h2
          id="business-getting-started-title"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[760px] font-business-display text-[clamp(3.1rem,8.4vw,7rem)] leading-[0.82] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
        >
          <span className="block">{t("businessGettingStarted.line1")}</span>
          <span className="block text-biz-sky-surge">{t("businessGettingStarted.line2")}</span>
        </motion.h2>

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
                      staggerChildren: 0.08,
                      delayChildren: 0.16,
                    },
                  },
                }
          }
          aria-label={t("businessGettingStarted.stepsAria")}
          className="mt-10 grid grid-cols-1 gap-x-8 gap-y-9 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4"
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
              className="group max-w-[320px] transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              <span className="block h-px w-full bg-black/70 transition-colors duration-300 group-hover:bg-biz-sky-surge" />
              <p className="mt-4 font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-biz-barbie-pink uppercase transition-colors duration-300 group-hover:text-biz-sky-surge">
                {t(`${stepKey}.number`)}
              </p>
              <h3 className="mt-2 font-bebas text-[clamp(1.95rem,2.35vw,2.45rem)] leading-[0.9] font-semibold tracking-tight text-biz-heading-dark uppercase transition-colors duration-300 group-hover:text-black">
                {t(`${stepKey}.title`)}
              </h3>
              <p className="mt-3 max-w-[250px] text-[0.95rem] leading-relaxed text-slate-700 transition-colors duration-300 group-hover:text-slate-900">
                {t(`${stepKey}.body`)}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
