"use client";

import { Scissors } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

const footerLinks = {
  product: [
    { label: "footer.searchSalons", href: "/salons" },
    { label: "footer.howItWorks", href: "/#how-it-works" },
    { label: "footer.forBusinesses", href: "/#for-businesses" },
  ],
  company: [
    { label: "footer.aboutUs", href: "/about" },
    { label: "footer.contact", href: "/contact" },
    { label: "footer.careers", href: "/careers" },
  ],
  legal: [
    { label: "footer.termsOfService", href: "/terms" },
    { label: "footer.privacyPolicy", href: "/privacy" },
    { label: "footer.support", href: "/support" },
  ],
};

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <Scissors className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                ClipBook
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t("footer.description")}
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {t(`footer.${title}`)}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-white"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 dark:border-slate-800 sm:flex-row">
          <p className="text-sm text-slate-400">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            {/* Social placeholders */}
            {[
              { key: "footer.twitter", href: "#" },
              { key: "footer.instagram", href: "#" },
              { key: "footer.linkedin", href: "#" },
            ].map((social) => (
              <a
                key={social.key}
                href={social.href}
                className="text-xs font-medium text-slate-400 transition-colors hover:text-brand"
              >
                {t(social.key)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
