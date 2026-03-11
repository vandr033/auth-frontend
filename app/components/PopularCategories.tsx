"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const categoryKeys = [
  "homeRedesign.sectors.items.barberia",
  "homeRedesign.sectors.items.salon",
  "homeRedesign.sectors.items.spa",
  "homeRedesign.sectors.items.nails",
  "homeRedesign.sectors.items.facial",
  "homeRedesign.sectors.items.psicologos",
  "homeRedesign.sectors.items.fisioterapia",
  "homeRedesign.sectors.items.depilacion",
  "homeRedesign.sectors.items.maquillaje",
] as const;

export function PopularCategories() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const marqueeItems = [...categoryKeys, ...categoryKeys];

  return (
    <section id="sectores" className="w-full overflow-hidden bg-biz-yellow py-8 sm:py-10">
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
        viewport={{ once: true, margin: "-80px" }}
        transition={
          prefersReducedMotion
            ? { duration: 0.45, ease: "easeOut" }
            : { x: { duration: 26, ease: "linear", repeat: Infinity }, opacity: { duration: 0.45, ease: "easeOut" }, y: { duration: 0.45, ease: "easeOut" } }
        }
        className="mx-auto flex w-max min-w-[200%] items-center justify-center gap-0 border-y-2 border-black/35 px-2 py-7 sm:py-9 -rotate-[1.1deg]"
      >
        {marqueeItems.map((key, index) => (
          <div key={`${key}-${index}`} className="flex items-center">
            <span className="px-5 text-[22px] leading-none font-black tracking-[0.01em] text-black uppercase sm:px-8 sm:text-[30px]">
              {t(key)}
            </span>
            {index < marqueeItems.length - 1 ? <span className="h-5 w-px bg-black/35" aria-hidden /> : null}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
