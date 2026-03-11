"use client";

import { AlertCircle, Sparkles } from "lucide-react";

import { MarketplaceResultCard } from "@/components/marketplace/MarketplaceResultCard";
import { useT } from "@/lib/i18n";
import type { MarketplaceResultItem } from "@/lib/marketplace/types";

interface MarketplaceResultsListProps {
  loading: boolean;
  error: string | null;
  requestedTime?: string;
  results: MarketplaceResultItem[];
  similarBookings: MarketplaceResultItem[];
  selectedCompanyId: number | null;
  onHoverCompany: (companyId: number | null) => void;
  onSelectCompany: (companyId: number) => void;
  onResultCardClick: (result: MarketplaceResultItem, position: number, surface: "list_card" | "fallback_section") => void;
  onBookNow: (result: MarketplaceResultItem, position: number, surface: "list_card" | "fallback_section") => void;
  onViewSalon: (result: MarketplaceResultItem, position: number, surface: "list_card" | "fallback_section") => void;
}

export function MarketplaceResultsList({
  loading,
  error,
  requestedTime,
  results,
  similarBookings,
  selectedCompanyId,
  onHoverCompany,
  onSelectCompany,
  onResultCardClick,
  onBookNow,
  onViewSalon,
}: MarketplaceResultsListProps) {
  const t = useT();
  const hasRequestedTime = Boolean(requestedTime);
  const exactPrimary = hasRequestedTime
    ? results.filter((result) => (result.matchClassification || result.matchType) === "exact_match" || result.matchType === "exact")
    : results;
  const flexiblePrimary = hasRequestedTime
    ? results.filter((result) => !((result.matchClassification || result.matchType) === "exact_match" || result.matchType === "exact"))
    : [];
  const fallbackResults = hasRequestedTime ? [...flexiblePrimary, ...similarBookings] : similarBookings;
  const showNoExact = hasRequestedTime && exactPrimary.length === 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-56 animate-pulse border border-black/12 bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p className="font-semibold">{t("marketplaceRedesign.results.errorTitle")}</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (results.length === 0 && similarBookings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{t("marketplaceRedesign.results.emptyTitle")}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("marketplaceRedesign.results.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bebas text-[42px] leading-none tracking-tight text-black uppercase">{t("marketplaceRedesign.results.matchesTitle")}</h2>
          <span className="border border-black/10 bg-slate-100 px-2.5 py-1 font-bebas text-[19px] leading-none text-slate-700 uppercase">
            {t("marketplaceRedesign.results.resultsCount", { count: exactPrimary.length })}
          </span>
        </div>

        {showNoExact && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <Sparkles className="mt-0.5 h-4 w-4" />
            {t("marketplaceRedesign.results.noExactHint")}
          </div>
        )}

        <div className="space-y-3">
          {exactPrimary.map((result, idx) => (
            <MarketplaceResultCard
              key={`primary-${result.companyId}-${result.serviceId}-${result.matchedSlotTime}`}
              result={result}
              selected={selectedCompanyId === result.companyId}
              surface="list_card"
              position={idx}
              onMouseEnter={() => onHoverCompany(result.companyId)}
              onMouseLeave={() => onHoverCompany(null)}
              onCardClick={() => {
                onSelectCompany(result.companyId);
                onResultCardClick(result, idx, "list_card");
              }}
              onBookNow={() => onBookNow(result, idx, "list_card")}
              onViewSalon={() => onViewSalon(result, idx, "list_card")}
            />
          ))}
        </div>
      </section>

      {fallbackResults.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bebas text-[33px] leading-none tracking-tight text-black uppercase">{t("marketplaceRedesign.results.fallbackTitle")}</h2>
            <span className="border border-[#f9b6d1] bg-[#fff1f8] px-2.5 py-1 font-bebas text-[17px] leading-none text-[#9b2e64] uppercase">
              {t("marketplaceRedesign.results.fallbackCount", { count: fallbackResults.length })}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {t("marketplaceRedesign.results.fallbackDescription")}
          </p>

          <div className="space-y-3">
            {fallbackResults.map((result, idx) => (
              <MarketplaceResultCard
                key={`fallback-${idx}-${result.companyId}-${result.serviceId}-${result.matchedSlotTime}`}
                result={result}
                compact
                selected={selectedCompanyId === result.companyId}
                surface="fallback_section"
                position={idx}
                onMouseEnter={() => onHoverCompany(result.companyId)}
                onMouseLeave={() => onHoverCompany(null)}
                onCardClick={() => {
                  onSelectCompany(result.companyId);
                  onResultCardClick(result, idx, "fallback_section");
                }}
                onBookNow={() => onBookNow(result, idx, "fallback_section")}
                onViewSalon={() => onViewSalon(result, idx, "fallback_section")}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
