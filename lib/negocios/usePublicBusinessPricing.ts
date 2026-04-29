"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_BUSINESS_PRICING_CONFIG,
  fetchPublicBusinessPricingConfig,
  type BusinessPricingConfig,
} from "@/lib/negocios/business-pricing";

type UsePublicBusinessPricingResult = {
  pricingConfig: BusinessPricingConfig;
  isLoading: boolean;
  hasRemoteConfig: boolean;
};

export function usePublicBusinessPricing(): UsePublicBusinessPricingResult {
  const [pricingConfig, setPricingConfig] = useState<BusinessPricingConfig>(
    DEFAULT_BUSINESS_PRICING_CONFIG,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasRemoteConfig, setHasRemoteConfig] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const nextConfig = await fetchPublicBusinessPricingConfig(controller.signal);
        setPricingConfig(nextConfig);
        setHasRemoteConfig(true);
      } catch (error) {
        console.error("No pudimos cargar el pricing público. Seguimos con defaults.", error);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  return {
    pricingConfig,
    isLoading,
    hasRemoteConfig,
  };
}
