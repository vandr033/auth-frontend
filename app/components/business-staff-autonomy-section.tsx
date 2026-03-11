"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useT } from "@/lib/i18n";

const scheduleRows = [
  {
    timeKey: "businessStaffAutonomy.mockup.rows.row1.time",
    textKey: "businessStaffAutonomy.mockup.rows.row1.text",
    className: "bg-biz-barbie-pink text-black",
  },
  {
    timeKey: "businessStaffAutonomy.mockup.rows.row2.time",
    textKey: "businessStaffAutonomy.mockup.rows.row2.text",
    className: "bg-biz-sky-surge text-black",
  },
  {
    timeKey: "businessStaffAutonomy.mockup.rows.row3.time",
    textKey: "businessStaffAutonomy.mockup.rows.row3.text",
    className: "bg-biz-yellow text-black",
  },
  {
    timeKey: "businessStaffAutonomy.mockup.rows.row4.time",
    textKey: "businessStaffAutonomy.mockup.rows.row4.text",
    className: "bg-white text-black",
  },
] as const;

const compactLabels = [
  {
    valueKey: "businessStaffAutonomy.labels.bookable.value",
    textKey: "businessStaffAutonomy.labels.bookable.text",
    className: "border-biz-yellow/80 bg-biz-yellow",
  },
  {
    valueKey: "businessStaffAutonomy.labels.autonomy.value",
    textKey: "businessStaffAutonomy.labels.autonomy.text",
    className: "border-biz-sky-surge/70 bg-biz-sky-surge",
  },
] as const;

export function BusinessStaffAutonomySection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="staff"
      aria-labelledby="business-staff-autonomy-title"
      className="w-full bg-white py-16 sm:py-20 lg:py-24 xl:py-28 scroll-mt-20"
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-16 lg:px-10">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24, x: -18 }}
          whileInView={{ opacity: 1, y: 0, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="order-1"
        >
          <h2
            id="business-staff-autonomy-title"
            className="font-business-display text-[clamp(3rem,8.15vw,6.55rem)] leading-[0.83] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
          >
            <span className="block">{t("businessStaffAutonomy.line1")}</span>
            <span className="block">{t("businessStaffAutonomy.line2")}</span>
            <span className="block text-biz-sky-surge">{t("businessStaffAutonomy.line3")}</span>
            <span className="block">{t("businessStaffAutonomy.line4")}</span>
          </h2>

          <p className="mt-5 max-w-[520px] text-[clamp(0.95rem,1.2vw,1.08rem)] leading-relaxed text-slate-700">
            {t("businessStaffAutonomy.description")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {compactLabels.map((label, index) => (
              <motion.div
                key={label.valueKey}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.38, delay: prefersReducedMotion ? 0 : 0.12 + index * 0.08, ease: "easeOut" }}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                className={`min-w-[96px] border px-3 py-2 ${label.className}`}
              >
                <p className="font-bebas text-[30px] leading-[0.9] font-semibold tracking-[0.02em] text-biz-heading-dark uppercase">
                  {t(label.valueKey)}
                </p>
                <p className="mt-1 font-bebas text-[10px] leading-none tracking-[0.08em] text-biz-heading-dark/85 uppercase">
                  {t(label.textKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, x: 26, y: 14 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: prefersReducedMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 flex justify-center lg:justify-end"
        >
          <motion.article
            whileHover={prefersReducedMotion ? undefined : { y: -3, rotate: -2.5 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            aria-label={t("businessStaffAutonomy.mockup.ariaLabel")}
            className="w-full max-w-[500px] rotate-[-3.4deg] border border-black/85 bg-[#050608] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center justify-between">
              <p className="font-bebas text-[13px] leading-none tracking-[0.06em] text-white uppercase">
                {t("businessStaffAutonomy.mockup.title")}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-400" />
                <span className="h-3 w-3 rounded-full bg-slate-500" />
                <span className="h-3 w-3 rounded-full bg-slate-600" />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {scheduleRows.map((row) => (
                <div key={row.timeKey} className="grid grid-cols-[50px_1fr] items-center gap-2.5">
                  <span className="font-bebas text-[11px] leading-none tracking-[0.08em] text-white/70">
                    {t(row.timeKey)}
                  </span>
                  <div className={`px-3 py-1.5 ${row.className}`}>
                    <p className="truncate font-bebas text-[11px] leading-none font-semibold tracking-[0.05em] uppercase">
                      {t(row.textKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.article>
        </motion.div>
      </div>
    </section>
  );
}
