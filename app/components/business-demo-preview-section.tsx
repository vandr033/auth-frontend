"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Scissors,
} from "lucide-react";

import { useT } from "@/lib/i18n";

const features = [
  { icon: <LayoutDashboard className="h-5 w-5 shrink-0" />, key: "dashboard" },
  { icon: <Calendar className="h-5 w-5 shrink-0" />, key: "bookings" },
  { icon: <Scissors className="h-5 w-5 shrink-0" />, key: "services" },
  { icon: <Users className="h-5 w-5 shrink-0" />, key: "staff" },
  { icon: <BarChart3 className="h-5 w-5 shrink-0" />, key: "customers" },
  { icon: <Settings className="h-5 w-5 shrink-0" />, key: "settings" },
];

export function BusinessDemoPreviewSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="business-demo-preview-title"
      className="relative w-full overflow-hidden bg-slate-950 py-20 sm:py-24 lg:py-28"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-biz-barbie-pink/15 blur-[100px]" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-biz-sky-surge/15 blur-[80px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* Left: Text */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="inline-flex border-2 border-white/20 px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-biz-barbie-pink uppercase">
              {t("businessDemoPreview.eyebrow")}
            </p>

            <h2
              id="business-demo-preview-title"
              className="mt-5 font-business-display text-[clamp(2.8rem,7vw,5.8rem)] leading-[0.84] font-black tracking-[-0.02em] text-white uppercase"
            >
              <span className="block">{t("businessDemoPreview.title1")}</span>
              <span className="block text-biz-sky-surge">
                {t("businessDemoPreview.title2")}
              </span>
            </h2>

            <p className="mt-6 max-w-[440px] text-[clamp(0.95rem,1.5vw,1.15rem)] leading-relaxed text-slate-400">
              {t("businessDemoPreview.description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="inline-flex h-14 items-center justify-center bg-biz-barbie-pink px-8 font-bebas text-[18px] leading-none font-semibold tracking-[0.06em] text-white uppercase transition-colors duration-300 hover:bg-biz-barbie-pink/90"
              >
                {t("businessDemoPreview.cta")}
              </Link>
              <span className="font-bebas text-[13px] tracking-[0.12em] text-slate-500 uppercase">
                {t("businessDemoPreview.noAccount")}
              </span>
            </div>
          </motion.div>

          {/* Right: Mock dashboard preview */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.6,
              delay: prefersReducedMotion ? 0 : 0.12,
              ease: "easeOut",
            }}
            className="relative"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="ml-4 h-5 flex-1 rounded bg-slate-800 px-3">
                  <span className="text-[10px] leading-5 text-slate-500">
                    priconpri.com/admin/dashboard
                  </span>
                </div>
              </div>

              {/* Fake dashboard content */}
              <div className="flex">
                {/* Mini sidebar */}
                <div className="hidden w-[52px] shrink-0 border-r border-white/5 bg-slate-900 py-4 sm:block">
                  <div className="flex flex-col items-center gap-3">
                    {features.map((f) => (
                      <div
                        key={f.key}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {f.icon}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main area */}
                <div className="flex-1 p-4 sm:p-5">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    {[
                      { label: "Reservas", value: "1,248", color: "bg-blue-500" },
                      { label: "Ingresos", value: "Bs. 3,485", color: "bg-emerald-500" },
                      { label: "Hoy", value: "6", color: "bg-purple-500" },
                      { label: "7 días", value: "34", color: "bg-amber-500" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-white/5 bg-slate-800/60 p-3"
                      >
                        <div className={`mb-2 h-1 w-6 rounded-full ${stat.color}`} />
                        <p className="text-[10px] text-slate-500">{stat.label}</p>
                        <p className="mt-0.5 text-sm font-bold text-white">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-lg border border-white/5 bg-slate-800/60 p-3">
                      <p className="text-[10px] font-medium text-slate-500">
                        Servicios más vendidos
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {[80, 63, 45, 30].map((w, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-biz-barbie-pink/70" style={{ width: `${w}%` }} />
                            <span className="text-[9px] text-slate-600">{w}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-slate-800/60 p-3">
                      <p className="text-[10px] font-medium text-slate-500">
                        Crecimiento
                      </p>
                      <div className="mt-2 flex items-end gap-1">
                        {[18, 24, 31, 22, 26, 28].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-biz-sky-surge/60"
                            style={{ height: `${Math.max(6, (h / 31) * 32)}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
