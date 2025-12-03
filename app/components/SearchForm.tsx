
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Search, Briefcase, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MensajeApi } from '@/types/api';
import { useApi } from '../hooks/useApi';

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
  const [serviceQuery, setServiceQuery] = useState('');
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [dateQuery, setDateQuery] = useState('');

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
      const response: MensajeApi<ServiceType[]> = await api.get(`/home/service-types?query=${query}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const getCities = async (query: string) => {
    try {
      setCitiesLoading(true);
      const response: MensajeApi<City[]> = await api.get(`/home/cities?query=${query}`);
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };

  const filteredServices = useMemo(() => services, [services]);
  const filteredCities = useMemo(() => cities, [cities]);

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          {/* Service search */}
          <div className="relative grid gap-2">
            <label htmlFor="service" className="flex items-center text-sm font-medium">
              <Briefcase className="w-4 h-4 mr-2" />
              Service
            </label>
            <div className="relative">
              <input
                id="service"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                onFocus={() => setServiceFocus(true)}
                onBlur={() => setTimeout(() => setServiceFocus(false), 120)}
                placeholder="Search a service"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />
              {servicesLoading && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            {serviceFocus && filteredServices.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <ul className="max-h-56 overflow-y-auto text-sm">
                  {filteredServices.map((service) => (
                    <li
                      key={service.id}
                      className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
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

          {/* City/Area search */}
          <div className="relative grid gap-2">
            <label htmlFor="city" className="flex items-center text-sm font-medium">
              <MapPin className="w-4 h-4 mr-2" />
              City / Area
            </label>
            <div className="relative">
              <input
                id="city"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onFocus={() => setCityFocus(true)}
                onBlur={() => setTimeout(() => setCityFocus(false), 120)}
                placeholder="Search a city"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />
              {citiesLoading && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            {cityFocus && filteredCities.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <ul className="max-h-56 overflow-y-auto text-sm">
                  {filteredCities.map((city) => (
                    <li
                      key={city.city}
                      className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
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

          {/* Date Picker */}
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm font-medium flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </label>
            <input
              type="date"
              id="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          {/* Search Button */}
          <Button type="submit" className="w-full md:w-auto flex items-center justify-center gap-2">
            <Search className="h-5 w-5" />
            <span className="text-base">Search</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
