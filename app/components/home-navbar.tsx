"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

const LOGIN_HREF = "/auth/sign-in";
const DEMO_HREF = "https://cal.com/priconpri/demo";

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "U";
};

function AuthMenu({
  loading,
  isAuthenticated,
  displayName,
  userImage,
  userName,
  userEmail,
  loginLabel,
  profileLabel,
  appointmentsLabel,
  signOutLabel,
  onSignOut,
}: {
  loading: boolean;
  isAuthenticated: boolean;
  displayName: string;
  userImage?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  loginLabel: string;
  profileLabel: string;
  appointmentsLabel: string;
  signOutLabel: string;
  onSignOut: () => void;
}) {
  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />;
  }

  if (!isAuthenticated) {
    return (
      <Link
        href={LOGIN_HREF}
        className="text-[11px] leading-none font-semibold tracking-[0.08em] text-black uppercase transition-colors hover:text-slate-700"
      >
        {loginLabel}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:outline-none"
          aria-label={displayName}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-slate-900 text-xs font-semibold text-white">
              {getInitials(userName, userEmail)}
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
          <Link href="/me/profile">{profileLabel}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/me/appointments">{appointmentsLabel}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            onSignOut();
          }}
          className="text-rose-600 focus:text-rose-600"
        >
          {signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HomeNavbar() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const isMarketplace = pathname === "/marketplace";
  const { isAuthenticated, user, signOut, loading } = useAuth();

  const displayName = useMemo(() => {
    const firstName = typeof user?.first_name === "string" ? user.first_name : "";
    const lastName = typeof user?.last_name === "string" ? user.last_name : "";
    const fullName = `${firstName} ${lastName}`.trim();
    return user?.name || fullName || user?.email || t("mainNavbar.user");
  }, [t, user?.email, user?.first_name, user?.last_name, user?.name]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

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
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="shop" showLabel={false} />
            <AuthMenu
              loading={loading}
              isAuthenticated={isAuthenticated}
              displayName={displayName}
              userImage={user?.image}
              userName={user?.name}
              userEmail={user?.email}
              loginLabel={t("marketplaceRedesign.nav.login")}
              profileLabel={t("mainNavbar.myProfile")}
              appointmentsLabel={t("mainNavbar.myAppointments")}
              signOutLabel={t("mainNavbar.signOut")}
              onSignOut={() => {
                void handleSignOut();
              }}
            />
            <a
              href={DEMO_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center bg-black px-4 text-[10px] leading-none font-semibold tracking-[0.08em] text-white uppercase transition-opacity hover:opacity-80"
            >
              {t("marketplaceRedesign.nav.demo")}
            </a>
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
          <AuthMenu
            loading={loading}
            isAuthenticated={isAuthenticated}
            displayName={displayName}
            userImage={user?.image}
            userName={user?.name}
            userEmail={user?.email}
            loginLabel={t("homeRedesign.nav.login")}
            profileLabel={t("mainNavbar.myProfile")}
            appointmentsLabel={t("mainNavbar.myAppointments")}
            signOutLabel={t("mainNavbar.signOut")}
            onSignOut={() => {
              void handleSignOut();
            }}
          />
          <a
            href={DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center bg-biz-barbie-pink px-4 text-[10px] leading-none font-semibold tracking-[0.07em] text-white uppercase transition-colors hover:bg-[#d8307b]"
          >
            {t("homeRedesign.nav.demo")}
          </a>
        </div>
      </div>
    </header>
  );
}
