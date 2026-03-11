import { BusinessBrandRulesSection } from "@/app/components/business-brand-rules-section";
import { BusinessCrmMemorySection } from "@/app/components/business-crm-memory-section";
import { BusinessFinalCtaSection } from "@/app/components/business-final-cta-section";
import { BusinessGettingStartedSection } from "@/app/components/business-getting-started-section";
import { BusinessHero } from "@/app/components/business-hero";
import { BusinessPricingSection } from "@/app/components/business-pricing-section";
import { BusinessScrollFeaturesSection } from "@/app/components/business-scroll-features-section";
import { BusinessStaffAutonomySection } from "@/app/components/business-staff-autonomy-section";
import { BusinessStatementSection } from "@/app/components/business-statement-section";
import { BusinessTypesSection } from "@/app/components/business-types-section";

export default function NegociosPage() {
  return (
    <main>
      <BusinessHero />
      <BusinessTypesSection />
      <BusinessStatementSection />
      <BusinessScrollFeaturesSection />
      <BusinessCrmMemorySection />
      <BusinessStaffAutonomySection />
      <BusinessBrandRulesSection />
      <BusinessGettingStartedSection />
      <BusinessPricingSection />
      <BusinessFinalCtaSection />
    </main>
  );
}
