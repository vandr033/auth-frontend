import { Hero } from "@/app/components/Hero";
import { PopularCategories } from "@/app/components/PopularCategories";
import { FeaturedSalons } from "@/app/components/FeaturedSalons";
import { HowItWorks } from "@/app/components/HowItWorks";
import { ForBusinesses } from "@/app/components/ForBusinesses";
import { Footer } from "@/app/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main>
        <Hero />
        <PopularCategories />
        <FeaturedSalons />
        <HowItWorks />
        <ForBusinesses />
      </main>
      <Footer />
    </div>
  );
}
