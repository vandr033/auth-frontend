import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isPwaEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.ENABLE_PWA !== "false";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isPwaEnabled,
});

const nextConfig: NextConfig = {
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
      // Backend API images (development)
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/uploads/**",
      },
      // Backend API images (production) - update hostname as needed
      {
        protocol: "https",
        hostname: "api.priconpri.com",
        pathname: "/api/uploads/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
