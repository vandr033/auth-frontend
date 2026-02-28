declare module "next-pwa" {
    import type { NextConfig } from "next";

    type PwaOptions = {
        dest: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
    };

    type WithPWA = (nextConfig: NextConfig) => NextConfig;

    export default function withPWA(options: PwaOptions): WithPWA;
}
