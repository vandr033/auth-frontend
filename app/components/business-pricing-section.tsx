"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  type BusinessPlanId,
  BUSINESS_COMPARE_PATH,
  businessPricingSummaryPlans,
} from "@/app/components/business-pricing-data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BusinessPricingSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [selectedPlanId, setSelectedPlanId] = useState<BusinessPlanId>(
    () => businessPricingSummaryPlans.find((plan) => plan.featured)?.id ?? "business",
  );

  return (
    <section
      id="precios"
      aria-labelledby="business-pricing-title"
      className="w-full bg-biz-surface py-16 sm:py-20 lg:py-24 xl:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        <motion.h2
          id="business-pricing-title"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[860px] text-center font-business-display text-[clamp(3.1rem,8.4vw,7rem)] leading-[0.82] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
        >
          <span className="block">{t("businessPricing.line1")}</span>
          <span className="block">{t("businessPricing.line2")}</span>
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
                      staggerChildren: 0.1,
                      delayChildren: 0.14,
                    },
                  },
                }
          }
          aria-label={t("businessPricing.cardsAria")}
          className="mt-11 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6"
        >
          {businessPricingSummaryPlans.map((plan) => {
            const isFeatured = plan.featured;
            const isSelected = selectedPlanId === plan.id;

            return (
              <motion.article
                key={plan.id}
                variants={
                  prefersReducedMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0 },
                      }
                }
                className={cn(
                  "flex min-h-[475px] flex-col px-5 py-6 transition-all duration-300 ease-out lg:min-h-[485px] lg:px-6",
                  isFeatured
                    ? "bg-black text-white shadow-[0_18px_38px_rgba(2,6,23,0.24)] hover:shadow-[0_24px_44px_rgba(2,6,23,0.3)]"
                    : "border border-black/18 bg-white text-biz-heading-dark hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]",
                  isSelected &&
                    (isFeatured
                      ? "ring-2 ring-biz-yellow ring-offset-2 ring-offset-biz-surface"
                      : "border-biz-yellow bg-biz-yellow/12"),
                )}
              >
                <p className={cn("font-bebas text-[31px] leading-none font-semibold uppercase tracking-tight", isFeatured ? "text-white" : "text-black")}>
                  {t(plan.nameKey)}
                </p>

                <div className="mt-2 flex items-end gap-1.5">
                  <p className={cn("font-bebas text-[52px] leading-[0.92] font-semibold uppercase tracking-tight", isFeatured ? "text-white" : "text-black")}>
                    {t(plan.priceMainKey)}
                  </p>
                  <p className={cn("pb-1 font-bebas text-[14px] leading-none tracking-[0.06em] uppercase", isFeatured ? "text-white/75" : "text-black/65")}>
                    {t(plan.priceSuffixKey)}
                  </p>
                </div>

                <p className={cn("mt-3 max-w-[290px] text-[0.93rem] leading-relaxed", isFeatured ? "text-white/78" : "text-slate-700")}>
                  {t(plan.descriptionKey)}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "mt-[0.18rem] h-3.5 w-3.5 shrink-0",
                          isSelected
                            ? "text-biz-yellow"
                            : isFeatured
                              ? "text-biz-yellow"
                              : "text-biz-barbie-pink",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={cn("font-bebas text-[13px] leading-none font-semibold tracking-[0.04em] uppercase", isFeatured ? "text-white" : "text-black")}>
                        {t(featureKey)}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "mt-auto h-11 w-full border text-center font-bebas text-[15px] leading-none font-semibold tracking-[0.05em] uppercase transition-colors duration-300",
                    isSelected && "border-biz-yellow bg-biz-yellow text-black hover:bg-[#ecf029]",
                    isFeatured
                      ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#ecf029]"
                      : "border-black bg-transparent text-black hover:bg-black hover:text-white",
                  )}
                >
                  {t(plan.ctaKey)}
                </button>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : 0.28, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center gap-2 text-center"
        >
          <Link
            href={BUSINESS_COMPARE_PATH}
            className="inline-flex items-center border border-black px-5 py-2.5 font-bebas text-[15px] leading-none font-semibold tracking-[0.05em] text-black uppercase transition-colors duration-300 hover:bg-black hover:text-white"
          >
            {t("businessPricing.compareCta")}
          </Link>
          <p className="max-w-[700px] text-[0.9rem] leading-relaxed text-slate-600">
            {t("businessPricing.compareHint")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
