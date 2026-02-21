"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SearchForm } from "./SearchForm";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
      hidden: { opacity: 0, y: 30 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      }),
    };

  return (
    <section
      id="home"
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),transparent)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />

      {/* Subtle mesh accents */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand/10 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 pt-20 pb-16 text-center">
        <motion.p
          custom={0}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Book your next appointment
        </motion.p>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Find your
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            {" "}next look
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="max-w-2xl text-base text-slate-400 sm:text-lg md:text-xl"
        >
          Discover and book the best barbers, stylists, and beauty professionals
          in your area. Real-time availability, instant confirmation.
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="w-full max-w-3xl"
        >
          <SearchForm />
        </motion.div>

        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            1,200+ Professionals
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            50+ Cities
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Instant Booking
          </span>
        </motion.div>
      </div>
    </section>
  );
}
