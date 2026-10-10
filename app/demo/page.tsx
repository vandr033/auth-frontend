import type { Metadata } from "next";
import { DemoHubPage } from "./_components/DemoPages";

export const metadata: Metadata = {
    title: "Probá PriConPri en vivo",
    description: "Explorá los productos de PriConPri desde la experiencia pública y el panel administrativo real, con datos de ejemplo.",
};

export default function DemoPage() {
    return <DemoHubPage />;
}
