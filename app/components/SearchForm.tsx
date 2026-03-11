"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Clock3, MapPin, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { MensajeApi } from "@/types/api";
import { useApi } from "../hooks/useApi";
import { useT } from "@/lib/i18n";

interface ServiceType {
  id: string;
  name: string;
  slug: string;
}

interface City {
  city: string;
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

export function SearchForm() {
  const t = useT();
  const api = useApi();
  const router = useRouter();

  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [dateQuery, setDateQuery] = useState("");
  const [timeQuery, setTimeQuery] = useState("");

  const [serviceFocus, setServiceFocus] = useState(false);
  const [cityFocus, setCityFocus] = useState(false);

  const serviceRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const getServices = useCallback(
    async (query: string) => {
      try {
        setServicesLoading(true);
        const response: MensajeApi<ServiceType[]> = await api.get(`/home/service-types?query=${query}`);
        setServices(!response.error && Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    },
    [api],
  );

  const getCities = useCallback(
    async (query: string) => {
      try {
        setCitiesLoading(true);
        const response: MensajeApi<City[]> = await api.get(`/home/cities?query=${query}`);
        setCities(!response.error && Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void getServices(serviceQuery);
    }, 220);

    return () => clearTimeout(timer);
  }, [getServices, serviceQuery]);

  useEffect(() => {
    const exact = services.find(
      (service) => service.name.toLowerCase() === serviceQuery.trim().toLowerCase(),
    );
    setSelectedServiceTypeId(exact ? String(exact.id) : null);
  }, [serviceQuery, services]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getCities(cityQuery);
    }, 220);

    return () => clearTimeout(timer);
  }, [cityQuery, getCities]);

  /* Close dropdowns on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceFocus(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityFocus(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const normalizedTime = normalizeTimeValue(timeQuery);
    if (selectedServiceTypeId) params.set("service_type_id", selectedServiceTypeId);
    if (cityQuery.trim()) params.set("zone", cityQuery.trim());
    if (dateQuery) params.set("date", dateQuery);
    if (normalizedTime) params.set("time", normalizedTime);

    router.push(`/marketplace?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full mx-auto px-4 md:px-0"
      style={{ maxWidth: 1040 }}
    >
      <div
        className="flex flex-col md:flex-row bg-white"
        style={{ border: "1px solid #a3a3a3" }}
      >
        {/* ── 1. Service ── */}
        <div
          ref={serviceRef}
          className="relative flex items-center min-w-0 md:flex-[1.2]"
          style={{ height: 52, borderBottom: "1px solid #e5e5e5" }}
        >
          <Search
            size={15}
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#a3a3a3" }}
          />
          <input
            type="text"
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
            onFocus={() => setServiceFocus(true)}
            placeholder={t("homeRedesign.hero.searchService")}
            className="w-full h-full bg-transparent focus:outline-none"
            style={{
              paddingLeft: 48,
              paddingRight: 12,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#262626",
            }}
            autoComplete="off"
          />
          {servicesLoading && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
              style={{ color: "#a3a3a3" }}
            />
          )}
          {/* separator */}
          <span
            className="hidden md:block absolute right-0"
            style={{ top: "15%", bottom: "15%", width: 1, backgroundColor: "#d4d4d4" }}
          />

          {/* Service dropdown */}
          {serviceFocus && services.length > 0 && (
            <ul
              className="absolute left-0 top-full z-50 w-full max-h-60 overflow-y-auto bg-white"
              style={{ border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              {services.map((s) => (
                <li
                  key={s.id}
                  onMouseDown={() => {
                    setServiceQuery(s.name);
                    setSelectedServiceTypeId(String(s.id));
                    setServiceFocus(false);
                  }}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#404040",
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 2. City ── */}
        <div
          ref={cityRef}
          className="relative flex items-center min-w-0 md:flex-[1.05]"
          style={{ height: 52, borderBottom: "1px solid #e5e5e5" }}
        >
          <MapPin
            size={15}
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#a3a3a3" }}
          />
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onFocus={() => setCityFocus(true)}
            placeholder={t("homeRedesign.hero.searchCity")}
            className="w-full h-full bg-transparent focus:outline-none"
            style={{
              paddingLeft: 48,
              paddingRight: 12,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#262626",
            }}
            autoComplete="off"
          />
          {citiesLoading && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
              style={{ color: "#a3a3a3" }}
            />
          )}
          <span
            className="hidden md:block absolute right-0"
            style={{ top: "15%", bottom: "15%", width: 1, backgroundColor: "#d4d4d4" }}
          />

          {/* City dropdown */}
          {cityFocus && cities.length > 0 && (
            <ul
              className="absolute left-0 top-full z-50 w-full max-h-60 overflow-y-auto bg-white"
              style={{ border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              {cities.map((c) => (
                <li
                  key={c.city}
                  onMouseDown={() => {
                    setCityQuery(c.city);
                    setCityFocus(false);
                  }}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#404040",
                  }}
                >
                  {c.city}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 3. Date ── */}
        <div
          className="relative flex items-center min-w-0 md:shrink-0"
          style={{ height: 52, width: undefined, borderBottom: "1px solid #e5e5e5" }}
        >
          <Calendar
            size={15}
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#a3a3a3" }}
          />
          <input
            type="date"
            value={dateQuery}
            onChange={(e) => setDateQuery(e.target.value)}
            className={cn(
              "w-full h-full bg-transparent focus:outline-none appearance-none",
              "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            )}
            style={{
              paddingLeft: 48,
              paddingRight: 12,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: dateQuery ? "#262626" : "#a3a3a3",
              minWidth: 168,
            }}
          />
          <span
            className="hidden md:block absolute right-0"
            style={{ top: "15%", bottom: "15%", width: 1, backgroundColor: "#d4d4d4" }}
          />
        </div>

        {/* ── 4. Time ── */}
        <div
          className="relative flex items-center min-w-0 md:shrink-0"
          style={{ height: 52, borderBottom: "1px solid #e5e5e5" }}
        >
          <Clock3
            size={15}
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#a3a3a3" }}
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="12:00 PM"
            value={timeQuery}
            onChange={(e) => setTimeQuery(e.target.value)}
            onBlur={() => setTimeQuery((prev) => normalizeTimeValue(prev))}
            className="w-full h-full bg-transparent focus:outline-none"
            style={{
              paddingLeft: 48,
              paddingRight: 12,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: timeQuery ? "#262626" : "#a3a3a3",
              minWidth: 140,
            }}
          />
        </div>

        {/* ── 5. Search button ── */}
        <button
          type="submit"
          className="flex items-center justify-center cursor-pointer md:shrink-0 self-stretch"
          style={{
            minHeight: 52,
            minWidth: 160,
            backgroundColor: "var(--business-barbie-pink, #e73886)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {t("homeRedesign.hero.searchButton")}
        </button>
      </div>
    </form>
  );
}
