import { useApi } from "@/app/hooks/useApi";
import { useCallback } from "react";

export type MarketplaceSurface = "list_card" | "map_pin" | "fallback_section" | "filters" | "map";

export type MarketplaceUiEventName =
  | "search_submitted"
  | "filter_changed"
  | "sort_changed"
  | "map_moved"
  | "search_area_clicked"
  | "pin_clicked"
  | "result_card_clicked"
  | "book_now_clicked"
  | "view_salon_clicked"
  | "no_results"
  | "no_exact_matches";
export type MarketplaceTrackedBackendEvent =
  | "marketplace_pin_clicked"
  | "marketplace_result_card_clicked"
  | "marketplace_book_now_clicked"
  | "marketplace_view_salon_clicked";

export function useMarketplaceAnalytics() {
  const api = useApi();

  const trackEvent = useCallback((event: MarketplaceUiEventName, payload: Record<string, unknown>) => {
    // TODO: Replace this with the centralized analytics provider when available.
    if (process.env.NODE_ENV !== "production") {
      console.info("[marketplace:event]", event, payload);
    }
  }, []);

  const trackClickToApi = useCallback(async (payload: {
    eventName?: MarketplaceTrackedBackendEvent;
    companyId: number;
    serviceTypeId?: number | null;
    date?: string;
    time?: string;
    matchType?: "exact" | "flexible" | "similar";
    position?: number;
    source?: string;
    surface?: MarketplaceSurface;
    city?: string;
    zone?: string;
    hasExactMatches?: boolean;
    counts?: {
      exact?: number;
      flexible?: number;
      similar?: number;
    };
    metadata?: Record<string, unknown>;
    q?: string;
  }) => {
    try {
      await api.post("/marketplace/events", {
        event_name: payload.eventName ?? "marketplace_result_card_clicked",
        company_id: payload.companyId,
        service_type_id: payload.serviceTypeId,
        date: payload.date,
        time: payload.time,
        match_type: payload.matchType,
        position: payload.position,
        source: payload.source ?? "marketplace",
        surface: payload.surface,
        city: payload.city,
        zone: payload.zone,
        has_exact_matches: payload.hasExactMatches,
        counts: payload.counts,
        metadata: payload.metadata,
        q: payload.q,
      });
    } catch {
      // Non-blocking analytics failure.
    }
  }, [api]);

  return {
    trackEvent,
    trackClickToApi,
  };
}
