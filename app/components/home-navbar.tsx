"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function HomeNavbar() {
  const t = useT();
  const pathname = usePathname();
  const isMarketplace = pathname === "/marketplace";

  const navLinks = [
    { href: "#home", label: t("homeRedesign.nav.home") },
    { href: "#sectores", label: t("homeRedesign.nav.sectors") },
    { href: "#profesionales", label: t("homeRedesign.nav.professionals") },
    { href: "#como-funciona", label: t("homeRedesign.nav.howItWorks") },
    { href: "#negocios", label: t("homeRedesign.nav.businesses") },
  ];

  if (isMarketplace) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-[#ececec]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1260px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="shrink-0 inline-flex items-center"
            >
              <Image
                src="/assets/priconpri/logo-horizontal-black.png"
                alt="PRICONPRI"
                width={600}
                height={370}
                className="h-9 w-auto"
                priority
              />
            </Link>
            <nav
              aria-label="Navegación marketplace"
              className="hidden items-center gap-8 lg:flex"
            >
              <Link
                href="/#sectores"
                className="text-[11px] leading-none font-semibold tracking-[0.08em] text-black uppercase transition-opacity hover:opacity-70"
              >
                {t("marketplaceRedesign.nav.sectors")}
              </Link>
              <Link
                href="/negocios#precios"
                className="text-[11px] leading-none font-semibold tracking-[0.08em] text-black uppercase transition-opacity hover:opacity-70"
              >
                {t("marketplaceRedesign.nav.prices")}
              </Link>
              <Link
                href="/auth/sign-in"
                className="text-[11px] leading-none font-semibold tracking-[0.08em] text-black uppercase transition-opacity hover:opacity-70"
              >
                {t("marketplaceRedesign.nav.login")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="shop" showLabel={false} />
            <Link
              href="/negocios#demo"
              className="inline-flex h-9 items-center justify-center bg-black px-4 text-[10px] leading-none font-semibold tracking-[0.08em] text-white uppercase transition-opacity hover:opacity-80"
            >
              {t("marketplaceRedesign.nav.demo")}
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/8 bg-[#f3f3f3]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1260px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 inline-flex items-center"
        >
          <Image
            src="/assets/priconpri/logo-horizontal-black.png"
            alt="PRICONPRI"
            width={600}
            height={370}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-6 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[12px] leading-none font-semibold tracking-[0.02em] text-slate-800 transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="shop" showLabel={false} />
          <Link
            href="/auth/sign-in"
            className="hidden text-[11px] leading-none font-semibold tracking-[0.08em] text-black uppercase transition-colors hover:text-slate-700 sm:inline"
          >
            {t("homeRedesign.nav.login")}
          </Link>

          <Link
            href="/negocios#demo"
            className="inline-flex h-9 items-center justify-center bg-biz-barbie-pink px-4 text-[10px] leading-none font-semibold tracking-[0.07em] text-white uppercase transition-colors hover:bg-[#d8307b]"
          >
            {t("homeRedesign.nav.demo")}
          </Link>
        </div>
      </div>
    </header>
  );
}
