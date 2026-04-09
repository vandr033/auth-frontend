"use client";

import { useShop } from "@/app/shop/contexts/ShopContext";
import { HeroCinematic } from "./HeroCinematic";
import { HeroSplit } from "./HeroSplit";
import { HeroMinimal } from "./HeroMinimal";

export function HeroWrapper() {
    const { company, reviewStats, socialLinks, heroVariant, slug, homeCTAButtons } = useShop();

    if (!company) return null;

    const props = { company, reviewStats, socialLinks, slug, homeCTAButtons };

    switch (heroVariant) {
        case "hero-split":
            return <HeroSplit {...props} />;
        case "hero-minimal":
            return <HeroMinimal {...props} />;
        case "hero-cinematic":
        default:
            return <HeroCinematic {...props} />;
    }
}
