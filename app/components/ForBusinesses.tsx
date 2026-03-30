"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";
import { buildSignInRedirectFromCurrentLocation } from "@/app/lib/shop-context";

const benefitKeys = [
  "homeRedesign.businessCta.benefits.b1",
  "homeRedesign.businessCta.benefits.b2",
  "homeRedesign.businessCta.benefits.b3",
  "homeRedesign.businessCta.benefits.b4",
  "homeRedesign.businessCta.benefits.b5",
] as const;

export function ForBusinesses() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const loginHref = buildSignInRedirectFromCurrentLocation("/");

  return (
    <section id="negocios" className="w-full bg-black py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-[1260px] grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="inline-flex border-2 border-black bg-biz-yellow px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-black uppercase">
            {t("homeRedesign.businessCta.eyebrow")}
          </p>

          <h2 className="mt-4 max-w-[560px] font-business-display text-[clamp(2.7rem,7.2vw,6.2rem)] leading-[0.84] font-black tracking-[-0.02em] text-white uppercase">
            <span className="block">{t("homeRedesign.businessCta.title1")}</span>
            <span className="block">{t("homeRedesign.businessCta.title2")}</span>
          </h2>

          <p className="mt-4 max-w-[520px] text-[14px] leading-relaxed text-white/75 uppercase tracking-[0.05em]">
            {t("homeRedesign.businessCta.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/negocios#demo"
              className="inline-flex h-10 items-center justify-center bg-biz-barbie-pink px-5 font-bebas text-[14px] leading-none font-semibold tracking-[0.05em] text-white uppercase transition-colors hover:bg-[#d8307b]"
            >
              {t("homeRedesign.businessCta.primary")}
            </Link>
            <Link
              href={loginHref}
              className="inline-flex h-10 items-center justify-center border border-white/50 px-5 font-bebas text-[14px] leading-none font-semibold tracking-[0.05em] text-white uppercase transition-colors hover:border-white hover:bg-white/10"
            >
              {t("homeRedesign.businessCta.secondary")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.08, ease: "easeOut" }}
          className="flex items-center border border-white/12 bg-white/[0.04] p-7 sm:p-10"
        >
          <ul className="w-full space-y-5">
            {benefitKeys.map((key) => (
              <li key={key} className="flex items-start gap-3 text-left">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-biz-yellow" strokeWidth={2.5} />
                <span className="font-bebas text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.1] tracking-[0.04em] text-white uppercase">
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
