"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { type MouseEvent, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { negociosHeaderLinks } from "@/components/negocios/negocios-links";

const LOGIN_HREF = "/auth/sign-in";
const DEMO_HREF = "/contact";

export function NegociosHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(
    () =>
      negociosHeaderLinks.map((item) => ({
        ...item,
        href: `#${item.id}`,
      })),
    [],
  );

  const handleAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    const headerOffset = 72;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: targetPosition, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="shrink-0 text-[17px] font-black tracking-tight text-black">
            PRICONPRI.
          </Link>

          <nav aria-label="Navegación principal de negocios" className="hidden items-center gap-6 lg:flex">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(event) => handleAnchorClick(event, link.id)}
                className="text-[12px] font-medium text-slate-900 transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher variant="shop" showLabel={false} />

          <Link
            href={LOGIN_HREF}
            className="px-2 text-[10px] font-semibold tracking-[0.08em] text-black transition-colors hover:text-slate-700"
          >
            LOGIN
          </Link>

          <Button
            asChild
            className="h-9 rounded-sm bg-biz-cta-primary px-4 text-[10px] font-semibold tracking-[0.06em] text-white uppercase hover:bg-biz-cta-hover"
          >
            <Link href={DEMO_HREF}>AGENDAR DEMO</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher variant="shop" showLabel={false} />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menú de navegación"
                className="h-9 w-9 border-slate-300 text-slate-900"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm border-l border-slate-200 bg-white p-0">
              <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
                <SheetTitle className="text-sm font-semibold text-slate-900">Menú</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col gap-2 px-5 py-5">
                <nav aria-label="Navegación de secciones de negocios" className="space-y-1">
                  {links.map((link) => (
                    <a
                      key={`mobile-${link.id}`}
                      href={link.href}
                      onClick={(event) => handleAnchorClick(event, link.id)}
                      className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <div className="my-3 h-px w-full bg-slate-200" />

                <Link
                  href={LOGIN_HREF}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                >
                  LOGIN
                </Link>

                <div className="mt-auto space-y-3 pb-8">
                  <LanguageSwitcher variant="shop" />
                  <Button
                    asChild
                    className="h-10 w-full rounded-sm bg-biz-cta-primary text-xs font-semibold tracking-[0.06em] text-white uppercase hover:bg-biz-cta-hover"
                  >
                    <Link href={DEMO_HREF} onClick={() => setMobileOpen(false)}>
                      AGENDAR DEMO
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
