import { Hero } from "@/app/components/Hero";
import { PopularCategories } from "@/app/components/PopularCategories";
import { FeaturedSalons } from "@/app/components/FeaturedSalons";
import { NearbyShopsMap } from "@/app/components/NearbyShopsMap";
import { HowItWorks } from "@/app/components/HowItWorks";
import { ForBusinesses } from "@/app/components/ForBusinesses";
import { HomeFinalCta } from "@/app/components/HomeFinalCta";
import { Footer } from "@/app/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main>
        <Hero />
        <PopularCategories />
        <FeaturedSalons />
        <NearbyShopsMap />
        <HowItWorks />
        <ForBusinesses />
        <HomeFinalCta />
      </main>
      <Footer />
    </div>
  );
}
