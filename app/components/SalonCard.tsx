"use client";

import { Salon } from "@/app/lib/types";
import { Star, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1599351431202-19a6b8da4433?q=80&w=400&auto=format&fit=crop";

interface SalonCardProps {
  salon: Salon;
  index?: number;
}

export function SalonCard({ salon, index = 0 }: SalonCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        onClick={() => router.push(`/shop/${salon.slug}`)}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={salon.imageUrl || FALLBACK_IMAGE}
            alt={salon.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {salon.isTopRated && (
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Top Rated
              </span>
            )}
            {salon.isNew && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                New
              </span>
            )}
          </div>

          {/* Book CTA overlay */}
          <div className="absolute bottom-3 right-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg">
              Book Now
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {salon.name}
              </h3>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                {salon.neighborhood}
                {salon.neighborhood && salon.city ? ", " : ""}
                {salon.city}
              </p>
            </div>
            {salon.rating > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 dark:bg-amber-950/30">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {salon.rating}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Skeleton placeholder for loading state */
export function SalonCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="aspect-video animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
