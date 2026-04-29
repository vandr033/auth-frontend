"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { type MouseEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { negociosHeaderLinks } from "@/components/negocios/negocios-links";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import {
  buildSignInRedirectFromCurrentLocation,
  getCurrentInternalPathWithQuery,
} from "@/app/lib/shop-context";

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "U";
};

export function NegociosHeader() {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginHref = buildSignInRedirectFromCurrentLocation("/negocios");

  const links = useMemo(
    () =>
      negociosHeaderLinks.map((item) => ({ ...item })),
    [],
  );

  const displayName = useMemo(() => {
    const firstName = typeof user?.first_name === "string" ? user.first_name : "";
    const lastName = typeof user?.last_name === "string" ? user.last_name : "";
    const fullName = `${firstName} ${lastName}`.trim();
    return user?.name || fullName || user?.email || t("businessNavbar.user");
  }, [t, user?.email, user?.first_name, user?.last_name, user?.name]);

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

  const handleSignOut = async () => {
    try {
      const redirectTarget = getCurrentInternalPathWithQuery("/negocios");
      await signOut();
      setMobileOpen(false);
      router.replace(redirectTarget);
      router.refresh();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="shrink-0 inline-flex items-center" aria-label="PRICONPRI">
            <Image
              src="/assets/priconpri/logo-horizontal-black.webp"
              alt="PRICONPRI"
              width={600}
              height={370}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <nav aria-label="Navegación principal de negocios" className="hidden items-center gap-6 lg:flex">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(event) => {
                  if (!link.id) return;
                  handleAnchorClick(event, link.id);
                }}
                className="text-[12px] font-medium text-slate-900 transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher variant="shop" showLabel={false} />

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:outline-none"
                  aria-label={displayName}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-slate-900 text-xs font-semibold text-white">
                      {getInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-slate-200 bg-white">
                <DropdownMenuLabel className="truncate text-slate-900">
                  {displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/me/profile">{t("mainNavbar.myProfile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/me/appointments">{t("mainNavbar.myAppointments")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/me/reviews">{t("mainNavbar.myReviews")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void handleSignOut();
                  }}
                  className="text-rose-600 focus:text-rose-600"
                >
                  {t("mainNavbar.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={loginHref}
              className="px-2 text-[10px] font-semibold tracking-[0.08em] text-black transition-colors hover:text-slate-700"
            >
              INGRESAR
            </Link>
          )}

          <Link
            href="/negocios/crear-cuenta"
            className="inline-flex h-9 items-center justify-center rounded-sm bg-biz-cta-primary px-4 text-[10px] font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-biz-cta-hover"
          >
            CREÁ TU CUENTA
          </Link>
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
                      onClick={(event) => {
                        if (!link.id) {
                          setMobileOpen(false);
                          return;
                        }
                        handleAnchorClick(event, link.id);
                      }}
                      className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <div className="my-3 h-px w-full bg-slate-200" />

                {isAuthenticated ? (
                  <>
                    <Link
                      href="/me/profile"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      {t("mainNavbar.myProfile")}
                    </Link>
                    <Link
                      href="/me/appointments"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      {t("mainNavbar.myAppointments")}
                    </Link>
                    <Link
                      href="/me/reviews"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      {t("mainNavbar.myReviews")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSignOut();
                      }}
                      className="block rounded-md px-2 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {t("mainNavbar.signOut")}
                    </button>
                  </>
                ) : (
                  <Link
                    href={loginHref}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    INGRESAR
                  </Link>
                )}

                <div className="mt-auto space-y-3 pb-8">
                  <LanguageSwitcher variant="shop" />
                  <Link
                    href="/negocios/crear-cuenta"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-10 w-full items-center justify-center rounded-sm bg-biz-cta-primary text-xs font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-biz-cta-hover"
                  >
                    CREÁ TU CUENTA
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
