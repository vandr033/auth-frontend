"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Check, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import {
  type BillingCycle,
  type BusinessPlanId,
  type CompareCell,
  BUSINESS_DEMO_PATH,
  businessPricingCompareCategories,
  businessPricingSummaryPlans,
} from "@/app/components/business-pricing-data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function CellValue({
  cell,
  featured,
  selected,
  includedLabel,
  excludedLabel,
}: {
  cell: CompareCell;
  featured: boolean;
  selected: boolean;
  includedLabel: string;
  excludedLabel: string;
}) {
  if (cell.type === "boolean") {
    if (cell.value) {
      return (
        <span className="inline-flex items-center gap-2 font-bebas text-[13px] leading-none tracking-[0.05em] uppercase">
          <Check
            className={cn(
              "h-3.5 w-3.5",
              selected ? "text-biz-yellow" : featured ? "text-biz-yellow" : "text-biz-barbie-pink",
            )}
            strokeWidth={2.5}
          />
          {includedLabel}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 font-bebas text-[13px] leading-none tracking-[0.05em] uppercase text-slate-500">
        <Minus className="h-3.5 w-3.5" strokeWidth={2.2} />
        {excludedLabel}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "font-bebas text-[14px] leading-none tracking-[0.05em] uppercase",
        selected && "rounded-sm bg-biz-yellow/25 px-2 py-1 text-black",
      )}
    >
      {cell.valueKey}
    </span>
  );
}

function FeaturedSummaryCard({
  planId,
  featured,
  name,
  price,
  currency,
  period,
  billingCycle,
  saveTwoMonths,
  description,
  highlights,
  cta,
  href,
  selected,
  onSelect,
}: {
  planId: BusinessPlanId;
  featured: boolean;
  name: string;
  price: string;
  currency: string;
  period: string;
  billingCycle: BillingCycle;
  saveTwoMonths: string;
  description: string;
  highlights: string[];
  cta: string;
  href: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex min-h-[278px] cursor-pointer flex-col px-5 py-5 transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-biz-surface",
        featured
          ? "bg-black text-white shadow-[0_14px_32px_rgba(2,6,23,0.3)]"
          : "border border-black/15 bg-white text-black",
        selected &&
          (featured
            ? "ring-2 ring-biz-yellow ring-offset-2 ring-offset-biz-surface"
            : "border-biz-yellow bg-biz-yellow/15 shadow-[0_12px_24px_rgba(15,23,42,0.12)]"),
      )}
    >
      <p
        className={cn(
          "font-bebas text-[28px] leading-none font-semibold uppercase tracking-tight",
          selected && !featured ? "text-black" : featured ? "text-white" : "text-black",
        )}
      >
        {name}
      </p>
      <div className="mt-2 flex items-end gap-1.5">
        <p
          className={cn(
            "font-bebas text-[46px] leading-[0.92] font-semibold uppercase tracking-tight",
            selected && !featured ? "text-black" : featured ? "text-white" : "text-black",
          )}
        >
          {price}
        </p>
        <p
          className={cn(
            "pb-1 font-bebas text-[13px] leading-none tracking-[0.06em] uppercase",
            selected && !featured ? "text-black/65" : featured ? "text-white/75" : "text-black/65",
          )}
        >
          {currency} {period}
        </p>
      </div>

      {billingCycle === "yearly" && (
        <span
          className={cn(
            "mt-2 inline-flex w-fit items-center border px-2.5 py-1 font-bebas text-[12px] leading-none tracking-[0.06em] uppercase",
            featured
              ? "border-biz-yellow bg-biz-yellow text-black"
              : "border-black/20 bg-black text-white",
          )}
        >
          {saveTwoMonths}
        </span>
      )}

      <p
        className={cn(
          "mt-2 text-[0.9rem] leading-relaxed",
          selected && !featured ? "text-slate-800" : featured ? "text-white/78" : "text-slate-700",
        )}
      >
        {description}
      </p>

      <ul className="mt-4 space-y-1.5">
        {highlights.map((item, index) => (
          <li
            key={`${planId}-${index}`}
            className={cn(
              "font-bebas text-[13px] leading-none tracking-[0.05em] uppercase",
              selected && !featured ? "text-black" : featured ? "text-white" : "text-black",
            )}
          >
            {item}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={cn(
          "mt-auto inline-flex h-10 items-center justify-center border font-bebas text-[14px] leading-none font-semibold tracking-[0.05em] uppercase transition-colors",
          selected && "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]",
          featured
            ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]"
            : "border-black text-black hover:bg-black hover:text-white",
        )}
      >
        {cta}
      </Link>
    </article>
  );
}

