"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const CTA_HREF = "/contact";

export function BusinessFinalCtaSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="demo"
      aria-labelledby="business-final-cta-title"
      className="w-full bg-biz-barbie-pink py-20 sm:py-24 lg:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1240px] px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          id="business-final-cta-title"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: "clamp(5rem, 12vw, 14rem)", lineHeight: 0.85 }}
          className="font-business-display font-black tracking-[-0.028em] text-white uppercase"
        >
          <span className="block">{t("businessFinalCta.line1")}</span>
          <span className="block">{t("businessFinalCta.line2")}</span>
          <span className="block">{t("businessFinalCta.line3")}</span>
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
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
        >
          <motion.div
            variants={
              prefersReducedMotion
                ? undefined
                : {
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }
            }
          >
            <Link
              href={CTA_HREF}
              className="inline-flex h-16 min-w-[340px] items-center justify-center bg-biz-yellow px-10 font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-black uppercase transition-colors duration-300 hover:bg-[#eef429]"
            >
              {t("businessFinalCta.primaryCta")}
            </Link>
          </motion.div>

          <motion.div
            variants={
              prefersReducedMotion
                ? undefined
                : {
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }
            }
          >
            <Link
              href={CTA_HREF}
              className="inline-flex h-16 min-w-[300px] items-center justify-center border border-white px-10 font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-white uppercase transition-colors duration-300 hover:bg-white hover:text-biz-barbie-pink"
            >
              {t("businessFinalCta.secondaryCta")}
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 0.28, ease: "easeOut" }}
          className="mt-10 font-bebas text-[22px] leading-none tracking-[0.11em] text-white/90 uppercase"
        >
          {t("businessFinalCta.microcopy")}
        </motion.p>
      </div>
    </section>
  );
}
