
'use client';
import { CategoryCard } from './CategoryCard';
import { useState } from 'react';
import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { MensajeApi } from '@/types/api';
import { Category } from '@/app/lib/types';




export function PopularCategories() {
const [popularCategories, setPopularCategories] = useState<Category[]>([]);
const api = useApi();
useEffect(() => {
  const fetchPopularCategories = async () => {
    try {
      const response: MensajeApi<Category[]> = await api.get('/home/categories');
      const data = response.data;
      setPopularCategories(data);
    } catch (error) {
      console.error('Error fetching popular categories:', error);
    }
  };

  fetchPopularCategories();
}, []);
  
  return (
    <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Popular Categories
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
            Browse our most popular services to find what you need.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {popularCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
