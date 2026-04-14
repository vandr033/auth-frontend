"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useShop } from "@/app/shop/contexts/ShopContext";

interface FloatingBookCTAProps {
    slug: string;
}

export function FloatingBookCTA({ slug }: FloatingBookCTAProps) {
    const t = useT();
    const { modules } = useShop();

    if (!modules.reservations) return null;

    return (
        <Link
            href={`/shop/${slug}/book`}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-brand-hover active:scale-95 md:hidden"
            aria-label={t('common.bookNow')}
        >
            <Calendar className="h-6 w-6 shrink-0" />
        </Link>
    );
}
