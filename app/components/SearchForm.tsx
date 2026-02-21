"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Search, Briefcase, Loader2 } from "lucide-react";
import { MensajeApi } from "@/types/api";
import { useApi } from "../hooks/useApi";

interface ServiceType {
  id: string;
  name: string;
  slug: string;
}
interface City {
  city: string;
}

export function SearchForm() {
  const api = useApi();
  const [serviceQuery, setServiceQuery] = useState("");
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [dateQuery, setDateQuery] = useState("");

  const [serviceFocus, setServiceFocus] = useState(false);
  const [cityFocus, setCityFocus] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getServices(serviceQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [serviceQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getCities(cityQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  const getServices = async (query: string) => {
    try {
      setServicesLoading(true);
      const response: MensajeApi<ServiceType[]> = await api.get(
        `/home/service-types?query=${query}`,
      );
      setServices(response.data);
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const getCities = async (query: string) => {
    try {
      setCitiesLoading(true);
      const response: MensajeApi<City[]> = await api.get(
        `/home/cities?query=${query}`,
      );
      setCities(response.data);
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };

  const filteredServices = useMemo(() => services, [services]);
  const filteredCities = useMemo(() => cities, [cities]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-md sm:p-3">
      <form className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {/* Service */}
        <div className="relative flex-1">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="service"
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              onFocus={() => setServiceFocus(true)}
              onBlur={() => setTimeout(() => setServiceFocus(false), 120)}
              placeholder="Service type"
              className="w-full rounded-xl bg-white/10 py-3 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:bg-white/15 focus:ring-2 focus:ring-brand/30"
            />
            {servicesLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          {serviceFocus && filteredServices.length > 0 && (
            <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
              <ul className="max-h-56 overflow-y-auto py-1 text-sm">
                {filteredServices.map((service) => (
                  <li
                    key={service.id}
                    className="cursor-pointer px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white"
                    onMouseDown={() => {
                      setServiceQuery(service.name);
                      setServiceFocus(false);
                    }}
                  >
                    {service.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* City */}
        <div className="relative flex-1">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="city"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onFocus={() => setCityFocus(true)}
              onBlur={() => setTimeout(() => setCityFocus(false), 120)}
              placeholder="City or area"
              className="w-full rounded-xl bg-white/10 py-3 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:bg-white/15 focus:ring-2 focus:ring-brand/30"
            />
            {citiesLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          {cityFocus && filteredCities.length > 0 && (
            <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
              <ul className="max-h-56 overflow-y-auto py-1 text-sm">
                {filteredCities.map((city) => (
                  <li
                    key={city.city}
                    className="cursor-pointer px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white"
                    onMouseDown={() => {
                      setCityQuery(city.city);
                      setCityFocus(false);
                    }}
                  >
                    {city.city}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Date */}
        <div className="relative flex-1 sm:max-w-[180px]">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            id="date"
            value={dateQuery}
            onChange={(e) => setDateQuery(e.target.value)}
            className="w-full rounded-xl bg-white/10 py-3 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:bg-white/15 focus:ring-2 focus:ring-brand/30 [color-scheme:dark]"
          />
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-hover hover:shadow-xl active:scale-95"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </form>
    </div>
  );
}
