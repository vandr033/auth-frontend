import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoAddonPage } from "../../_components/DemoPages";
import { demoAddons, getDemoAddon } from "../../_lib/catalog";

export const metadata: Metadata = {
    title: "Explorá los add-ons de PriConPri",
    description: "Entrá a CRM, métricas y personalización en el panel real de PriConPri.",
};

export function generateStaticParams() {
    return demoAddons.map(({ key }) => ({ addon: key }));
}

export default async function DemoAddonRoute({ params }: { params: Promise<{ addon: string }> }) {
    const { addon: key } = await params;
    const addon = getDemoAddon(key);
    if (!addon) notFound();
    return <DemoAddonPage addon={addon} />;
}
