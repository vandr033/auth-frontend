
import { services } from '@/app/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Search, Briefcase } from 'lucide-react';

export function SearchForm() {
  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          {/* Service Dropdown */}
          <div className="grid gap-2">
            <label htmlFor="service" className="text-sm font-medium flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Service
            </label>
            <select
              id="service"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* City/Area Input */}
          <div className="grid gap-2">
            <label htmlFor="city" className="text-sm font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              City / Area
            </label>
            <input
              id="city"
              type="text"
              placeholder="e.g., New York"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          {/* Date Picker */}
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm font-medium flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </label>
            <input
              id="date"
              type="date"
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
