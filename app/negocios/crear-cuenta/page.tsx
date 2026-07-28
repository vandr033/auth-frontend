import { BusinessSignupWizard } from "@/components/negocios/BusinessSignupWizard";
import { parsePricingSelection } from "@/lib/negocios/pricing";

type NegociosCrearCuentaPageProps = {
  searchParams: Promise<{ selection?: string | string[] }>;
};

export default async function NegociosCrearCuentaPage({ searchParams }: NegociosCrearCuentaPageProps) {
  const { selection } = await searchParams;

  return <BusinessSignupWizard initialSelection={parsePricingSelection(selection)} />;
}
