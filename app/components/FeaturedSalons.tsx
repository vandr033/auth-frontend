"use client";

import { useEffect, useState } from "react";
import { featuredSalons as mockSalons } from "@/app/lib/mock-data";
import { Salon } from "@/app/lib/types";
import { SalonCard, SalonCardSkeleton } from "./SalonCard";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getImageUrl } from "@/utils/image-url";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001/api";

export function FeaturedSalons() {
  const [salons, setSalons] = useState<Salon[]>(mockSalons);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API_BASE}/company/featured`);
        const json = await res.json();

        if (!res.ok || json.error || !json.data?.length) {
          setSalons(mockSalons);
          return;
        }

        const mapped: Salon[] = json.data.map(
          (c: {
            id: number;
            name: string;
            slug: string;
            city: string;
            neighborhood: string;
            imageUrl: string;
            rating: number;
            isTopRated: boolean;
            isNew: boolean;
          }) => ({
            id: String(c.id),
            name: c.name,
            slug: c.slug,
            city: c.city || "Unknown",
            neighborhood: c.neighborhood || "",
            imageUrl:
              getImageUrl(c.imageUrl) ||
              "https://images.unsplash.com/photo-1599351431202-19a6b8da4433?q=80&w=400&auto=format&fit=crop",
            rating: c.rating || 0,
            isTopRated: c.isTopRated,
            isNew: c.isNew,
          }),
        );

        setSalons(mapped.length > 0 ? mapped : mockSalons);
      } catch {
        setSalons(mockSalons);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const headingVariants = prefersReducedMotion
    ? undefined
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <section className="bg-white py-20 dark:bg-slate-950 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={headingVariants}
          className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Handpicked
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              Featured &amp; Top Rated
            </h2>
            <p className="mt-2 max-w-lg text-slate-500 dark:text-slate-400">
              Salons and barbershops with the best reviews from our community.
            </p>
          </div>
          <Link
            href="/salons"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
              <SalonCardSkeleton key={i} />
            ))
            : salons.map((salon, index) => (
              <SalonCard key={salon.id} salon={salon} index={index} />
            ))}
        </div>
      </div>
    </section>
  );
}
