"use client";

import { Droplets, LayoutGrid, Sparkles, Type } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const cardItems = [
  {
    key: "businessBrandRules.cards.branding",
    Icon: Sparkles,
    hoverIconColorClass: "group-hover:text-biz-sky-surge",
  },
  {
    key: "businessBrandRules.cards.colors",
    Icon: Droplets,
    hoverIconColorClass: "group-hover:text-biz-yellow",
  },
  {
    key: "businessBrandRules.cards.typographies",
    Icon: Type,
    hoverIconColorClass: "group-hover:text-biz-cherry-blossom",
  },
  {
    key: "businessBrandRules.cards.layouts",
    Icon: LayoutGrid,
    hoverIconColorClass: "group-hover:text-biz-sky-surge",
  },
] as const;

export function BusinessBrandRulesSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="branding"
      aria-labelledby="business-brand-rules-title"
      className="w-full bg-biz-surface py-16 sm:py-20 lg:py-24 xl:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1180px] px-6 lg:px-10">
        <motion.h2
          id="business-brand-rules-title"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[740px] text-center font-business-display text-[clamp(3.2rem,8.4vw,7rem)] leading-[0.82] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
        >
          <span className="block">{t("businessBrandRules.line1")}</span>
          <span className="block">{t("businessBrandRules.line2")}</span>
        </motion.h2>

        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 0.1, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-[700px] text-center font-bebas text-[clamp(1rem,1.28vw,1.15rem)] leading-[1.25] tracking-[0.05em] text-slate-700 uppercase"
        >
          {t("businessBrandRules.description")}
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={
            prefersReducedMotion
              ? undefined
              : {
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.16 } },
                }
          }
          className="mx-auto mt-10 grid w-full max-w-[980px] grid-cols-2 gap-3 sm:mt-12 sm:gap-4 md:grid-cols-4"
          aria-label={t("businessBrandRules.cardsAria")}
        >
          {cardItems.map((item) => {
            const Icon = item.Icon;

            return (
              <motion.div
                key={item.key}
                variants={
                  prefersReducedMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 },
                      }
                }
                className="group flex h-[102px] flex-col items-center justify-center bg-white px-3 text-center transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_12px_24px_rgba(2,6,23,0.22)]"
              >
                <Icon
                  className={`h-5 w-5 text-biz-barbie-pink transition-colors duration-300 group-hover:text-biz-sky-surge ${item.hoverIconColorClass}`}
                  strokeWidth={2}
                />
                <p className="mt-3 font-bebas text-[14px] leading-none font-semibold tracking-[0.05em] text-biz-heading-dark uppercase transition-colors duration-300 group-hover:text-white">
                  {t(item.key)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
