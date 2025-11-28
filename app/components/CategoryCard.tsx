
import { Category } from '@/app/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon;
  return (
    <Card className="group transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
      <CardHeader className="items-center">
        <div className="rounded-full bg-gray-100 p-4 transition-colors duration-300 group-hover:bg-blue-100 dark:bg-gray-800 dark:group-hover:bg-blue-900">
          <Icon className="h-8 w-8 text-gray-600 transition-colors duration-300 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
        <CardDescription className="mt-2 text-sm">{category.description}</CardDescription>
      </CardContent>
    </Card>
  );
}
