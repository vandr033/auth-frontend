"use client";

import { useShop } from "@/app/shop/contexts/ShopContext";
import { TeamCards } from "./TeamCards";
import { TeamSpotlight } from "./TeamSpotlight";

export function TeamWrapper() {
    const { staff, teamVariant, slug } = useShop();

    const props = { staff, slug };

    switch (teamVariant) {
        case "team-spotlight":
            return <TeamSpotlight {...props} />;
        case "team-cards":
        default:
            return <TeamCards {...props} />;
    }
}
