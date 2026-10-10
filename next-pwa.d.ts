declare module "next-pwa" {
    import type { NextConfig } from "next";

    type PwaOptions = {
        dest: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
        importScripts?: string[];
        runtimeCaching?: RuntimeCachingRule[];
    };

    export type RuntimeCachingRule = {
        urlPattern: RegExp | ((options: { url: URL }) => boolean);
        handler: string;
        method?: string;
        options?: Record<string, unknown>;
    };

    type WithPWA = (nextConfig: NextConfig) => NextConfig;

    export default function withPWA(options: PwaOptions): WithPWA;
}

declare module "next-pwa/cache" {
    const runtimeCaching: import("next-pwa").RuntimeCachingRule[];
    export default runtimeCaching;
}
