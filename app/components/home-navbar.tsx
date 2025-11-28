import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-businesses", label: "For businesses" },
];

export function HomeNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f1f4f9] py-4">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-0">
        <div className="flex h-16 items-center justify-between rounded-full border border-slate-200 bg-white/95 px-4 sm:px-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <Link href="/" className="flex items-center gap-3 text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-[#e9edf5]">
              <span className="h-5 w-5 -rotate-45 rounded-md bg-slate-900"></span>
            </div>
            <span className="text-lg font-semibold tracking-tight">StyleSeat</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="rounded-2xl border border-[#cdd6e4] bg-[#e5edf6] px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#d9e4f4]"
            >
              Login / Register
            </button>
            <button
              type="button"
              aria-label="Change language"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
            >
              <Globe className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200">
              <Image
                src="https://randomuser.me/api/portraits/women/68.jpg"
                alt="Profile avatar"
                width={40}
                height={40}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
