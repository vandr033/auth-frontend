import { notFound } from "next/navigation";

import { ProductMarketingPage } from "@/components/negocios/ProductMarketingPage";
import { ALL_NEGOCIOS_PRODUCTS, getNegociosProductBySlug } from "@/lib/negocios/catalog";

export function generateStaticParams() {
  return ALL_NEGOCIOS_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export default async function NegociosProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getNegociosProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductMarketingPage product={product} />;
}
