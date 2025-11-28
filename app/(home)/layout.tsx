import type { ReactNode } from "react";

import { HomeNavbar } from "@/app/components/home-navbar";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <HomeNavbar />
      {children}
    </div>
  );
}
