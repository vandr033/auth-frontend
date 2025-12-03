
export interface Category {
  id: string;
  key: string;
  name: string;
  description: string;
  // icon: React.ComponentType<{ className?: string }>;
  icon_name: string;
}

export interface Salon {
  id: string;
  name: string;
  slug: string;
  rating: number;
  imageUrl: string;
  city: string;
  neighborhood: string;
  isTopRated?: boolean;
  isNew?: boolean;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
}
