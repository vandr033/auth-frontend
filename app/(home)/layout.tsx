import type { ReactNode } from "react";

import { Navbar } from "@/app/components/navbar";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <Navbar />
      {children}
    </div>
  );
}
