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

  const renderTrack = (suffix: string) => (
    <div className="flex shrink-0 items-center">
      {categoryKeys.map((key, index) => (
        <div key={`${suffix}-${key}-${index}`} className="flex items-center">
          <span className="px-5 text-[22px] leading-none font-black tracking-[0.01em] text-black uppercase sm:px-8 sm:text-[30px]">
            {t(key)}
          </span>
          <span className="h-5 w-px bg-black/35" aria-hidden />
        </div>
      ))}
    </div>
  );

  return (
    <section id="sectores" className="w-full overflow-hidden bg-biz-yellow py-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-[1920px] justify-center overflow-hidden">
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
          className="flex min-w-max items-center gap-0 border-y-2 border-black/35 py-7 -rotate-[1.1deg] will-change-transform sm:py-9"
        >
          {renderTrack("left")}
          {renderTrack("right")}
        </motion.div>
      </div>
    </section>
  );
}
