"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeContext";

const anchorLinks = [
  { anchor: "#home", label: "Home" },
  { anchor: "#how-it-works", label: "How It Works" },
  { anchor: "#for-businesses", label: "For Businesses" },
];

const reserveHref = "/barber-shop";

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "U";
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated, user, signOut, loading } = useAuth();

  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const basePath = pathname.startsWith("/barber-shop") ? "/barber-shop" : "/";
  const isBarberShop = basePath === "/barber-shop";

  const navLinks = useMemo(
    () =>
      anchorLinks.map((link) => ({
        ...link,
        href: `${basePath}${link.anchor}`,
      })),
    [basePath],
  );

  const brand = useMemo(
    () =>
      isBarberShop
        ? {
            name: "La Creme",
            // Mock brand/logo pulled from the current theme (placeholder until API-driven).
            logo: "https://cdn-icons-png.flaticon.com/512/7641/7641727.png",
            background: theme?.tokens.surfaceBg,
            border: theme?.tokens.surfaceBorder,
          }
        : {
            name: "clip-boook",
            logo: "https://cdn-icons-png.flaticon.com/512/427/427735.png",
            background: "#ffffff",
            border: "rgba(226,232,240,0.9)",
          },
    [isBarberShop, theme],
  );

  const isActive = (href: string) => {
    const cleanHref = href.split("#")[0];
    return cleanHref === pathname;
  };

  const linkClasses = (href: string) =>
    cn(
      "relative text-sm font-semibold text-text-muted transition hover:text-text-main",
      isActive(href) &&
        "text-brand after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-brand after:content-['']",
    );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUserMenuOpen(false);
      router.push(basePath);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const AuthActions = () => {
    if (loading) {
      return (
        <div className="h-10 w-28 animate-pulse rounded-md bg-surface-border/60" />
      );
    }

    if (!isAuthenticated) {
      return (
        <Button
          onClick={() => router.push("/auth/sign-in")}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-hover"
        >
          Sign in / Create an account
        </Button>
      );
    }

    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-2 py-1 shadow-sm transition hover:border-brand"
        >
          <Avatar className="h-10 w-10 border border-surface-border">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
            <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-text-main line-clamp-1">
              {user?.name || user?.email || "User"}
            </p>
            {user?.email && (
              <p className="text-xs text-text-muted line-clamp-1">{user.email}</p>
            )}
          </div>
        </button>
        {userMenuOpen && (
          <div className="absolute right-0 mt-3 w-56 rounded-md border border-surface-border bg-surface shadow-card">
            <Link
              href="/me/profile"
              className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
            >
              My Profile
            </Link>
            <Link
              href="/me/appointments"
              className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
            >
              My Appointments
            </Link>
            <Separator className="border-surface-border" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-brand transition hover:bg-brand-soft-bg hover:text-brand"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80",
        isBarberShop ? "bg-surface/95 border-surface-border" : "bg-white/95 border-slate-200",
      )}
      style={
        isBarberShop
          ? {
              backgroundColor: brand.background ?? undefined,
              borderColor: brand.border ?? undefined,
            }
          : undefined
      }
    >
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={basePath} className="flex items-center gap-3">
          <Image
            src={brand.logo}
            alt={`${brand.name} logo`}
            width={32}
            height={32}
            priority
          />
          <span
            className={cn(
              "text-lg font-semibold",
              isBarberShop ? "text-text-main" : "text-slate-900",
            )}
            style={isBarberShop && theme ? { color: theme.tokens.brand } : undefined}
          >
            {brand.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href={reserveHref} className="inline-flex">
            <Button className="rounded-md bg-brand px-6 py-2 text-white shadow-card transition hover:bg-brand-hover">
              Reserve Now
            </Button>
          </Link>
          <AuthActions />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link href={reserveHref} className="inline-flex">
            <Button className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover">
              Reserve
            </Button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border border-surface-border text-text-main"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 border-l border-surface-border bg-surface"
            >
              <div className="flex flex-col gap-4 py-6 text-base">
                <div className="flex items-center gap-3 rounded-md border border-surface-border bg-section px-3 py-3">
                  <Avatar className="h-10 w-10 border border-surface-border">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                    <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-text-main">
                      {user?.name || user?.email || "Guest"}
                    </p>
                    <p className="text-sm text-text-muted">
                      {isAuthenticated ? "Signed in" : "Not signed in"}
                    </p>
                  </div>
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "text-text-muted transition hover:text-text-main",
                      isActive(link.href) && "text-brand",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <Separator className="border-surface-border" />
                <Link href={reserveHref} onClick={() => setOpen(false)}>
                  <Button className="w-full rounded-md bg-brand px-4 py-2 text-white shadow-card hover:bg-brand-hover">
                    Reserve Now
                  </Button>
                </Link>
                {!isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full border-surface-border text-text-main"
                    onClick={() => {
                      setOpen(false);
                      router.push("/auth/sign-in");
                    }}
                  >
                    Sign in / Create an account
                  </Button>
                ) : (
                  <>
                    <Link href="/me/profile" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <UserRound className="h-4 w-4" />
                        My Profile
                      </Button>
                    </Link>
                    <Link href="/me/appointments" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        My Appointments
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-brand hover:bg-brand-soft-bg hover:text-brand"
                      onClick={() => {
                        setOpen(false);
                        void handleSignOut();
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
