export type MarketplaceMatchType = "exact" | "flexible" | "similar";
export type MarketplaceMatchClassification = "exact_match" | "flexible_match" | "similar_booking";
export type MarketplaceSort = "best_match" | "earliest" | "nearest" | "rating" | "price";
export type MarketplaceSearchMode = "service_now" | "salon_name";

export interface MarketplaceBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MarketplaceResultItem {
  companyId: number;
  slug: string;
  name: string;
  businessType: string | null;
  businessTypeI18n?: Record<string, string> | null;
  zoneOrArea: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailImage: string | null;
  rating: number;
  reviewCount: number;
  serviceId: number;
  serviceName: string;
  globalServiceTypeId: number;
  priceFrom: number;
  matchedSlotTime: string;
  matchedSlotDate: string;
  matchType: MarketplaceMatchType;
  matchClassification?: MarketplaceMatchClassification;
  matchLabel?: string;
  matchDeltaMinutes: number | null;
  whyThisResult: string;
  prefill: {
    source: string;
    companyId: number;
    companySlug: string;
    serviceTypeId: number;
    serviceId: number;
    date: string;
    requestedTime: string | null;
    selectedSlotTime: string;
    staffId: number | null;
    bookingUrlParams?: Record<string, string | number | null>;
  };
  score?: number;
  distanceKm?: number | null;
}

export interface MarketplaceMapPin {
  companyId: number;
  lat: number;
  lng: number;
  title: string;
  slug: string;
  matchType: MarketplaceMatchType;
  isPrimaryMatch: boolean;
  popup?: {
    name: string;
    businessType: string | null;
    businessTypeI18n?: Record<string, string> | null;
    rating: number;
    reviewCount: number;
    serviceName?: string;
    serviceId?: number;
    serviceTypeId?: number;
    matchedSlotDate?: string;
    matchedSlotTime: string;
    priceFrom: number;
    city?: string | null;
  };
}

export interface MarketplaceSearchResponseData {
  querySummary: {
    serviceTypeId: number;
    city: string | null;
    zone: string | null;
    date: string;
    time: string | null;
    hasRequestedTime?: boolean;
    bounds: MarketplaceBounds | null;
    sort: MarketplaceSort;
    page: number;
    limit: number;
    searchMode: MarketplaceSearchMode;
    q: string | null;
    includeSimilar: boolean;
  };
  results: MarketplaceResultItem[];
  similarBookings: MarketplaceResultItem[];
  mapPins: MarketplaceMapPin[];
  mapProvider?: string;
  meta: {
    page: number;
    limit: number;
    totalResults: number;
    totalPages: number;
    counts: {
      exact: number;
      flexible: number;
      similar: number;
    };
    diagnostics?: {
      candidatesFound: number;
      candidatesEvaluated: number;
      evaluationCapHit: boolean;
      processingMs: number;
    };
  };
}

export interface MarketplaceSearchApiResponse {
  code: number;
  error: boolean;
  message: string;
  data: MarketplaceSearchResponseData;
}

export interface MarketplaceServiceTypeOption {
  id: number;
  key?: string;
  name: string;
  slug?: string;
}

export interface MarketplaceFilterState {
  serviceTypeId: number | null;
  cityOrZone: string;
  date: string;
  time: string;
  sort: MarketplaceSort;
  searchMode: MarketplaceSearchMode;
  q: string;
  includeSimilar: boolean;
}
