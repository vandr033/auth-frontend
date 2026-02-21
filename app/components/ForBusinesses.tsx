"use client";

import { CheckCircle2, Rocket, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const perks = [
  "Online bookings with instant confirmations",
  "Customer reminders that reduce no-shows",
  "Staff scheduling that adapts to your hours",
];

export function ForBusinesses() {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

  return (
    <section
      id="for-businesses"
      className="relative overflow-hidden bg-slate-900 py-20 text-white sm:py-28 dark:bg-black"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-transparent to-purple-900/10" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand/10 blur-[100px]" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={variants}
        className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <Rocket className="h-3.5 w-3.5" />
            For businesses
          </span>
          <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
            Bring your barbershop online with a booking page people love.
          </h2>
          <p className="text-lg text-white/70">
            Manage appointments, keep clients engaged, and give your team the tools
            to stay organized.
          </p>
          <div className="space-y-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                <span className="text-sm text-white/80">{perk}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link href="/auth/register">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-100 hover:shadow-xl active:scale-95">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/auth/sign-in">
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5">
                Already onboard? Sign in
              </button>
            </Link>
          </div>
        </div>

        {/* Decorative card */}
        <div className="hidden w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur lg:block">
          <div className="space-y-5">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/5" />
              ))}
            </div>
            <div className="h-10 rounded-xl bg-brand/30" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
