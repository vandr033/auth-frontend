import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Category } from "@/app/lib/types";

interface CategoryCardProps {
  category: Category;
}

const toComponentName = (value: string) =>
  value
    ?.split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const getIcon = (iconName?: string): LucideIcon => {
  const name = toComponentName(iconName ?? "");
  if (name && name in Icons) {
    return Icons[name as keyof typeof Icons] as LucideIcon;
  }
  return Icons.Sparkles;
};

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = getIcon((category as any).icon_name ?? (category as any).icon);
  return (
    <div className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-all duration-300 group-hover:scale-110 group-hover:bg-brand/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
        {category.name}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
        {category.description}
      </p>
    </div>
  );
}
