"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

export function HomeFinalCta() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="w-full bg-biz-barbie-pink py-20 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-[1240px] px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ fontSize: "clamp(5rem, 12vw, 14rem)", lineHeight: 0.85 }}
          className="font-business-display font-black tracking-[-0.028em] text-white uppercase"
        >
          <span className="block">{t("homeRedesign.finalCta.line1")}</span>
          <span className="block">{t("homeRedesign.finalCta.line2")}</span>
          <span className="block">{t("homeRedesign.finalCta.line3")}</span>
        </motion.h2>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.42, delay: prefersReducedMotion ? 0 : 0.1, ease: "easeOut" }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
        >
          <Link
            href="/marketplace"
            className="inline-flex h-16 min-w-[340px] items-center justify-center bg-biz-yellow px-10 font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-black uppercase transition-colors hover:bg-[#eef429]"
          >
            {t("homeRedesign.finalCta.primary")}
          </Link>
          <Link
            href="/negocios"
            className="inline-flex h-16 min-w-[300px] items-center justify-center border border-white px-10 font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-white hover:text-biz-barbie-pink"
          >
            {t("homeRedesign.finalCta.secondary")}
          </Link>
        </motion.div>

        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
          className="mt-10 font-bebas text-[22px] leading-none tracking-[0.11em] text-white/90 uppercase"
        >
          {t("homeRedesign.finalCta.microcopy")}
        </motion.p>
      </div>
    </section>
  );
}
