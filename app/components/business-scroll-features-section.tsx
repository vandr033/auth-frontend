"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { BarChart3, CalendarClock, Database, Globe2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type FeatureId = "landing" | "agenda" | "database" | "metrics";

type Step = {
  id: FeatureId;
  number: string;
  label: string;
  title: string;
  description: string;
  captionTitle: string;
  mediaUrl: string;
  mediaPosition: string;
};

function FeatureIcon({ id }: { id: FeatureId }) {
  if (id === "landing") return <Globe2 className="h-4 w-4" />;
  if (id === "agenda") return <CalendarClock className="h-4 w-4" />;
  if (id === "database") return <Database className="h-4 w-4" />;
  return <BarChart3 className="h-4 w-4" />;
}

export function BusinessScrollFeaturesSection() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "landing",
        number: t("businessWalkthrough.steps.landing.number"),
        label: t("businessWalkthrough.steps.landing.label"),
        title: t("businessWalkthrough.steps.landing.title"),
        description: t("businessWalkthrough.steps.landing.description"),
        captionTitle: t("businessWalkthrough.steps.landing.captionTitle"),
        mediaUrl:
          "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1800&q=80",
        mediaPosition: "center",
      },
      {
        id: "agenda",
        number: t("businessWalkthrough.steps.agenda.number"),
        label: t("businessWalkthrough.steps.agenda.label"),
        title: t("businessWalkthrough.steps.agenda.title"),
        description: t("businessWalkthrough.steps.agenda.description"),
        captionTitle: t("businessWalkthrough.steps.agenda.captionTitle"),
        mediaUrl:
          "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1800&q=80",
        mediaPosition: "center",
      },
      {
        id: "database",
        number: t("businessWalkthrough.steps.database.number"),
        label: t("businessWalkthrough.steps.database.label"),
        title: t("businessWalkthrough.steps.database.title"),
        description: t("businessWalkthrough.steps.database.description"),
        captionTitle: t("businessWalkthrough.steps.database.captionTitle"),
        mediaUrl:
          "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1800&q=80",
        mediaPosition: "center",
      },
      {
        id: "metrics",
        number: t("businessWalkthrough.steps.metrics.number"),
        label: t("businessWalkthrough.steps.metrics.label"),
        title: t("businessWalkthrough.steps.metrics.title"),
        description: t("businessWalkthrough.steps.metrics.description"),
        captionTitle: t("businessWalkthrough.steps.metrics.captionTitle"),
        mediaUrl:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1800&q=80",
        mediaPosition: "center",
      },
    ],
    [t],
  );

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latestProgress) => {
    const nextIndex = Math.max(
      0,
      Math.min(steps.length - 1, Math.round(latestProgress * (steps.length - 1))),
    );
    setActiveIndex((previous) => (previous === nextIndex ? previous : nextIndex));
  });

  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <section id="funcionalidades" className="w-full bg-white scroll-mt-20">
      <h2 className="sr-only">{t("businessWalkthrough.heading")}</h2>

      <div className="hidden lg:grid lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
        <div ref={timelineRef} className="bg-[#ececec] px-7 xl:px-12">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;

            return (
              <article
                key={step.id}
                className="min-h-[96svh] border-b border-slate-300/55 pt-24 pb-14"
              >
                <div
                  className={cn(
                    "max-w-[560px] transition-opacity duration-500",
                    isActive ? "opacity-100" : "opacity-35",
                  )}
                >
                  <p className="font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-biz-barbie-pink">
                    {step.number}
                  </p>
                  <h3 className="mt-1 font-bebas text-[clamp(2.65rem,4.3vw,5.4rem)] leading-[0.86] font-semibold uppercase tracking-tight text-biz-heading-dark">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-[500px] text-[1.1rem] leading-relaxed text-slate-700">
                    {step.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="relative border-l border-slate-300/55">
          <div className="sticky top-14 h-[calc(100svh-3.5rem)] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep.id}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 1.018 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <div
                  className="absolute inset-0 scale-[1.04] bg-cover grayscale"
                  style={{
                    backgroundImage: `url(${activeStep.mediaUrl})`,
                    backgroundPosition: activeStep.mediaPosition,
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,12,14,0.88)_0%,rgba(10,12,14,0.55)_28%,rgba(10,12,14,0.16)_58%,rgba(0,0,0,0)_84%)]" />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 z-10 p-7 text-white">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
                <FeatureIcon id={activeStep.id} />
                <span>{t("businessWalkthrough.captionLabel")}</span>
              </div>
              <p className="font-bebas text-[3rem] leading-[0.86] font-semibold uppercase tracking-tight">
                {activeStep.captionTitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-0 lg:hidden">
        {steps.map((step) => (
          <article key={step.id} className="border-b border-slate-300/60 bg-[#ececec]">
            <div className="relative h-[45svh] min-h-[280px] overflow-hidden bg-slate-900">
              <div
                className="absolute inset-0 scale-[1.04] bg-cover bg-center grayscale"
                style={{ backgroundImage: `url(${step.mediaUrl})` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,10,12,0.9)_0%,rgba(8,10,12,0.55)_30%,rgba(8,10,12,0.08)_62%,rgba(0,0,0,0)_86%)]" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
                <div className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
                  <FeatureIcon id={step.id} />
                  <span>{t("businessWalkthrough.captionLabel")}</span>
                </div>
                <p className="font-bebas text-[2.35rem] leading-none font-semibold uppercase tracking-tight">
                  {step.captionTitle}
                </p>
              </div>
            </div>

            <div className="px-6 py-7">
              <p className="font-bebas text-[22px] leading-none font-semibold tracking-[0.06em] text-biz-barbie-pink">
                {step.number}
              </p>
              <p className="mt-1 font-bebas text-[2.6rem] leading-[0.88] font-semibold uppercase tracking-tight text-biz-heading-dark">
                {step.title}
              </p>
              <p className="mt-3 text-[1.02rem] leading-relaxed text-slate-700">{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
