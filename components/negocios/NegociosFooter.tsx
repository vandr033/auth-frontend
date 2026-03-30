"use client";

import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";

import {
  negociosCompanyLinks,
  negociosPlatformLinks,
} from "@/components/negocios/negocios-links";
import { buildSignInRedirectFromCurrentLocation } from "@/app/lib/shop-context";

const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#";
const tiktokUrl = process.env.NEXT_PUBLIC_TIKTOK_URL || "#";
const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

export function NegociosFooter() {
  const loginHref = buildSignInRedirectFromCurrentLocation("/negocios");

  return (
    <footer className="w-full bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          <div className="md:col-span-2">
            <Image
              src="/assets/priconpri/wordmark-stacked.png"
              alt="PRICONPRI"
              width={600}
              height={370}
              className="h-20 w-auto"
            />
            <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-gray-600">
              Turnos, operación y marca para negocios que ayudan a otros a verse, sentirse o
              rendir mejor.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full bg-black p-2 text-white transition hover:opacity-70"
              >
                <FaInstagram className="h-4 w-4" />
              </a>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="rounded-full bg-black p-2 text-white transition hover:opacity-70"
              >
                <FaTiktok className="h-4 w-4" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="rounded-full bg-black p-2 text-white transition hover:opacity-70"
              >
                <FaWhatsapp className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-black uppercase">PLATAFORMA</h3>
            <nav aria-label="Navegación de plataforma">
              {negociosPlatformLinks.map((link) => (
                <a
                  key={`platform-${link.id}`}
                  href={`#${link.id}`}
                  className="mb-2 block text-sm text-gray-600 transition hover:text-black"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-black uppercase">COMPAÑÍA</h3>
            <nav aria-label="Navegación de compañía">
              {negociosCompanyLinks.map((link) => (
                <a
                  key={`company-${link.id}`}
                  href={`#${link.id}`}
                  className="mb-2 block text-sm text-gray-600 transition hover:text-black"
                >
                  {link.label}
                </a>
              ))}
              <Link href={loginHref} className="mb-2 block text-sm text-gray-600 transition hover:text-black">
                Login
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-5">
          <div className="flex flex-col gap-3 text-[10px] tracking-[0.14em] text-gray-400 uppercase sm:flex-row sm:items-center sm:justify-between">
            <p>© 2024 PRICONPRI. ALL RIGHTS RESERVED.</p>
            <p>MADE FOR THE ELITE.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
