"use client";

import Image from "next/image";
import Link from "next/link";

import { useT } from "@/lib/i18n";
import { buildSignInRedirectFromCurrentLocation } from "@/app/lib/shop-context";

const platformLinks = [
  { key: "homeRedesign.footer.links.home", href: "#home" },
  { key: "homeRedesign.footer.links.sectors", href: "#sectores" },
  { key: "homeRedesign.footer.links.professionals", href: "#profesionales" },
  { key: "homeRedesign.footer.links.howItWorks", href: "#como-funciona" },
] as const;

const companyLinks = [
  { key: "homeRedesign.footer.links.clients", href: "/marketplace" },
  { key: "homeRedesign.footer.links.login", href: "/auth/sign-in" },
  { key: "homeRedesign.footer.links.terms", href: "/terms" },
  { key: "homeRedesign.footer.links.privacy", href: "/privacy" },
  { key: "homeRedesign.footer.links.contact", href: "/contact" },
] as const;

export function Footer() {
  const t = useT();
  const loginHref = buildSignInRedirectFromCurrentLocation("/");

  return (
    <footer className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1260px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.6fr_1fr_1fr] md:gap-8">
          <div>
            <Image
              src="/assets/priconpri/wordmark-stacked.png"
              alt="PRICONPRI"
              width={600}
              height={370}
              className="h-20 w-auto"
            />
            <p className="mt-4 max-w-[410px] text-[13px] leading-relaxed text-slate-600">
              {t("homeRedesign.footer.tagline")}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs leading-none font-bold tracking-[0.15em] text-black uppercase">
              {t("homeRedesign.footer.platform")}
            </h3>
            <nav aria-label="Plataforma">
              {platformLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="mb-2 block text-sm leading-none text-slate-600 transition-colors hover:text-black"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-xs leading-none font-bold tracking-[0.15em] text-black uppercase">
              {t("homeRedesign.footer.company")}
            </h3>
            <nav aria-label="Compañía">
              {companyLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.key === "homeRedesign.footer.links.login" ? loginHref : link.href}
                  className="mb-2 block text-sm leading-none text-slate-600 transition-colors hover:text-black"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 text-[10px] leading-none tracking-[0.12em] text-slate-400 uppercase sm:flex-row sm:items-center sm:justify-between">
            <p>{t("homeRedesign.footer.rights")}</p>
            <p>{t("homeRedesign.footer.made")}</p>
            <p>{t("homeRedesign.footer.location")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
