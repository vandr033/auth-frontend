"use client";

import { useShop } from "@/app/shop/contexts/ShopContext";
import { ServicesGrid } from "./ServicesGrid";
import { ServicesList } from "./ServicesList";
import type { ShopCategory, ShopService } from "@/types/shop";

interface ServicesWrapperProps {
    maxItems?: number;
    categories?: ShopCategory[];
    services?: ShopService[];
}

export function ServicesWrapper({ maxItems, categories: propCategories, services: propServices }: ServicesWrapperProps) {
    const { categories: ctxCategories, services: ctxServices, servicesVariant, slug, company } = useShop();

    const categories = propCategories ?? ctxCategories;
    const services = propServices ?? ctxServices;
    const props = { categories, services, slug, currency: company?.currency, maxItems };

    switch (servicesVariant) {
        case "services-list":
            return <ServicesList {...props} />;
        case "services-grid":
        default:
            return <ServicesGrid {...props} />;
    }
}
