"use client";

import { Search, Calendar, CheckCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    num: 1,
    title: "Discover",
    description:
      "Find the best salons and services that match your style and needs.",
    icon: <Search className="h-6 w-6" />,
    color: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  },
  {
    num: 2,
    title: "Book",
    description:
      "Choose your preferred date, time, and professional with just a few clicks.",
    icon: <Calendar className="h-6 w-6" />,
    color: "bg-violet-500/10 text-violet-500 dark:bg-violet-500/20",
  },
  {
    num: 3,
    title: "Show Up",
    description:
      "Relax and enjoy your service. We'll handle the reminders.",
    icon: <CheckCircle className="h-6 w-6" />,
    color: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
  },
];

export function HowItWorks() {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? undefined
    : {
      hidden: {},
      visible: { transition: { staggerChildren: 0.12 } },
    };

  const itemVariants = prefersReducedMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    };

  return (
    <section
      id="how-it-works"
      className="border-t border-slate-100 bg-white py-20 dark:border-slate-800 dark:bg-slate-950 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Simple process
          </p>
          <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Book with Ease
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500 dark:text-slate-400">
            Booking your next appointment is as simple as 1, 2, 3.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={itemVariants}
              className="group relative rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color} transition-transform duration-300 group-hover:scale-110`}
              >
                {step.icon}
              </div>
              <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Step {step.num}
              </span>
              <h3 className="mb-2 font-heading text-xl font-bold text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
