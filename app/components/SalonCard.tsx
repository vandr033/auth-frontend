
import { Salon } from '@/app/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface SalonCardProps {
  salon: Salon;
}

export function SalonCard({ salon }: SalonCardProps) {
  return (
    <Card className="group overflow-hidden rounded-lg shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <div className="relative">
        <Image
          src={salon.imageUrl}
          alt={salon.name}
          width={400}
          height={250}
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {salon.isTopRated && (
          <div className="absolute top-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            Top Rated
          </div>
        )}
        {salon.isNew && (
          <div className="absolute top-2 right-2 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
            New
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-bold">{salon.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {salon.neighborhood}, {salon.city}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold">{salon.rating}</span>
        </div>
        <button className="text-sm font-semibold text-blue-600 hover:underline">
          View Details
        </button>
      </CardFooter>
    </Card>
  );
}
