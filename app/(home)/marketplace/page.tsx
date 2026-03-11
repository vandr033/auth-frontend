"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Clock3, List, Map as MapIcon, MapPin, Search } from "lucide-react";

import { useApi } from "@/app/hooks/useApi";
import { MarketplaceMap } from "@/components/marketplace/MarketplaceMap";
import { MarketplaceResultsList } from "@/components/marketplace/MarketplaceResultsList";
import { useT } from "@/lib/i18n";
import { useMarketplaceAnalytics } from "@/lib/marketplace/analytics";
import { buildMarketplaceBookingHandoffParams } from "@/lib/marketplace/handoff";
import type {
  MarketplaceBounds,
  MarketplaceFilterState,
  MarketplaceMapPin,
  MarketplaceResultItem,
  MarketplaceSearchApiResponse,
  MarketplaceSearchMode,
  MarketplaceSort,
  MarketplaceServiceTypeOption,
} from "@/lib/marketplace/types";

function getTodayDateLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().split("T")[0];
}

function parseBounds(boundsRaw: string | null): MarketplaceBounds | null {
  if (!boundsRaw) return null;
  const values = boundsRaw.split(",").map((value) => Number(value.trim()));
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) return null;

  const [minLng, minLat, maxLng, maxLat] = values;
  if (minLng >= maxLng || minLat >= maxLat) return null;

  return { minLng, minLat, maxLng, maxLat };
}

function serializeBounds(bounds: MarketplaceBounds): string {
  return `${bounds.minLng.toFixed(6)},${bounds.minLat.toFixed(6)},${bounds.maxLng.toFixed(6)},${bounds.maxLat.toFixed(6)}`;
}

function boundsAreClose(a: MarketplaceBounds | null, b: MarketplaceBounds | null, epsilon = 0.0004): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.minLng - b.minLng) < epsilon &&
    Math.abs(a.minLat - b.minLat) < epsilon &&
    Math.abs(a.maxLng - b.maxLng) < epsilon &&
    Math.abs(a.maxLat - b.maxLat) < epsilon
  );
}

function normalizeSort(value: string | null): MarketplaceSort {
  if (value === "earliest" || value === "nearest" || value === "rating" || value === "price") {
    return value;
  }
  return "best_match";
}

function normalizeMode(value: string | null): MarketplaceSearchMode {
  return value === "salon_name" ? "salon_name" : "service_now";
}

