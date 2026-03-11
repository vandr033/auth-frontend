"use client";

import { Clock3, Filter, History, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const supportItems = [
  { key: "businessCrmMemory.support.history", Icon: History },
  { key: "businessCrmMemory.support.lastVisit", Icon: Clock3 },
  { key: "businessCrmMemory.support.preferences", Icon: Sparkles },
  { key: "businessCrmMemory.support.segmentation", Icon: Filter },
] as const;

const cardRows = [
  {
    labelKey: "businessCrmMemory.card.rows.lastVisit.label",
    valueKey: "businessCrmMemory.card.rows.lastVisit.value",
  },
  {
    labelKey: "businessCrmMemory.card.rows.preference.label",
    valueKey: "businessCrmMemory.card.rows.preference.value",
  },
  {
    labelKey: "businessCrmMemory.card.rows.avgTicket.label",
    valueKey: "businessCrmMemory.card.rows.avgTicket.value",
  },
] as const;

export function BusinessCrmMemorySection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="clientes"
      aria-labelledby="business-crm-memory-title"
      className="relative w-full overflow-hidden bg-biz-surface py-16 sm:py-20 lg:py-24 xl:py-28 scroll-mt-20"
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16 lg:px-10">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="order-1"
        >
          <article className="group relative mx-auto w-full max-w-[420px]">
            <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-biz-cherry-blossom/30 blur-[50px]" />
            <div className="relative border border-slate-200/90 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out group-hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full bg-slate-200"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold tracking-[0.01em] text-biz-heading-dark">
                    {t("businessCrmMemory.card.name")}
                  </p>
                  <p className="font-bebas text-[12px] leading-none tracking-[0.08em] text-slate-500 uppercase">
                    {t("businessCrmMemory.card.meta")}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-slate-200/85 pt-3.5">
                {cardRows.map((row) => (
                  <div
                    key={row.labelKey}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-200/75 pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="font-bebas text-[12px] leading-none tracking-[0.08em] text-slate-500 uppercase">
                      {t(row.labelKey)}
                    </p>
                    <p className="font-bebas text-[12px] leading-none font-semibold tracking-[0.04em] text-biz-heading-dark uppercase">
                      {t(row.valueKey)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="border border-slate-300/80 px-2 py-1 font-bebas text-[11px] leading-none tracking-[0.08em] text-slate-600 uppercase">
                  {t("businessCrmMemory.card.tags.primary")}
                </span>
                <span className="border border-slate-300/80 px-2 py-1 font-bebas text-[11px] leading-none tracking-[0.08em] text-slate-600 uppercase">
                  {t("businessCrmMemory.card.tags.secondary")}
                </span>
              </div>

              <div className="mt-4 bg-biz-cta-primary px-4 py-2.5 text-center">
                <p className="font-bebas text-[14px] leading-none font-semibold tracking-[0.06em] text-white uppercase">
                  {t("businessCrmMemory.card.cta")}
                </p>
              </div>
            </div>
          </article>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: prefersReducedMotion ? 0 : 0.08 }}
          className="order-2 max-w-[760px]"
        >
          <h2
            id="business-crm-memory-title"
            className="font-business-display text-[clamp(3rem,7.8vw,6.25rem)] leading-[0.84] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
          >
            <span className="block">{t("businessCrmMemory.line1")}</span>
            <span className="block text-biz-barbie-pink">{t("businessCrmMemory.line2")}</span>
            <span className="block">{t("businessCrmMemory.line3")}</span>
          </h2>

          <p className="mt-4 max-w-[620px] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed text-slate-700">
            {t("businessCrmMemory.description")}
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            {supportItems.map((item) => {
              const Icon = item.Icon;

              return (
                <li key={item.key}>
                  <span className="inline-flex items-center gap-2.5 font-bebas text-[clamp(1rem,1.35vw,1.22rem)] leading-none tracking-[0.05em] text-biz-heading-dark uppercase transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-biz-barbie-pink">
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                    {t(item.key)}
                  </span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
