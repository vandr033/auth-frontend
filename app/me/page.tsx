import { redirect } from "next/navigation";

import { appendShopParam, normalizeShopSlug } from "@/app/lib/shop-context";

type MeIndexPageProps = {
  searchParams: Promise<{ shop?: string | string[] }>;
};

export default async function MeIndexPage({ searchParams }: MeIndexPageProps) {
  const { shop } = await searchParams;
  const shopValue = Array.isArray(shop) ? shop[0] : shop;
  const shopSlug = normalizeShopSlug(shopValue);
  redirect(appendShopParam("/me/appointments", shopSlug));
}
