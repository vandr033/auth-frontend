import type { Metadata } from "next";
import type { ReactNode } from "react";

import { HomeNavbar } from "@/app/components/home-navbar";
import { PRICONPRI_METADATA_ICONS } from "@/lib/pwa/priconpriIcons";

export const metadata: Metadata = {
  title: "PriConPri",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PriConPri",
  },
  icons: PRICONPRI_METADATA_ICONS,
};

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <HomeNavbar />
      {children}
    </div>
  );
}
