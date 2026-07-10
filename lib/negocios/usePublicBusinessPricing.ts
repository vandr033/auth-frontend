"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchPublicBusinessPricingConfig,
  type BusinessPricingConfig,
} from "@/lib/negocios/business-pricing";

type UsePublicBusinessPricingResult = {
  pricingConfig: BusinessPricingConfig | null;
  isLoading: boolean;
  hasRemoteConfig: boolean;
  error: string | null;
  retry: () => void;
};

export function usePublicBusinessPricing(): UsePublicBusinessPricingResult {
  const [pricingConfig, setPricingConfig] = useState<BusinessPricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRemoteConfig, setHasRemoteConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => {
    setRequestKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const nextConfig = await fetchPublicBusinessPricingConfig(controller.signal);
        setPricingConfig(nextConfig);
        setHasRemoteConfig(true);
      } catch (error) {
        if (controller.signal.aborted) return;

        setPricingConfig(null);
        setHasRemoteConfig(false);
        setError("No pudimos cargar los precios vigentes.");
        console.error("No pudimos cargar el pricing público.", error);
      } finally {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [requestKey]);

  return {
    pricingConfig,
    isLoading,
    hasRemoteConfig,
    error,
    retry,
  };
}
