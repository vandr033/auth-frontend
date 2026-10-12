import type { Metadata } from "next";

import NegociosLayout from "./negocios/layout";
import { NegociosLandingPage } from "@/components/negocios/NegociosLandingPage";

export const metadata: Metadata = {
  title: "PriConPri para negocios | Productos y gestión en un solo lugar",
  description:
    "Explorá reservas, restaurante, eventos, clases y tienda, junto con CRM, métricas y personalización. Probá PriConPri en vivo con datos de ejemplo.",
};

export default function HomePage() {
  return (
    <NegociosLayout>
      <NegociosLandingPage />
    </NegociosLayout>
  );
}
