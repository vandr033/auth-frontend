"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  type BillingCycle,
  BUSINESS_COMPARE_PATH,
  businessPricingSummaryPlans,
} from "@/app/components/business-pricing-data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BusinessPricingSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const plans = businessPricingSummaryPlans.map((plan) => ({
    ...plan,
    name: t(plan.nameKey),
    price: t(plan.priceKeys[billingCycle]),
    description: t(plan.descriptionKey),
    cta: t(plan.ctaKey),
    highlights: plan.highlightKeys.map((item) => t(item)),
  }));

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
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.36, delay: prefersReducedMotion ? 0 : 0.08, ease: "easeOut" }}
          className="mt-8 flex justify-center"
        >
          <div
            role="tablist"
            aria-label={t("businessPricing.billing.ariaLabel")}
            className="inline-flex items-center rounded-full border border-black/20 bg-white p-1"
          >
            {(["monthly", "yearly"] as const).map((cycle) => {
              const selected = billingCycle === cycle;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full px-4 py-2 font-bebas text-[14px] leading-none tracking-[0.06em] uppercase transition-colors",
                    selected
                      ? "bg-black text-white"
                      : "text-slate-600 hover:bg-black/5 hover:text-black",
                  )}
                >
                  {t(`businessPricing.billing.${cycle}`)}
                </button>
              );
            })}
          </div>
        </motion.div>

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
          className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6"
        >
          {plans.map((plan) => {
            const isFeatured = plan.featured;

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
                )}
              >
                <p className={cn("font-bebas text-[31px] leading-none font-semibold uppercase tracking-tight", isFeatured ? "text-white" : "text-black")}>
                  {plan.name}
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <p className={cn("font-bebas text-[52px] leading-[0.92] font-semibold uppercase tracking-tight", isFeatured ? "text-white" : "text-black")}>
                    {plan.price}
                  </p>
                  <p className={cn("pb-1 font-bebas text-[14px] leading-none tracking-[0.06em] uppercase", isFeatured ? "text-white/75" : "text-black/65")}>
                    {t("businessPricing.currency")} {t(`businessPricing.billing.period.${billingCycle}`)}
                  </p>
                </div>

                {billingCycle === "yearly" && (
                  <span
                    className={cn(
                      "mt-2 inline-flex w-fit items-center border px-2.5 py-1 font-bebas text-[12px] leading-none tracking-[0.06em] uppercase",
                      isFeatured
                        ? "border-biz-yellow bg-biz-yellow text-black"
                        : "border-black/20 bg-black text-white",
                    )}
                  >
                    {t("businessPricing.billing.saveTwoMonths")}
                  </span>
                )}

                <p className={cn("mt-3 max-w-[290px] text-[0.93rem] leading-relaxed", isFeatured ? "text-white/78" : "text-slate-700")}>
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {plan.highlights.map((highlight) => (
                    <li key={`${plan.id}-${highlight}`} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "mt-[0.18rem] h-3.5 w-3.5 shrink-0",
                          isFeatured ? "text-biz-yellow" : "text-biz-barbie-pink",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={cn("font-bebas text-[13px] leading-none font-semibold tracking-[0.04em] uppercase", isFeatured ? "text-white" : "text-black")}>
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={cn(
                    "mt-auto inline-flex h-11 w-full items-center justify-center border text-center font-bebas text-[15px] leading-none font-semibold tracking-[0.05em] uppercase transition-colors duration-300",
                    isFeatured
                      ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#ecf029]"
                      : "border-black bg-transparent text-black hover:bg-black hover:text-white",
                  )}
                >
                  {plan.cta}
                </Link>
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