export default function NegociosPreciosPage() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [selectedPlanId, setSelectedPlanId] = useState<BusinessPlanId>(
    () => businessPricingSummaryPlans.find((plan) => plan.featured)?.id ?? "business",
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const includedLabel = t("businessPricing.comparison.values.included");
  const excludedLabel = t("businessPricing.comparison.values.notIncluded");

  const plans = businessPricingSummaryPlans.map((plan) => ({
    ...plan,
    name: t(plan.nameKey),
    price: t(plan.priceKeys[billingCycle]),
    period: t(`businessPricing.billing.period.${billingCycle}`),
    description: t(plan.descriptionKey),
    cta: t(plan.ctaKey),
    highlights: plan.highlightKeys.map((item) => t(item)),
  }));

  return (
    <main className="min-h-[calc(100svh-3.5rem)] bg-biz-surface">
      <section className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 lg:px-10 lg:pt-20 lg:pb-16">
        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="font-bebas text-[16px] leading-none tracking-[0.08em] text-biz-barbie-pink uppercase"
        >
          {t("businessPricing.comparison.eyebrow")}
        </motion.p>
        <motion.h1
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 font-business-display text-[clamp(3rem,8.4vw,7rem)] leading-[0.82] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
        >
          {t("businessPricing.comparison.title")}
        </motion.h1>
        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.42, delay: prefersReducedMotion ? 0 : 0.1, ease: "easeOut" }}
          className="mt-4 max-w-[760px] text-[1rem] leading-relaxed text-slate-700"
        >
          {t("businessPricing.comparison.subtitle")}
        </motion.p>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-8 lg:px-10">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.36, delay: prefersReducedMotion ? 0 : 0.08, ease: "easeOut" }}
          className="mb-6 flex justify-center"
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
                      staggerChildren: 0.08,
                    },
                  },
                }
          }
          aria-label={t("businessPricing.comparison.summaryAria")}
          className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              variants={
                prefersReducedMotion
                  ? undefined
                  : {
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }
              }
            >
              <FeaturedSummaryCard
                planId={plan.id}
                featured={plan.featured}
                name={plan.name}
                price={plan.price}
                currency={t("businessPricing.currency")}
                period={plan.period}
                billingCycle={billingCycle}
                saveTwoMonths={t("businessPricing.billing.saveTwoMonths")}
                description={plan.description}
                highlights={plan.highlights}
                cta={plan.cta}
                href={plan.ctaHref}
                selected={selectedPlanId === plan.id}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-10 lg:px-10">
        <h2 className="font-bebas text-[30px] leading-none font-semibold tracking-[0.03em] text-biz-heading-dark uppercase">
          {t("businessPricing.comparison.matrixHeading")}
        </h2>

        <div className="mt-6 hidden overflow-x-auto border border-black/15 bg-white lg:block">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="sticky top-14 z-20">
              <tr className="border-b border-black/15">
                <th className="sticky left-0 z-30 w-[315px] bg-white px-5 py-4 text-left font-bebas text-[14px] tracking-[0.05em] text-slate-500 uppercase">
                  {t("businessPricing.comparison.featureColumn")}
                </th>
                {plans.map((plan) => (
                  <th
                    key={`${plan.id}-head`}
                    className={cn(
                      "px-5 py-4 text-left",
                      selectedPlanId === plan.id
                        ? "bg-biz-yellow text-black"
                        : plan.featured
                          ? "bg-black text-white"
                          : "bg-white text-black",
                    )}
                  >
                    <p className="font-bebas text-[23px] leading-none font-semibold tracking-[0.04em] uppercase">
                      {plan.name}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-bebas text-[15px] leading-none tracking-[0.05em] uppercase",
                        selectedPlanId === plan.id
                          ? "text-black/70"
                          : plan.featured
                            ? "text-white/76"
                            : "text-black/70",
                      )}
                    >
                      {plan.price} {t("businessPricing.currency")} {plan.period}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businessPricingCompareCategories.map((category) => (
                <Fragment key={category.id}>
                  <tr key={`${category.id}-category`} className="border-y border-black/12 bg-[#f8f8f8]">
                    <td colSpan={plans.length + 1} className="px-5 py-2.5 font-bebas text-[14px] tracking-[0.05em] text-slate-600 uppercase">
                      {t(category.titleKey)}
                    </td>
                  </tr>
                  {category.features.map((feature, featureIndex) => (
                    <tr
                      key={feature.key}
                      className={cn(
                        "border-b border-black/10",
                        featureIndex % 2 === 0 ? "bg-white" : "bg-[#fcfcfc]",
                      )}
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-inherit px-5 py-4 text-left text-[0.94rem] font-medium leading-relaxed text-slate-700"
                      >
                        {t(feature.key)}
                      </th>
                      {plans.map((plan) => {
                        const cell = feature.values[plan.id];
                        const translatedCell =
                          cell.type === "boolean"
                            ? cell
                            : {
                                ...cell,
                                valueKey: t(cell.valueKey),
                              };

                        return (
                          <td
                            key={`${feature.key}-${plan.id}`}
                            className={cn(
                              "px-5 py-4 align-middle",
                              selectedPlanId === plan.id
                                ? "bg-biz-yellow/22 text-black"
                                : plan.featured
                                  ? "bg-black text-white"
                                  : "text-slate-800",
                            )}
                          >
                            <CellValue
                              cell={translatedCell}
                              featured={plan.featured}
                              selected={selectedPlanId === plan.id}
                              includedLabel={includedLabel}
                              excludedLabel={excludedLabel}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-7 lg:hidden">
          {businessPricingCompareCategories.map((category) => (
            <section key={`${category.id}-mobile`}>
              <h3 className="font-bebas text-[24px] leading-none font-semibold tracking-[0.04em] text-slate-700 uppercase">
                {t(category.titleKey)}
              </h3>
              <div className="mt-3 space-y-3">
                {category.features.map((feature) => (
                  <article key={`${feature.key}-mobile`} className="border border-black/12 bg-white px-4 py-3.5">
                    <p className="text-[0.93rem] leading-relaxed font-medium text-slate-700">
                      {t(feature.key)}
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {plans.map((plan) => {
                        const cell = feature.values[plan.id];
                        const translatedCell =
                          cell.type === "boolean"
                            ? cell
                            : {
                                ...cell,
                                valueKey: t(cell.valueKey),
                              };

                        return (
                          <div
                            key={`${feature.key}-${plan.id}-mobile`}
                            className={cn(
                              "grid grid-cols-[120px_1fr] items-center gap-2 rounded-sm px-1.5 py-1",
                              selectedPlanId === plan.id && "bg-biz-yellow/30",
                            )}
                          >
                            <span className="font-bebas text-[13px] leading-none tracking-[0.05em] text-slate-500 uppercase">
                              {plan.name}
                            </span>
                            <CellValue
                              cell={translatedCell}
                              featured={plan.featured}
                              selected={selectedPlanId === plan.id}
                              includedLabel={includedLabel}
                              excludedLabel={excludedLabel}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-16 lg:px-10 lg:pb-20">
        <div className="border border-black/15 bg-white px-5 py-6 lg:px-7">
          <p className="font-bebas text-[28px] leading-none font-semibold tracking-[0.03em] text-biz-heading-dark uppercase">
            {t("businessPricing.comparisonFooter.title")}
          </p>
          <p className="mt-2 max-w-[760px] text-[0.98rem] leading-relaxed text-slate-700">
            {t("businessPricing.comparisonFooter.body")}
          </p>
          <div className="mt-4">
            <Link
              href={BUSINESS_DEMO_PATH}
              className="inline-flex h-10 items-center justify-center border border-black bg-black px-4 font-bebas text-[14px] leading-none font-semibold tracking-[0.05em] text-white uppercase transition-colors hover:bg-black/90"
            >
              {t("businessPricing.comparisonFooter.cta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
