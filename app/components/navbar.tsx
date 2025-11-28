"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/barber-shop", label: "Barber Shop" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkClasses = (href: string) =>
    cn(
      "relative text-sm font-semibold text-text-muted transition hover:text-text-main",
      isActive(href) &&
        "text-brand after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-brand after:content-['']",
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/barber-shop" className="flex items-center gap-3">
          <Image
            src="https://cdn-icons-png.flaticon.com/512/7641/7641727.png"
            alt="logo"
            width={32}
            height={32}
            priority
          />
          <span className="text-lg font-semibold text-text-main">The Dapper Cut</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Button className="rounded-md bg-brand px-6 py-2 text-white shadow-card transition hover:bg-brand-hover">
            Reserve Now
          </Button>
          <Avatar className="h-10 w-10 border border-surface-border">
            <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" alt="Guest" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover">
            Reserve
          </Button>
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
            <SheetContent side="right" className="w-72 border-l border-surface-border bg-surface">
              <div className="flex flex-col gap-4 py-4 text-base">
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
                <Button
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-brand px-4 py-2 text-white shadow-card hover:bg-brand-hover"
                >
                  Reserve Now
                </Button>
                <div className="flex items-center gap-3 rounded-md border border-surface-border bg-section px-3 py-2">
                  <Avatar className="h-10 w-10 border border-surface-border">
                    <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" alt="Guest" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-text-main">Guest</p>
                    <p className="text-sm text-text-muted">guest@example.com</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
