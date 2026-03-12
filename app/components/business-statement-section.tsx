"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const DEMO_HREF = "https://cal.com/priconpri/demo";

const benefitKeys = [
  "businessStatement.benefits.bookings247",
  "businessStatement.benefits.reminders",
  "businessStatement.benefits.teamControl",
  "businessStatement.benefits.clientDatabase",
  "businessStatement.benefits.metrics",
] as const;

const beforeKeys = [
  "businessStatement.before.items.manualAgendas",
  "businessStatement.before.items.whatsappBookings",
  "businessStatement.before.items.scheduleErrors",
  "businessStatement.before.items.lowTeamControl",
  "businessStatement.before.items.noFollowUp",
] as const;

export function BusinessStatementSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="beneficios" className="w-full bg-biz-yellow py-14 sm:py-16 lg:py-20 xl:py-24 scroll-mt-20">
      <div className="mx-auto grid min-h-[76vh] w-full max-w-[1380px] grid-cols-1 gap-x-14 gap-y-12 px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-y-4 lg:px-12">
        <motion.div
          className="max-w-[780px]"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-business-display text-[clamp(3.55rem,9.45vw,8.35rem)] leading-[0.79] font-black uppercase tracking-[-0.024em] text-biz-heading-dark">
            <span className="block">{t("businessStatement.line1")}</span>
            <span className="block">{t("businessStatement.line2")}</span>
            <span className="block">{t("businessStatement.line3")}</span>
          </h2>
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="mt-9 max-w-[460px] lg:mt-12"
          >
            <p className="font-bebas text-[24px] font-semibold uppercase tracking-[0.05em] text-biz-heading-dark/45">
              {t("businessStatement.before.title")}
            </p>
            <div className="mt-1 h-px w-24 bg-biz-heading-dark/22" />

            <ul className="mt-4 space-y-2.5">
              {beforeKeys.map((itemKey) => (
                <li
                  key={itemKey}
                  className="font-bebas text-[22px] leading-none uppercase tracking-[0.04em] text-biz-heading-dark/42"
                >
                  — {t(itemKey)}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          className="pt-0.5 lg:max-w-[620px] lg:pt-14 xl:pt-16"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.08, ease: "easeOut" }}
        >
          <p className="inline-block border-b border-b-biz-barbie-pink pb-0.5 font-bebas text-[20px] font-semibold uppercase tracking-[0.06em] text-biz-barbie-pink">
            {t("businessStatement.eyebrow")}
          </p>

          <motion.ul
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
                        staggerChildren: 0.085,
                        delayChildren: 0.12,
                      },
                    },
                  }
            }
            className="mt-4 space-y-3.5"
          >
            {benefitKeys.map((benefitKey) => (
              <motion.li
                key={benefitKey}
                variants={
                  prefersReducedMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 },
                      }
                }
                className="flex items-start gap-3"
              >
                <span className="mt-[0.3rem] flex h-5 w-5 shrink-0 items-center justify-center">
                  <Check className="h-4 w-4 text-biz-sky-surge" strokeWidth={2.3} />
                </span>
                <span className="font-bebas text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[0.9] font-semibold uppercase tracking-tight text-biz-heading-dark">
                  {t(benefitKey)}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 0.42, ease: "easeOut" }}
            className="mt-6 max-w-[560px] font-bebas text-[clamp(1.9rem,3.3vw,3.25rem)] leading-[0.9] font-semibold uppercase tracking-tight text-biz-barbie-pink italic"
          >
            {t("businessStatement.marketingLine")}
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.42, delay: prefersReducedMotion ? 0 : 0.52, ease: "easeOut" }}
            className="mt-7"
          >
            <Button
              asChild
              className="h-11 rounded-none bg-biz-cta-primary px-9 font-bebas text-[17px] font-semibold uppercase tracking-[0.05em] text-white hover:bg-biz-cta-hover"
            >
              <Link href={DEMO_HREF} target="_blank" rel="noopener noreferrer">
                {t("businessStatement.cta")}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