function normalizeTimeValue(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match24 = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (match12) {
    const rawHour = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    let hours = rawHour % 12;
    if (meridiem === "PM") hours += 12;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return "";
}

function parseFilterState(searchParams: URLSearchParams): {
  filters: MarketplaceFilterState;
  bounds: MarketplaceBounds | null;
  searchInMapArea: boolean;
} {
  const serviceTypeIdRaw = searchParams.get("service_type_id");
  const serviceTypeId = serviceTypeIdRaw ? Number(serviceTypeIdRaw) : null;

  const filters: MarketplaceFilterState = {
    serviceTypeId: Number.isFinite(serviceTypeId) && serviceTypeId && serviceTypeId > 0 ? serviceTypeId : null,
    cityOrZone: searchParams.get("zone") || searchParams.get("city") || "",
    date: searchParams.get("date") || getTodayDateLocal(),
    time: normalizeTimeValue(searchParams.get("time")),
    sort: normalizeSort(searchParams.get("sort")),
    searchMode: normalizeMode(searchParams.get("search_mode")),
    q: searchParams.get("q") || "",
    includeSimilar: searchParams.get("include_similar") !== "false",
  };

  const bounds = parseBounds(searchParams.get("bounds"));
  const searchInMapArea = searchParams.get("map_area") === "1";

  return { filters, bounds, searchInMapArea };
}

function buildSearchParams(
  filters: MarketplaceFilterState,
  bounds: MarketplaceBounds | null,
  searchInMapArea: boolean,
): URLSearchParams {
  const params = new URLSearchParams();
  const normalizedTime = normalizeTimeValue(filters.time);

  if (filters.serviceTypeId) {
    params.set("service_type_id", String(filters.serviceTypeId));
  }

  if (filters.cityOrZone.trim()) {
    params.set("zone", filters.cityOrZone.trim());
  }

  if (filters.date) params.set("date", filters.date);
  if (normalizedTime) params.set("time", normalizedTime);
  if (filters.sort !== "best_match") params.set("sort", filters.sort);
  if (filters.searchMode !== "service_now") params.set("search_mode", filters.searchMode);
  if (filters.searchMode === "salon_name" && filters.q.trim()) {
    params.set("q", filters.q.trim());
  }
  if (!filters.includeSimilar) params.set("include_similar", "false");

  if (searchInMapArea && bounds) {
    params.set("bounds", serializeBounds(bounds));
    params.set("map_area", "1");
  }

  return params;
}

function buildMarketplaceApiQuery(filters: MarketplaceFilterState, bounds: MarketplaceBounds | null): URLSearchParams {
  const params = new URLSearchParams();
  const normalizedTime = normalizeTimeValue(filters.time);

  const hasServiceModeQuery = filters.searchMode === "service_now" && Boolean(filters.serviceTypeId);
  const hasSalonModeQuery = filters.searchMode === "salon_name" && Boolean(filters.q.trim());
  if (!hasServiceModeQuery && !hasSalonModeQuery) return params;

  if (filters.serviceTypeId) params.set("service_type_id", String(filters.serviceTypeId));
  params.set("date", filters.date);
  params.set("sort", filters.sort);
  params.set("search_mode", filters.searchMode);
  params.set("include_similar", String(filters.includeSimilar));

  if (normalizedTime) params.set("time", normalizedTime);
  if (filters.cityOrZone.trim()) params.set("zone", filters.cityOrZone.trim());
  if (filters.searchMode === "salon_name" && filters.q.trim()) params.set("q", filters.q.trim());
  if (bounds) params.set("bounds", serializeBounds(bounds));

  return params;
}

function withRequiredServiceTypeId(
  filters: MarketplaceFilterState,
  serviceTypes: MarketplaceServiceTypeOption[],
): MarketplaceFilterState {
  if (filters.serviceTypeId) return filters;
  const fallbackServiceTypeId = serviceTypes[0]?.id ?? null;
  if (!fallbackServiceTypeId) return filters;
  return { ...filters, serviceTypeId: fallbackServiceTypeId };
}

interface CitySuggestionResponse {
  city: string;
}

export default function MarketplacePage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();
  const { trackEvent, trackClickToApi } = useMarketplaceAnalytics();

  const [serviceTypes, setServiceTypes] = useState<MarketplaceServiceTypeOption[]>([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(false);
  const [serviceInput, setServiceInput] = useState("");

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false);

  const searchParamsString = searchParams?.toString() || "";
  const initialParsed = useMemo(
    () => parseFilterState(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );

  const [draftFilters, setDraftFilters] = useState<MarketplaceFilterState>(initialParsed.filters);
  const [searchInMapArea, setSearchInMapArea] = useState<boolean>(initialParsed.searchInMapArea);
  const [appliedBounds, setAppliedBounds] = useState<MarketplaceBounds | null>(initialParsed.bounds);
  const [draftMapBounds, setDraftMapBounds] = useState<MarketplaceBounds | null>(initialParsed.bounds);
  const [searchAreaPending, setSearchAreaPending] = useState(false);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketplaceResultItem[]>([]);
  const [similarBookings, setSimilarBookings] = useState<MarketplaceResultItem[]>([]);
  const [mapPins, setMapPins] = useState<MarketplaceMapPin[]>([]);
  const [meta, setMeta] = useState<MarketplaceSearchApiResponse["data"]["meta"] | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [hoveredCompanyId, setHoveredCompanyId] = useState<number | null>(null);
  const [mapFitKey, setMapFitKey] = useState(0);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const runSearch = useCallback(
    async (filters: MarketplaceFilterState, bounds: MarketplaceBounds | null) => {
      const normalizedFilters = withRequiredServiceTypeId(filters, serviceTypes);
      const hasServiceModeQuery = normalizedFilters.searchMode === "service_now" && Boolean(normalizedFilters.serviceTypeId);
      const hasSalonModeQuery =
        normalizedFilters.searchMode === "salon_name" &&
        Boolean(normalizedFilters.q.trim()) &&
        Boolean(normalizedFilters.serviceTypeId);
      if (!filters.date || (!hasServiceModeQuery && !hasSalonModeQuery)) return;

      setLoadingSearch(true);
      setSearchError(null);

      try {
        const apiQuery = buildMarketplaceApiQuery(normalizedFilters, bounds);
        const response = await api.get<MarketplaceSearchApiResponse>(`/marketplace/search?${apiQuery.toString()}`);

        const nextResults = response.data?.results || [];
        const nextSimilar = response.data?.similarBookings || [];
        const nextPins = (response.data?.mapPins || []) as MarketplaceMapPin[];
        const allItems = [...nextResults, ...nextSimilar];
        const firstByCompanyId = new Map<number, MarketplaceResultItem>();
        allItems.forEach((item) => {
          if (!firstByCompanyId.has(item.companyId)) {
            firstByCompanyId.set(item.companyId, item);
          }
        });

        const mergedPins = nextPins.length
          ? nextPins.map((pin) => {
              const matched = firstByCompanyId.get(pin.companyId);
              return {
                ...pin,
                popup: {
                  ...(pin.popup || {
                    name: pin.title,
                    businessType: null,
                    rating: 0,
                    reviewCount: 0,
                    matchedSlotTime: "",
                    priceFrom: 0,
                  }),
                  serviceName: pin.popup?.serviceName ?? matched?.serviceName,
                  serviceId: pin.popup?.serviceId ?? matched?.serviceId,
                  serviceTypeId: pin.popup?.serviceTypeId ?? matched?.globalServiceTypeId,
                  matchedSlotDate: pin.popup?.matchedSlotDate ?? matched?.matchedSlotDate,
                  matchedSlotTime: pin.popup?.matchedSlotTime ?? matched?.matchedSlotTime ?? "",
                  priceFrom: pin.popup?.priceFrom ?? matched?.priceFrom ?? 0,
                  city: pin.popup?.city ?? matched?.city ?? null,
                },
              };
            })
          : allItems
              .filter((item) => item.latitude != null && item.longitude != null)
              .map((item) => ({
                companyId: item.companyId,
                lat: Number(item.latitude),
                lng: Number(item.longitude),
                title: item.name,
                slug: item.slug,
                matchType: item.matchType,
                isPrimaryMatch: item.matchType !== "similar",
                popup: {
                  name: item.name,
                  businessType: item.businessType,
                  rating: item.rating,
                  reviewCount: item.reviewCount,
                  serviceName: item.serviceName,
                  serviceId: item.serviceId,
                  serviceTypeId: item.globalServiceTypeId,
                  matchedSlotDate: item.matchedSlotDate,
                  matchedSlotTime: item.matchedSlotTime,
                  priceFrom: item.priceFrom,
                  city: item.city,
                },
              }));

        setResults(nextResults);
        setSimilarBookings(nextSimilar);
        setMapPins(mergedPins);
        setMeta(response.data?.meta || null);
        setMapFitKey((prev) => prev + 1);

        if (nextResults.length > 0) {
          setSelectedCompanyId(nextResults[0].companyId);
        } else if (nextSimilar.length > 0) {
          setSelectedCompanyId(nextSimilar[0].companyId);
        } else {
          setSelectedCompanyId(null);
        }

        if (nextResults.length === 0 && nextSimilar.length === 0) {
          trackEvent("no_results", {
            source: "marketplace",
            filters: normalizedFilters,
          });
        }

        if (normalizedFilters.time && nextResults.every((item) => item.matchType !== "exact")) {
          trackEvent("no_exact_matches", {
            source: "marketplace",
            filters: normalizedFilters,
            similarCount: nextSimilar.length,
          });
        }
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : t("marketplaceRedesign.errors.searchFailed"));
        setResults([]);
        setSimilarBookings([]);
        setMapPins([]);
      } finally {
        setLoadingSearch(false);
      }
    },
    [api, serviceTypes, t, trackEvent],
  );

  useEffect(() => {
    const parsed = parseFilterState(new URLSearchParams(searchParamsString));
    setDraftFilters(parsed.filters);
    setSearchInMapArea(parsed.searchInMapArea);
    setAppliedBounds(parsed.bounds);
    setDraftMapBounds(parsed.bounds);
    setSearchAreaPending(false);

    if (parsed.filters.searchMode === "service_now") {
      setServiceInput("");
    }

    const normalizedFilters = withRequiredServiceTypeId(parsed.filters, serviceTypes);
    const hasServiceModeQuery = normalizedFilters.searchMode === "service_now" && Boolean(normalizedFilters.serviceTypeId);
    const hasSalonModeQuery =
      normalizedFilters.searchMode === "salon_name" &&
      Boolean(normalizedFilters.q.trim()) &&
      Boolean(normalizedFilters.serviceTypeId);
    if (normalizedFilters.date && (hasServiceModeQuery || hasSalonModeQuery)) {
      void runSearch(normalizedFilters, parsed.bounds);
    } else {
      setResults([]);
      setSimilarBookings([]);
      setMapPins([]);
      setMeta(null);
      setSelectedCompanyId(null);
      setSearchError(null);
    }
  }, [runSearch, searchParamsString, serviceTypes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingServiceTypes(true);

    void api
      .get<{ error: boolean; data: Array<{ id: number; name: string; key?: string; slug?: string }> }>("/home/service-types?query=")
      .then((response) => {
        if (cancelled) return;
        const types = Array.isArray(response.data)
          ? response.data.map((item) => ({
              id: Number(item.id),
              name: item.name,
              key: item.key,
              slug: item.slug,
            }))
          : [];
        setServiceTypes(types);
      })
      .catch(() => {
        if (cancelled) return;
        setServiceTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServiceTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!draftFilters.serviceTypeId || serviceInput.trim()) return;
    const matched = serviceTypes.find((service) => service.id === draftFilters.serviceTypeId);
    if (matched) setServiceInput(matched.name);
  }, [draftFilters.serviceTypeId, serviceInput, serviceTypes]);

  useEffect(() => {
    if (draftFilters.searchMode !== "service_now") return;
    const query = serviceInput.trim().toLowerCase();
    const exact = serviceTypes.find((service) => service.name.trim().toLowerCase() === query);
    if (exact) {
      if (draftFilters.serviceTypeId !== exact.id) {
        setDraftFilters((prev) => ({ ...prev, serviceTypeId: exact.id }));
      }
    } else if (draftFilters.serviceTypeId !== null) {
      setDraftFilters((prev) => ({ ...prev, serviceTypeId: null }));
    }
  }, [draftFilters.searchMode, draftFilters.serviceTypeId, serviceInput, serviceTypes]);

  useEffect(() => {
    const query = draftFilters.cityOrZone.trim();
    if (query.length < 2) {
      setCitySuggestions([]);
      setLoadingCitySuggestions(false);
      return;
    }

    let cancelled = false;
    setLoadingCitySuggestions(true);

    const timeout = window.setTimeout(() => {
      void api
        .get<{ error: boolean; data: CitySuggestionResponse[] }>(`/home/cities?query=${encodeURIComponent(query)}`)
        .then((response) => {
          if (cancelled) return;
          const suggestions = Array.isArray(response.data)
            ? [...new Set(response.data.map((item) => item.city).filter(Boolean))]
            : [];
          setCitySuggestions(suggestions);
        })
        .catch(() => {
          if (cancelled) return;
          setCitySuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingCitySuggestions(false);
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [api, draftFilters.cityOrZone]);

  const allRenderedResults = useMemo(() => [...results, ...similarBookings], [results, similarBookings]);

  const pushSearchToUrl = useCallback(
    (nextFilters: MarketplaceFilterState, nextBounds: MarketplaceBounds | null, useMapArea: boolean) => {
      const nextSearchParams = buildSearchParams(nextFilters, nextBounds, useMapArea);
      const currentSearch = new URLSearchParams(searchParamsString).toString();
      const nextSearch = nextSearchParams.toString();
      if (currentSearch === nextSearch) {
        return false;
      }
      const path = nextSearchParams.toString() ? `/marketplace?${nextSearchParams.toString()}` : "/marketplace";
      router.push(path, { scroll: false });
      return true;
    },
    [router, searchParamsString],
  );

  const handleSearchSubmit = useCallback(() => {
    const normalizedFilters = {
      ...withRequiredServiceTypeId(draftFilters, serviceTypes),
      time: normalizeTimeValue(draftFilters.time),
    };
    const hasServiceModeQuery = normalizedFilters.searchMode === "service_now" && Boolean(normalizedFilters.serviceTypeId);
    const hasSalonModeQuery =
      normalizedFilters.searchMode === "salon_name" &&
      Boolean(normalizedFilters.q.trim()) &&
      Boolean(normalizedFilters.serviceTypeId);

    if (!hasServiceModeQuery && !hasSalonModeQuery) {
      setSearchError(
        normalizedFilters.searchMode === "service_now"
          ? t("marketplaceRedesign.errors.serviceRequired")
          : normalizedFilters.q.trim()
            ? t("marketplaceRedesign.errors.serviceRequired")
            : t("marketplaceRedesign.errors.salonRequired"),
      );
      return;
    }

    if (!normalizedFilters.date) {
      setSearchError(t("marketplaceRedesign.errors.dateRequired"));
      return;
    }

    const nextBounds = searchInMapArea ? draftMapBounds || appliedBounds : null;
    setAppliedBounds(nextBounds || null);
    setSearchAreaPending(false);
    setSearchError(null);

    trackEvent("search_submitted", {
      source: "marketplace",
      filters: normalizedFilters,
      bounds: nextBounds,
    });

    if (normalizedFilters.serviceTypeId !== draftFilters.serviceTypeId) {
      setDraftFilters(normalizedFilters);
    }
    const didNavigate = pushSearchToUrl(normalizedFilters, nextBounds || null, searchInMapArea);
    if (!didNavigate) {
      void runSearch(normalizedFilters, nextBounds || null);
    }
  }, [
    appliedBounds,
    draftFilters,
    draftMapBounds,
    pushSearchToUrl,
    runSearch,
    searchInMapArea,
    serviceTypes,
    t,
    trackEvent,
  ]);

  const handleSearchAreaClick = useCallback(() => {
    if (!draftMapBounds) return;

    trackEvent("search_area_clicked", {
      source: "marketplace",
      bounds: draftMapBounds,
    });

    setAppliedBounds(draftMapBounds);
    setSearchAreaPending(false);
    const didNavigate = pushSearchToUrl(draftFilters, draftMapBounds, true);
    if (!didNavigate) {
      void runSearch(draftFilters, draftMapBounds);
    }
  }, [draftFilters, draftMapBounds, pushSearchToUrl, runSearch, trackEvent]);

  const handleSearchInAreaChange = useCallback(
    (checked: boolean) => {
      setSearchInMapArea(checked);
      if (!checked) {
        setSearchAreaPending(false);
      } else if (draftMapBounds && !boundsAreClose(draftMapBounds, appliedBounds)) {
        setSearchAreaPending(true);
      }
    },
    [appliedBounds, draftMapBounds],
  );

  const handleMapMoved = useCallback(
    (bounds: MarketplaceBounds) => {
      setDraftMapBounds(bounds);

      if (searchInMapArea && !boundsAreClose(bounds, appliedBounds)) {
        setSearchAreaPending(true);
      } else {
        setSearchAreaPending(false);
      }
    },
    [appliedBounds, searchInMapArea],
  );

  const selectCompany = useCallback((companyId: number) => {
    setSelectedCompanyId(companyId);
    const card = document.getElementById(`market-result-${companyId}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const trackClick = useCallback(
    async (
      eventName: "pin_clicked" | "result_card_clicked" | "book_now_clicked" | "view_salon_clicked",
      result: MarketplaceResultItem,
      position: number,
      surface: "list_card" | "map_pin" | "fallback_section",
    ) => {
      trackEvent(eventName, {
        source: "marketplace",
        surface,
        companyId: result.companyId,
        slug: result.slug,
        matchType: result.matchType,
        serviceId: result.serviceId,
        position,
      });

      const backendEventName =
        eventName === "pin_clicked"
          ? "marketplace_pin_clicked"
          : eventName === "result_card_clicked"
            ? "marketplace_result_card_clicked"
            : eventName === "book_now_clicked"
              ? "marketplace_book_now_clicked"
              : "marketplace_view_salon_clicked";

      await trackClickToApi({
        eventName: backendEventName,
        companyId: result.companyId,
        serviceTypeId: draftFilters.serviceTypeId || result.globalServiceTypeId,
        date: result.matchedSlotDate,
        time: result.matchedSlotTime,
        matchType: result.matchType,
        position,
        source: "marketplace",
        surface,
        city: draftFilters.cityOrZone || result.city || undefined,
        zone: result.zoneOrArea || draftFilters.cityOrZone || undefined,
        hasExactMatches: meta ? meta.counts.exact > 0 : undefined,
        counts: meta?.counts,
        metadata: {
          slug: result.slug,
          searchMode: draftFilters.searchMode,
          sort: draftFilters.sort,
        },
        q: draftFilters.searchMode === "salon_name" ? draftFilters.q : undefined,
      });
    },
    [draftFilters.cityOrZone, draftFilters.q, draftFilters.searchMode, draftFilters.serviceTypeId, draftFilters.sort, meta, trackClickToApi, trackEvent],
  );

  const handlePinClick = useCallback(
    (companyId: number) => {
      selectCompany(companyId);
      const result = allRenderedResults.find((item) => item.companyId === companyId);
      if (!result) return;
      const position = allRenderedResults.findIndex((item) => item.companyId === companyId);
      void trackClick("pin_clicked", result, Math.max(0, position), "map_pin");
    },
    [allRenderedResults, selectCompany, trackClick],
  );

  const handleBookNow = useCallback(
    (result: MarketplaceResultItem, position: number, surface: "list_card" | "fallback_section") => {
      const selectedSlotTime = result.prefill.selectedSlotTime || result.matchedSlotTime;
      const selectedDate = result.prefill.date || result.matchedSlotDate;
      const bookingParams = buildMarketplaceBookingHandoffParams({
        serviceId: result.serviceId,
        serviceTypeId: result.globalServiceTypeId || draftFilters.serviceTypeId || null,
        companyId: result.companyId,
        date: selectedDate,
        requestedTime: result.prefill.requestedTime,
        matchedSlotTime: selectedSlotTime,
        staffId: result.prefill.staffId,
        surface,
        extraParams: result.prefill.bookingUrlParams,
      });

      void trackClick("book_now_clicked", result, position, surface);
      router.push(`/shop/${result.slug}/book?${bookingParams.toString()}`);
    },
    [draftFilters.serviceTypeId, router, trackClick],
  );

  const handleViewSalon = useCallback(
    (result: MarketplaceResultItem, position: number, surface: "list_card" | "fallback_section") => {
      const salonParams = new URLSearchParams();
      salonParams.set("source", "marketplace");
      salonParams.set("surface", surface);
      salonParams.set("serviceId", String(result.serviceId));
      salonParams.set("date", result.matchedSlotDate);
      if (draftFilters.time) salonParams.set("time", draftFilters.time);

      void trackClick("view_salon_clicked", result, position, surface);
      router.push(`/shop/${result.slug}?${salonParams.toString()}`);
    },
    [draftFilters.time, router, trackClick],
  );

  const handleClear = useCallback(() => {
    const cleared: MarketplaceFilterState = {
      serviceTypeId: null,
      cityOrZone: "",
      date: getTodayDateLocal(),
      time: "",
      sort: "best_match",
      searchMode: draftFilters.searchMode,
      q: "",
      includeSimilar: true,
    };

    setDraftFilters(cleared);
    setServiceInput("");
    setSearchInMapArea(false);
    setSearchError(null);
    setSearchAreaPending(false);
    pushSearchToUrl(cleared, null, false);
  }, [draftFilters.searchMode, pushSearchToUrl]);

  const handleSortChange = useCallback(
    (nextSort: MarketplaceSort) => {
      const nextFilters = { ...draftFilters, sort: nextSort };
      setDraftFilters(nextFilters);
      trackEvent("sort_changed", {
        source: "marketplace",
        sort: nextSort,
      });
      pushSearchToUrl(nextFilters, searchInMapArea ? appliedBounds : null, searchInMapArea);
    },
    [appliedBounds, draftFilters, pushSearchToUrl, searchInMapArea, trackEvent],
  );

  const mapOrListArea =
    viewMode === "map" ? (
      <div className="relative h-[430px] border border-black/12 bg-[#e6e6e6] sm:h-[540px] lg:h-[560px]">
        <MarketplaceMap
          pins={mapPins}
          selectedCompanyId={selectedCompanyId}
          hoveredCompanyId={hoveredCompanyId}
          loading={loadingSearch}
          searchInMapArea={searchInMapArea}
          searchAreaPending={searchAreaPending}
          appliedBounds={appliedBounds}
          fitKey={mapFitKey}
          onPinClick={handlePinClick}
          onMapMoved={handleMapMoved}
          onSearchAreaClick={handleSearchAreaClick}
          className="h-full min-h-0 rounded-none border-0 bg-transparent"
          showSearchAreaAction={false}
        />

        <div className="pointer-events-none absolute left-4 top-4 w-[142px] border border-black/40 bg-white/94 p-3 text-[9px] leading-tight tracking-[0.04em] uppercase sm:left-5 sm:top-5">
          <p className="font-bold text-black">{t("marketplaceRedesign.map.noteTitle")}</p>
          <p className="mt-1 font-medium text-black/75">{t("marketplaceRedesign.map.noteDescription")}</p>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col border border-black/40 bg-white/95">
          <button type="button" className="pointer-events-auto flex h-7 w-7 items-center justify-center text-base leading-none text-black transition-colors hover:bg-black hover:text-white" aria-label={t("marketplaceRedesign.map.zoomIn")}>+
          </button>
          <button type="button" className="pointer-events-auto flex h-7 w-7 items-center justify-center border-t border-black/20 text-base leading-none text-black transition-colors hover:bg-black hover:text-white" aria-label={t("marketplaceRedesign.map.zoomOut")}>
            -
          </button>
        </div>
      </div>
    ) : (
      <div className="border border-black/12 bg-white p-4 sm:p-5">
        <MarketplaceResultsList
          loading={loadingSearch}
          error={searchError}
          requestedTime={draftFilters.time}
          results={results}
          similarBookings={similarBookings}
          selectedCompanyId={selectedCompanyId}
          onHoverCompany={setHoveredCompanyId}
          onSelectCompany={setSelectedCompanyId}
          onResultCardClick={(result, position, surface) => {
            setSelectedCompanyId(result.companyId);
            void trackClick("result_card_clicked", result, position, surface);
          }}
          onBookNow={handleBookNow}
          onViewSalon={handleViewSalon}
        />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#ececec] pb-0 pt-20">
      <main className="mx-auto w-full max-w-[1260px] px-4 pb-14 sm:px-6 lg:px-8">
        <section className="pt-6 sm:pt-7">
          <p className="inline-block bg-biz-yellow px-2.5 py-1 font-bebas text-[11px] leading-none tracking-[0.16em] text-black uppercase">
            {t("marketplaceRedesign.eyebrow")}
          </p>

          <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h1 className="font-business-display text-[clamp(2.9rem,8vw,5.9rem)] leading-[0.82] font-black tracking-[-0.03em] text-black uppercase">
              <span className="block">{t("marketplaceRedesign.hero.line1")}</span>
              <span className="block">
                <span className="text-biz-barbie-pink">{t("marketplaceRedesign.hero.line2Pink")}</span>{" "}
                <span>{t("marketplaceRedesign.hero.line2Black")}</span>
              </span>
            </h1>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-10 min-w-[74px] items-center justify-center gap-1.5 border px-3 font-bebas text-[12px] leading-none tracking-[0.1em] uppercase transition-colors ${
                  viewMode === "list" ? "border-black bg-white text-black" : "border-black/25 bg-transparent text-black/60"
                }`}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-3.5 w-3.5" />
                {t("marketplaceRedesign.views.list")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`inline-flex h-10 min-w-[74px] items-center justify-center gap-1.5 border px-3 font-bebas text-[12px] leading-none tracking-[0.1em] uppercase transition-colors ${
                  viewMode === "map" ? "border-black bg-black text-white" : "border-black/25 bg-transparent text-black/60"
                }`}
                aria-pressed={viewMode === "map"}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {t("marketplaceRedesign.views.map")}
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-3 border-y border-black/10 py-3 text-[11px] leading-none font-semibold tracking-[0.08em] text-black/55 uppercase md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-black">{t("marketplaceRedesign.summary.results", { count: meta?.totalResults ?? results.length })}</span>
              <span className="hidden text-black/30 md:inline">•</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#66c075]" aria-hidden />
                {t("marketplaceRedesign.summary.exact", { count: meta?.counts.exact ?? 0 })}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4d6aff]" aria-hidden />
                {t("marketplaceRedesign.summary.similar", { count: meta?.counts.similar ?? 0 })}
              </span>
            </div>

            <label className="inline-flex items-center gap-2 text-[10px] tracking-[0.12em] text-black/50 uppercase">
              {t("marketplaceRedesign.summary.sortBy")}
              <span className="relative inline-flex">
                <select
                  aria-label={t("marketplaceRedesign.summary.sortBy")}
                  value={draftFilters.sort}
                  onChange={(event) => handleSortChange(event.target.value as MarketplaceSort)}
                  className="h-8 appearance-none border border-black/15 bg-transparent pl-3 pr-7 font-bebas text-[13px] tracking-[0.06em] text-black uppercase outline-none"
                >
                  <option value="best_match">{t("marketplaceRedesign.sort.bestMatch")}</option>
                  <option value="earliest">{t("marketplaceRedesign.sort.earliest")}</option>
                  <option value="nearest">{t("marketplaceRedesign.sort.nearest")}</option>
                  <option value="rating">{t("marketplaceRedesign.sort.rating")}</option>
                  <option value="price">{t("marketplaceRedesign.sort.price")}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/60" />
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[292px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="border border-black bg-white p-4 shadow-[4px_4px_0_#000]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bebas text-[26px] leading-none font-semibold tracking-tight text-black uppercase">
                    {t("marketplaceRedesign.filters.title")}
                  </h2>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[10px] leading-none font-semibold tracking-[0.12em] text-black/45 uppercase transition-colors hover:text-black"
                  >
                    {t("marketplaceRedesign.filters.clear")}
                  </button>
                </div>

                <div className="grid grid-cols-2 border border-black/12 bg-[#efefef] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFilters((prev) => ({ ...prev, searchMode: "service_now", q: "" }));
                      setSearchError(null);
                    }}
                    className={`h-8 font-bebas text-[11px] leading-none tracking-[0.08em] uppercase transition-colors ${
                      draftFilters.searchMode === "service_now" ? "bg-white text-black" : "text-black/45"
                    }`}
                  >
                    {t("marketplaceRedesign.filters.modeService")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFilters((prev) => ({
                        ...prev,
                        searchMode: "salon_name",
                        serviceTypeId: prev.serviceTypeId ?? serviceTypes[0]?.id ?? null,
                      }));
                      setServiceInput("");
                      setSearchError(null);
                    }}
                    className={`h-8 font-bebas text-[11px] leading-none tracking-[0.08em] uppercase transition-colors ${
                      draftFilters.searchMode === "salon_name" ? "bg-white text-black" : "text-black/45"
                    }`}
                  >
                    {t("marketplaceRedesign.filters.modeSalon")}
                  </button>
                </div>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-[10px] leading-none font-semibold tracking-[0.12em] text-black/60 uppercase">
                      {draftFilters.searchMode === "service_now"
                        ? t("marketplaceRedesign.filters.serviceLabel")
                        : t("marketplaceRedesign.filters.salonLabel")}
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                      <input
                        value={draftFilters.searchMode === "service_now" ? serviceInput : draftFilters.q}
                        onChange={(event) => {
                          if (draftFilters.searchMode === "service_now") {
                            setServiceInput(event.target.value);
                          } else {
                            setDraftFilters((prev) => ({ ...prev, q: event.target.value }));
                          }
                          setSearchError(null);
                        }}
                        list={draftFilters.searchMode === "service_now" ? "marketplace-service-type-suggestions" : undefined}
                        placeholder={
                          draftFilters.searchMode === "service_now"
                            ? t("marketplaceRedesign.filters.servicePlaceholder")
                            : t("marketplaceRedesign.filters.salonPlaceholder")
                        }
                        className="h-10 w-full border border-black/10 bg-transparent pl-8 pr-3 font-bebas text-[13px] tracking-[0.03em] text-black uppercase outline-none placeholder:text-black/30"
                      />
                      {loadingServiceTypes && draftFilters.searchMode === "service_now" ? (
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold tracking-[0.08em] text-black/35 uppercase">
                          {t("common.loading")}
                        </span>
                      ) : null}
                    </div>
                    <datalist id="marketplace-service-type-suggestions">
                      {serviceTypes.map((serviceType) => (
                        <option key={serviceType.id} value={serviceType.name} />
                      ))}
                    </datalist>
                  </div>

                  {draftFilters.searchMode === "salon_name" ? (
                    <div>
                      <label className="mb-1.5 block text-[10px] leading-none font-semibold tracking-[0.12em] text-black/60 uppercase">
                        {t("marketplaceRedesign.filters.serviceLabel")}
                      </label>
                      <span className="relative block">
                        <select
                          value={draftFilters.serviceTypeId ? String(draftFilters.serviceTypeId) : ""}
                          onChange={(event) => {
                            const nextId = Number(event.target.value);
                            setDraftFilters((prev) => ({
                              ...prev,
                              serviceTypeId: Number.isFinite(nextId) && nextId > 0 ? nextId : null,
                            }));
                            setSearchError(null);
                          }}
                          className="h-10 w-full appearance-none border border-black/10 bg-transparent pl-3 pr-8 font-bebas text-[13px] tracking-[0.03em] text-black uppercase outline-none"
                        >
                          <option value="">{t("marketplaceRedesign.filters.serviceSelectPlaceholder")}</option>
                          {serviceTypes.map((serviceType) => (
                            <option key={serviceType.id} value={String(serviceType.id)}>
                              {serviceType.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/45" />
                      </span>
                      {loadingServiceTypes ? (
                        <p className="mt-1 text-[10px] leading-none font-semibold tracking-[0.1em] text-black/35 uppercase">
                          {t("common.loading")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-[10px] leading-none font-semibold tracking-[0.12em] text-black/60 uppercase">
                      {t("marketplaceRedesign.filters.cityLabel")}
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                      <input
                        value={draftFilters.cityOrZone}
                        onChange={(event) => {
                          setDraftFilters((prev) => ({ ...prev, cityOrZone: event.target.value }));
                          setSearchError(null);
                        }}
                        list="marketplace-city-zone-suggestions"
                        placeholder={t("marketplaceRedesign.filters.cityPlaceholder")}
                        className="h-10 w-full border border-black/10 bg-transparent pl-8 pr-3 font-bebas text-[13px] tracking-[0.03em] text-black uppercase outline-none placeholder:text-black/30"
                      />
                    </div>
                    <datalist id="marketplace-city-zone-suggestions">
                      {citySuggestions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                    {loadingCitySuggestions ? (
                      <p className="mt-1 text-[10px] leading-none font-semibold tracking-[0.1em] text-black/35 uppercase">{t("marketplaceRedesign.filters.loadingCities")}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] leading-none font-semibold tracking-[0.12em] text-black/60 uppercase">
                        {t("marketplaceRedesign.filters.dateLabel")}
                      </label>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                        <input
                          type="date"
                          value={draftFilters.date}
                          onChange={(event) => setDraftFilters((prev) => ({ ...prev, date: event.target.value }))}
                          className="h-10 w-full border border-black/10 bg-transparent pl-8 pr-2 font-bebas text-[13px] tracking-[0.02em] text-black uppercase outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[10px] leading-none font-semibold tracking-[0.12em] text-black/60 uppercase">
                        {t("marketplaceRedesign.filters.timeLabel")}
                      </label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="12:00 PM"
                          value={draftFilters.time}
                          onChange={(event) => setDraftFilters((prev) => ({ ...prev, time: event.target.value }))}
                          onBlur={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              time: normalizeTimeValue(prev.time),
                            }))
                          }
                          className="h-10 w-full border border-black/10 bg-transparent pl-8 pr-2 font-bebas text-[13px] tracking-[0.02em] text-black uppercase outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {viewMode === "map" ? (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black uppercase">
                        {t("marketplaceRedesign.filters.searchInMap")}
                      </span>
                      <button
                        type="button"
                        aria-pressed={searchInMapArea}
                        onClick={() => handleSearchInAreaChange(!searchInMapArea)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                          searchInMapArea ? "border-black bg-black" : "border-black/20 bg-black/8"
                        }`}
                      >
                        <span
                          className={`h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            searchInMapArea ? "translate-x-[18px]" : "translate-x-[2px]"
                          }`}
                        />
                      </button>
                    </div>
                  ) : null}

                  {searchError ? (
                    <p className="text-[11px] leading-snug font-semibold tracking-[0.04em] text-[#d32e78] uppercase">{searchError}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    disabled={loadingSearch}
                    className="inline-flex h-11 w-full items-center justify-center bg-biz-barbie-pink px-4 font-bebas text-[13px] tracking-[0.14em] text-white uppercase transition-colors hover:bg-[#d5307a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingSearch ? t("marketplaceRedesign.filters.searching") : t("marketplaceRedesign.filters.apply")}
                  </button>
                </div>
              </section>

              <section className="relative overflow-hidden bg-biz-sky-surge p-4 text-white">
                <h3 className="font-business-display text-[clamp(1.15rem,2.2vw,1.7rem)] leading-[0.86] font-black tracking-[-0.02em] uppercase">
                  {t("marketplaceRedesign.promo.title")}
                </h3>
                <p className="mt-2 max-w-[210px] text-[11px] leading-snug font-semibold tracking-[0.08em] uppercase text-white/88">
                  {t("marketplaceRedesign.promo.description")}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex h-8 items-center justify-center border border-black/18 bg-white px-3 font-bebas text-[11px] tracking-[0.1em] text-black uppercase transition-colors hover:bg-black hover:text-white"
                >
                  {t("marketplaceRedesign.promo.cta")}
                </button>
                <div className="pointer-events-none absolute -bottom-7 -right-7 h-24 w-24 rounded-full border border-white/20" aria-hidden />
              </section>
            </aside>

            <section>{mapOrListArea}</section>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="text-[20px] leading-none font-black tracking-[-0.02em] text-black">PRICONPRI.</p>

          <nav aria-label={t("marketplaceRedesign.footer.linksLabel")} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#" className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black/55 uppercase transition-colors hover:text-black">
              {t("marketplaceRedesign.footer.privacy")}
            </a>
            <a href="#" className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black/55 uppercase transition-colors hover:text-black">
              {t("marketplaceRedesign.footer.terms")}
            </a>
            <a href="#" className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black/55 uppercase transition-colors hover:text-black">
              {t("marketplaceRedesign.footer.contact")}
            </a>
            <a href="#" className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black/55 uppercase transition-colors hover:text-black">
              {t("marketplaceRedesign.footer.help")}
            </a>
          </nav>

          <p className="text-[10px] leading-none font-semibold tracking-[0.1em] text-black/40 uppercase">
            {t("marketplaceRedesign.footer.legal")}
          </p>
        </div>
      </footer>
    </div>
  );
}
