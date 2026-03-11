"use client";

import { Calendar, Clock3, Loader2, LocateFixed, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarketplaceFilterState, MarketplaceServiceTypeOption, MarketplaceSort } from "@/lib/marketplace/types";

interface MarketplaceFiltersProps {
  value: MarketplaceFilterState;
  serviceTypes: MarketplaceServiceTypeOption[];
  loadingServiceTypes: boolean;
  citySuggestions: string[];
  loadingCitySuggestions: boolean;
  searchInMapArea: boolean;
  mapAreaPending: boolean;
  loading: boolean;
  error: string | null;
  onChange: (next: Partial<MarketplaceFilterState>) => void;
  onSearchSubmit: () => void;
  onSearchInAreaChange: (checked: boolean) => void;
  onSearchAreaClick: () => void;
}

const SORT_OPTIONS: Array<{ value: MarketplaceSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "earliest", label: "Earliest" },
  { value: "nearest", label: "Nearest" },
  { value: "rating", label: "Rating" },
  { value: "price", label: "Price" },
];

export function MarketplaceFilters({
  value,
  serviceTypes,
  loadingServiceTypes,
  citySuggestions,
  loadingCitySuggestions,
  searchInMapArea,
  mapAreaPending,
  loading,
  error,
  onChange,
  onSearchSubmit,
  onSearchInAreaChange,
  onSearchAreaClick,
}: MarketplaceFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Find your next appointment</h2>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search mode</Label>
          <Tabs
            value={value.searchMode}
            onValueChange={(next) => onChange({ searchMode: next as "service_now" | "salon_name" })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="service_now" className="flex-1">Service now</TabsTrigger>
              <TabsTrigger value="salon_name" className="flex-1">Salon name</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {value.searchMode === "salon_name" && (
          <div className="space-y-2">
            <Label htmlFor="salon-search">Salon name</Label>
            <Input
              id="salon-search"
              value={value.q}
              onChange={(event) => onChange({ q: event.target.value })}
              placeholder="Search by salon or brand"
            />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="service-type">Service type</Label>
            <Select
              value={value.serviceTypeId ? String(value.serviceTypeId) : undefined}
              onValueChange={(next) => {
                const serviceTypeId = Number(next);
                onChange({ serviceTypeId: Number.isFinite(serviceTypeId) && serviceTypeId > 0 ? serviceTypeId : null });
              }}
            >
              <SelectTrigger id="service-type" className="w-full">
                <SelectValue placeholder={loadingServiceTypes ? "Loading..." : "Select a service type"} />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((serviceType) => (
                  <SelectItem key={serviceType.id} value={String(serviceType.id)}>
                    {serviceType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-by">Sort by</Label>
            <Select value={value.sort} onValueChange={(next) => onChange({ sort: next as MarketplaceSort })}>
              <SelectTrigger id="sort-by" className="w-full">
                <SelectValue placeholder="Sort results" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city-zone">City / Zone</Label>
          <Input
            id="city-zone"
            value={value.cityOrZone}
            onChange={(event) => onChange({ cityOrZone: event.target.value })}
            placeholder="Santa Cruz, Equipetrol, downtown..."
            list="marketplace-city-zone-suggestions"
          />
          <datalist id="marketplace-city-zone-suggestions">
            {citySuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {loadingCitySuggestions && (
            <p className="text-xs text-slate-500">Looking up cities...</p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search-date">Date</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-date"
                type="date"
                value={value.date}
                onChange={(event) => onChange({ date: event.target.value })}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-time">Time (optional)</Label>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-time"
                type="time"
                value={value.time}
                onChange={(event) => onChange({ time: event.target.value })}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Search in this map area</p>
              <p className="text-xs text-slate-500">Only run when you click search; map movement alone does not re-query.</p>
            </div>
            <Switch checked={searchInMapArea} onCheckedChange={onSearchInAreaChange} />
          </div>

          {searchInMapArea && mapAreaPending && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={onSearchAreaClick}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Search this area
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button
          type="button"
          className="w-full bg-brand text-white hover:bg-brand-hover"
          onClick={onSearchSubmit}
          disabled={loading || !value.serviceTypeId || !value.date}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </div>
    </div>
  );
}
