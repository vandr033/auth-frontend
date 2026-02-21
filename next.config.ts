import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
        hostname: "api.yourdomain.com",
        pathname: "/api/uploads/**",
      },
    ],
  },
}

export default nextConfig
