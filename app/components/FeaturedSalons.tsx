"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { getImageUrl } from "@/utils/image-url";

type FeaturedProfessional = {
  id: string;
  slug: string;
  name: string;
  location: string;
  rating: string;
  count: string;
  badge?: string;
  imageUrl?: string | null;
  imageClass: string;
};

interface FeaturedCompanyApi {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  neighborhood?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  thumbnail_image?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  review_count?: number | null;
  isTopRated?: boolean;
  isNew?: boolean;
}

const FEATURE_IMAGE_CLASSES = [
  "bg-[linear-gradient(145deg,#3b2c26_0%,#141414_100%)]",
  "bg-[linear-gradient(145deg,#d7d7d7_0%,#5f5f5f_100%)]",
  "bg-[linear-gradient(145deg,#ececec_0%,#c8c8c8_100%)]",
  "bg-[linear-gradient(145deg,#54434b_0%,#1d1a1d_100%)]",
];

export function FeaturedSalons() {
  const api = useApi();
  const t = useT();
  const prefersReducedMotion = useReducedMotion();

  const [featured, setFeatured] = useState<FeaturedProfessional[]>([]);

  useEffect(() => {
    let cancelled = false;

    void api
      .get<{ error?: boolean; data?: FeaturedCompanyApi[] }>("/company/featured")
      .then((response) => {
        if (cancelled) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        if (rows.length === 0) {
          setFeatured([]);
          return;
        }

        const mapped = rows.slice(0, 4).map((item, index) => {
          const rating = typeof item.rating === "number" ? item.rating.toFixed(1) : "4.8";
          const reviewCountRaw = item.reviewCount ?? item.review_count;
          const reviewCount = typeof reviewCountRaw === "number" && Number.isFinite(reviewCountRaw)
            ? String(reviewCountRaw)
            : "120";
          const locationParts = [item.city, item.neighborhood].filter(Boolean) as string[];
          const location = locationParts.length > 0 ? locationParts.join(" · ") : "";

          return {
            id: String(item.id),
            slug: item.slug || "marketplace",
            name: item.name || "",
            location,
            rating,
            count: reviewCount,
            badge: item.isTopRated ? "TOP" : item.isNew ? "NEW" : undefined,
            imageUrl: item.imageUrl || item.image_url || item.thumbnail_image,
            imageClass: FEATURE_IMAGE_CLASSES[index % FEATURE_IMAGE_CLASSES.length],
          } satisfies FeaturedProfessional;
        }).filter((item) => item.name.trim().length > 0);

        setFeatured(mapped);
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      });

    return () => {
      cancelled = true;
    };
  }, [api, t]);

  return (
    <section id="profesionales" className="w-full bg-[#f3f3f3] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex border-2 border-black px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-biz-barbie-pink uppercase">
              {t("homeRedesign.featured.eyebrow")}
            </p>
            <h2 className="mt-4 font-business-display text-[clamp(2.7rem,7vw,6.3rem)] leading-[0.84] font-black tracking-[-0.02em] text-black uppercase">
              <span className="block">{t("homeRedesign.featured.title1")}</span>
              <span className="block">{t("homeRedesign.featured.title2")}</span>
            </h2>
          </div>

          <Link
            href="/marketplace"
            className="mb-2 text-[11px] leading-none font-semibold tracking-[0.1em] text-slate-600 uppercase transition-colors hover:text-black"
          >
            {t("homeRedesign.featured.viewAll")}
          </Link>
        </div>

        {featured.length > 0 ? (
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={
              prefersReducedMotion
                ? undefined
                : {
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.1,
                      },
                    },
                  }
            }
            className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
          >
            {featured.map((professional) => {
              const imageSrc = getImageUrl(professional.imageUrl || "") || professional.imageUrl;

              return (
                <motion.article
                  key={professional.id}
                  variants={
                    prefersReducedMotion
                      ? undefined
                      : {
                          hidden: { opacity: 0, y: 16 },
                          visible: { opacity: 1, y: 0 },
                        }
                  }
                  className="group"
                >
                  <Link href={`/shop/${professional.slug}`} className="block">
                    <div className="relative overflow-hidden border border-black/12 bg-white">
                      {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc}
                          alt={professional.name}
                          className="aspect-[4/5] w-full object-cover"
                        />
                      ) : (
                        <div className={`aspect-[4/5] w-full ${professional.imageClass}`} />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(0,0,0,0.08))]" />
                      {professional.badge ? (
                        <span className="absolute right-2 top-2 bg-biz-barbie-pink px-2 py-1 font-bebas text-[10px] leading-none tracking-[0.08em] text-white uppercase">
                          {professional.badge}
                        </span>
                      ) : null}
                    </div>
                  </Link>

                  <div className="mt-3 space-y-1">
                    <h3 className="font-bebas text-[20px] leading-[0.92] font-semibold tracking-tight text-black uppercase">
                      {professional.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 text-[11px] tracking-[0.04em] uppercase">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {professional.location || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Star className="h-3.5 w-3.5 shrink-0 fill-biz-yellow text-biz-yellow" />
                        {professional.rating}
                        <span className="text-slate-500">({professional.count})</span>
                      </span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        ) : (
          <p className="mt-8 text-[11px] leading-none font-semibold tracking-[0.1em] text-slate-500 uppercase">
            {t("common.noResults")}
          </p>
        )}
      </div>
    </section>
  );
}
