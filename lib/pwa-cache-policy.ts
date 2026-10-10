export type PwaRuntimeCachingRule = {
  urlPattern: RegExp | ((options: { url: URL }) => boolean);
  handler: string;
  method?: string;
  options?: Record<string, unknown>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createPwaRuntimeCaching(
  defaultRules: PwaRuntimeCachingRule[],
  backendApiBaseUrl: string,
): PwaRuntimeCachingRule[] {
  const backendOrigin = new URL(backendApiBaseUrl, "http://localhost:3001/api").origin;
  // The broad API and cross-origin defaults can cache tenant responses.
  const safeDefaultRules = defaultRules.filter(
    (rule) => !["apis", "cross-origin"].includes(String(rule.options?.cacheName)),
  );

  return [
    {
      urlPattern: ({ url }) =>
        url.origin === self.location.origin && /^\/api(?:\/|$)/.test(url.pathname),
      handler: "NetworkOnly",
      method: "GET",
    },
    {
      urlPattern: new RegExp(`^${escapeRegExp(backendOrigin)}(?:/|$)`),
      handler: "NetworkOnly",
      method: "GET",
    },
    ...safeDefaultRules,
  ];
}
