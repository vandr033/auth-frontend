import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoProductPage } from "../_components/DemoPages";
import { completeDemoProduct, demoProducts, getDemoProduct } from "../_lib/catalog";

export const metadata: Metadata = {
    title: "Explorá PriConPri",
    description: "Probá la experiencia pública y el panel administrativo real de PriConPri.",
};

export function generateStaticParams() {
    return [...demoProducts.map(({ key }) => ({ product: key })), { product: "completo" }];
}

export default async function DemoProductRoute({ params }: { params: Promise<{ product: string }> }) {
    const { product: key } = await params;
    if (key === "completo") {
        return <DemoProductPage product={completeDemoProduct} />;
    }
    const demoProduct = getDemoProduct(key);
    if (!demoProduct) notFound();
    return <DemoProductPage product={demoProduct} />;
}
