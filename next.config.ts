
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache";
import { createPwaRuntimeCaching } from "./lib/pwa-cache-policy";

const backendApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001/api";

const isPwaEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.ENABLE_PWA !== "false";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isPwaEnabled,
  importScripts: ["/pwa-api-cache-migration.js"],
  runtimeCaching: createPwaRuntimeCaching(
    defaultRuntimeCaching,
    backendApiBaseUrl
  ),
});

const nextConfig: NextConfig = {
  // Optimized for Docker production deployments
  output: "standalone",

  env: {
    NEXT_PUBLIC_PWA_ENABLED: isPwaEnabled ? "true" : "false",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.priconpri.com",
        pathname: "/api/uploads/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
