
import { featuredSalons } from '@/app/lib/mock-data';
import { SalonCard } from './SalonCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function FeaturedSalons() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Featured & Top Rated Shops
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
            Handpicked salons and barbershops with top reviews from our community.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredSalons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/salons" passHref>
            <Button size="lg">View All Salons</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
