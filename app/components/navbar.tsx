"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon, Scissors } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import {
  appendShopParam,
  buildSignInRedirectFromCurrentLocation,
  getCurrentInternalPathWithQuery,
  getShopSlugFromParams,
} from "@/app/lib/shop-context";

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "U";
};

function NavbarContent({ shopSlug }: { shopSlug: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const profileHref = appendShopParam("/me/profile", shopSlug);
  const appointmentsHref = appendShopParam("/me/appointments", shopSlug);
  const reviewsHref = appendShopParam("/me/reviews", shopSlug);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navLinks = [
    { href: "/#home", label: t("mainNavbar.home") },
    { href: "/#how-it-works", label: t("mainNavbar.howItWorks") },
    { href: "/#for-businesses", label: t("mainNavbar.forBusinesses") },
  ];

  // Track scroll for backdrop effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dark mode toggle
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSignOut = async () => {
    try {
      const redirectTarget = getCurrentInternalPathWithQuery("/");
      await signOut();
      setUserMenuOpen(false);
      router.replace(redirectTarget);
      router.refresh();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Scissors className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t("mainNavbar.brand")}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-brand transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={t("mainNavbar.toggleDarkMode")}
            >
              {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Auth */}
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            ) : !isAuthenticated ? (
              <Button
                onClick={() => router.push(buildSignInRedirectFromCurrentLocation("/"))}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover hover:shadow-md"
              >
                {t("mainNavbar.signIn")}
              </Button>
            ) : (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 transition-colors hover:border-brand dark:border-slate-700"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? t("mainNavbar.user")} />
                    <AvatarFallback className="bg-brand text-white text-xs font-semibold">
                      {getInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user?.name || t("mainNavbar.user")}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      )}
                    </div>
                    <Link
                      href={profileHref}
                      className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t("mainNavbar.myProfile")}
                    </Link>
                    <Link
                      href={appointmentsHref}
                      className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t("mainNavbar.myAppointments")}
                    </Link>
                    <Link
                      href={reviewsHref}
                      className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t("mainNavbar.myReviews")}
                    </Link>
                    <Separator />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      {t("mainNavbar.signOut")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleDark}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label={t("mainNavbar.toggleDarkMode")}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300"
              aria-label={t("mainNavbar.menu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-72 border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">{t("mainNavbar.menu")}</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              {isAuthenticated && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.image ?? undefined} />
                    <AvatarFallback className="bg-brand text-white text-xs font-semibold">
                      {getInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate dark:text-white">
                      {user?.name || t("mainNavbar.user")}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
                  </div>
                </div>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {link.label}
                </Link>
              ))}
              <Separator className="my-2" />
              {!isAuthenticated ? (
                <Button
                  onClick={() => {
                    setMobileOpen(false);
                    router.push(buildSignInRedirectFromCurrentLocation("/"));
                  }}
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                >
                  {t("mainNavbar.signInOrRegister")}
                </Button>
              ) : (
                <>
                  <Link
                    href={profileHref}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("mainNavbar.myProfile")}
                  </Link>
                  <Link
                    href={appointmentsHref}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("mainNavbar.myAppointments")}
                  </Link>
                  <Link
                    href={reviewsHref}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("mainNavbar.myReviews")}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void handleSignOut();
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400"
                  >
                    {t("mainNavbar.signOut")}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function NavbarWithSearchParams() {
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);
  return <NavbarContent shopSlug={shopSlug} />;
}

export function Navbar() {
  return (
    <Suspense fallback={<NavbarContent shopSlug={null} />}>
      <NavbarWithSearchParams />
    </Suspense>
  );
}
