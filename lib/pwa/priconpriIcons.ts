import type { Metadata } from "next";

export const PRICONPRI_ICON_URLS = {
    shortcut: "/brand-icon/32",
    apple: "/brand-icon/180",
    icon192: "/brand-icon/192",
    icon512: "/brand-icon/512",
} as const;

export const PRICONPRI_METADATA_ICONS: NonNullable<Metadata["icons"]> = {
    icon: [
        { url: PRICONPRI_ICON_URLS.shortcut, sizes: "32x32", type: "image/png" },
        { url: PRICONPRI_ICON_URLS.icon192, sizes: "192x192", type: "image/png" },
        { url: PRICONPRI_ICON_URLS.icon512, sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: PRICONPRI_ICON_URLS.shortcut, sizes: "32x32", type: "image/png" }],
    apple: [{ url: PRICONPRI_ICON_URLS.apple, sizes: "180x180", type: "image/png" }],
};
