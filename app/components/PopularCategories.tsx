"use client";

import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { MensajeApi } from "@/types/api";
import { Category } from "@/app/lib/types";
import { CategoryCard } from "./CategoryCard";
import { motion, useReducedMotion } from "framer-motion";

export function PopularCategories() {
  const [popularCategories, setPopularCategories] = useState<Category[]>([]);
  const api = useApi();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchPopularCategories = async () => {
      try {
        const response: MensajeApi<Category[]> = await api.get("/home/categories");
        const data = response.data;
        setPopularCategories(data);
      } catch (error) {
        console.error("Error fetching popular categories:", error);
      }
    };

    fetchPopularCategories();
  }, []);

  const containerVariants = prefersReducedMotion
    ? undefined
    : {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0.08 },
      },
    };

  const itemVariants = prefersReducedMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 15 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    };

  return (
    <section className="border-t border-slate-100 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Explore
          </p>
          <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Popular Categories
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500 dark:text-slate-400">
            Browse our most popular services to find what you need.
          </p>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4"
        >
          {popularCategories.map((category) => (
            <motion.div key={category.id} variants={itemVariants} className="min-w-[200px] sm:min-w-0">
              <CategoryCard category={category} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
