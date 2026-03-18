"use client";

import { Clock3, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";
import type { MarketplaceResultItem } from "@/lib/marketplace/types";
import { formatCurrencyFromCents } from "@/lib/currency";

interface MarketplaceResultCardProps {
  result: MarketplaceResultItem;
  selected: boolean;
  compact?: boolean;
  surface: "list_card" | "fallback_section";
  position: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCardClick: () => void;
  onBookNow: () => void;
  onViewSalon: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=900&auto=format&fit=crop";

function getMatchLabel(result: MarketplaceResultItem, t: (key: string) => string) {
  if (result.matchLabel) return result.matchLabel.toUpperCase();
  if (result.matchType === "exact") return t("marketplaceRedesign.results.matchExact");
  if (result.matchType === "flexible") return t("marketplaceRedesign.results.matchFlexible");
  return t("marketplaceRedesign.results.matchSimilar");
}

function getMatchBadgeClasses(result: MarketplaceResultItem) {
  const classification = result.matchClassification;
  if (classification === "exact_match" || result.matchType === "exact") {
    return "border-[#c6f0d5] bg-[#effcf4] text-[#136c3d]";
  }
  if (classification === "flexible_match" || result.matchType === "flexible") {
    return "border-[#ffe3ba] bg-[#fff8ec] text-[#9a5a00]";
  }
  return "border-[#f9b6d1] bg-[#fff1f8] text-[#9b2e64]";
}

export function MarketplaceResultCard({
  result,
  selected,
  compact,
  position,
  onMouseEnter,
  onMouseLeave,
  onCardClick,
  onBookNow,
  onViewSalon,
}: MarketplaceResultCardProps) {
  const t = useT();
  const imageSrc = getImageUrl(result.thumbnailImage || "") || FALLBACK_IMAGE;
  const amount = formatCurrencyFromCents(Math.max(0, result.priceFrom), result.currency);
  const fromPrice = t("marketplaceRedesign.results.fromPrice", { amount });

  return (
    <article
      id={`market-result-${result.companyId}`}
      data-market-company={result.companyId}
      className={cn(
        "group overflow-hidden border bg-white transition-all",
        selected
          ? "border-black shadow-[4px_4px_0_#111]"
          : "border-black/14 hover:border-black/35",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button type="button" className="w-full text-left" onClick={onCardClick}>
        <div className="grid gap-4 p-4 sm:grid-cols-[138px_1fr] sm:p-5">
          <div className={cn("relative overflow-hidden border border-black/10 bg-slate-100", compact ? "h-24" : "h-32")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={result.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <div className="absolute left-2 top-2">
              <Badge className={cn("border text-[10px] font-semibold tracking-[0.07em] uppercase", getMatchBadgeClasses(result))}>
                {getMatchLabel(result, t)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-bebas text-[42px] leading-[0.82] tracking-[-0.01em] text-black">{result.name}</h3>
                <p className="truncate font-bebas text-[19px] leading-none tracking-[0.01em] text-slate-600 uppercase">
                  {(result.businessType || t("marketplaceRedesign.results.defaultBusinessType")).toUpperCase()}
                  {result.zoneOrArea ? ` • ${result.zoneOrArea.toUpperCase()}` : ""}
                </p>
              </div>
              <span className="border border-black/10 bg-slate-50 px-2 py-1 font-bebas text-[20px] leading-none text-slate-700">#{position + 1}</span>
            </div>

            <div className="grid gap-1 text-[16px] text-slate-800">
              <p className="truncate font-bebas text-[27px] leading-none tracking-tight uppercase">
                {result.serviceName.toUpperCase()} • {fromPrice}
              </p>
              <p className="flex items-center gap-1.5 text-[15px] text-slate-700">
                <Clock3 className="h-4 w-4" />
                {result.matchedSlotDate} {t("marketplaceRedesign.results.atTime")} {result.matchedSlotTime}
              </p>
              <p className="flex items-center gap-1.5 text-[15px] text-slate-700">
                <MapPin className="h-4 w-4" />
                {(result.city || t("marketplaceRedesign.results.defaultCity")).toUpperCase()}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="line-clamp-2 text-sm text-slate-600">{result.whyThisResult}</p>
              <div className="inline-flex items-center gap-1 whitespace-nowrap border border-[#ffe49c] bg-[#fff9e8] px-2 py-1 font-semibold text-[#9a6500]">
                <Star className="h-3.5 w-3.5 fill-[#f1bc21] text-[#f1bc21]" />
                {result.rating.toFixed(1)} ({result.reviewCount})
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="flex flex-wrap gap-2 border-t border-black/10 bg-[#f7f7f7] px-4 py-3 sm:px-5">
        <Button
          type="button"
          size="sm"
          className="rounded-none border border-black bg-black font-bebas tracking-[0.08em] text-white uppercase hover:bg-white hover:text-black"
          onClick={onBookNow}
        >
          {t("marketplaceRedesign.results.bookNow")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-none border-black font-bebas tracking-[0.08em] uppercase"
          onClick={onViewSalon}
        >
          {t("marketplaceRedesign.results.viewSalon")}
        </Button>
      </div>
    </article>
  );
}
