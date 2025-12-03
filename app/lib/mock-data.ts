
import { Category, Salon, Service } from './types';

// Mock data for popular categories
export const popularCategories: Category[] = [
  {
    id: '1',
    name: 'Barber',
    key : 'barber',
    icon_name: 'Scissors',
    description: 'Classic cuts, shaves, and beard trims.',
  },
  {
    id: '2',
    name: 'Hair Salon',
    key : 'hair-salon',
    icon_name: 'Brush',
    description: 'Styling, coloring, and treatments.',
  },
  {
    id: '3',
    name: 'Nails',
    key : 'nails',
    icon_name: 'Hand',
    description: 'Manicures, pedicures, and nail art.',
  },
  {
    id: '4',
    name: 'Beauty',
    key : 'beauty',
    icon_name: 'Sparkles',
    description: 'Facials, waxing, and makeup services.',
  },
];

// Mock data for featured and top-rated salons
export const featuredSalons: Salon[] = [
  {
    id: '1',
    name: 'The Dapper Gent',
    slug: 'the-dapper-gent',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-19a6b8da4433?q=80&w=2070&auto=format&fit=crop',
    city: 'New York',
    neighborhood: 'Midtown',
    isTopRated: true,
  },
  {
    id: '2',
    name: 'Chic & Cut',
    slug: 'chic-and-cut',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1622287162716-f3c161e6a843?q=80&w=1932&auto=format&fit=crop',
    city: 'Los Angeles',
    neighborhood: 'Beverly Hills',
  },
  {
    id: '3',
    name: 'Nail Nirvana',
    slug: 'nail-nirvana',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536374?q=80&w=2070&auto.format&fit=crop',
    city: 'Miami',
    neighborhood: 'South Beach',
    isNew: true,
  },
  {
    id: '4',
    name: 'Fade Masters',
    slug: 'fade-masters',
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-6947d3fb003b?q=80&w=1935&auto=format&fit=crop',
    city: 'Chicago',
    neighborhood: 'Wicker Park',
  },
];

// Mock data for services dropdown
export const services: Service[] = [
  { id: '1', name: 'Haircut', slug: 'haircut' },
  { id: '2', name: 'Beard Trim', slug: 'beard-trim' },
  { id: '3', name: 'Hair Color', slug: 'hair-color' },
  { id: '4', name: 'Manicure', slug: 'manicure' },
  { id: '5', name: 'Pedicure', slug: 'pedicure' },
  { id: '6', name: 'Facial', slug: 'facial' },
];
