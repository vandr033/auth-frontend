"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import type { ShopStaff } from "@/types/shop";
import { useT } from "@/lib/i18n";

interface TeamSpotlightProps {
    staff: ShopStaff[];
    slug: string;
}

export function TeamSpotlight({ staff, slug }: TeamSpotlightProps) {
    const t = useT();
    const [featuredIndex, setFeaturedIndex] = useState(0);

    if (staff.length === 0) {
        return <p className="text-text-muted">{t("shopHome.teamInfoSoon")}</p>;
    }

    const featured = staff[Math.min(featuredIndex, staff.length - 1)];
    const canBookFeatured = (featured.services?.length ?? 0) > 0;

    return (
        <div className="space-y-6">
            {/* Featured member */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-section md:aspect-auto md:min-h-[400px]">
                    {featured.image_url ? (
                        <img
                            src={getImageUrl(featured.image_url) || undefined}
                            alt={featured.display_name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-7xl font-bold text-text-muted/20">
                            {featured.display_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-center">
                    <h3 className="font-heading text-3xl font-bold text-text-main md:text-4xl">
                        {featured.display_name}
                    </h3>
                    {featured.bio && (
                        <p className="mt-4 text-base leading-relaxed text-text-muted font-body">
                            {featured.bio}
                        </p>
                    )}
                    {canBookFeatured ? (
                        <div className="mt-6">
                            <PrimaryButton asChild>
                                <Link href={`/shop/${slug}/book?staffId=${featured.id}`}>
                                    {t('shopHome.bookWith', { name: featured.display_name.split(" ")[0] })}
                                </Link>
                            </PrimaryButton>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Thumbnails */}
            {staff.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {staff.map((member, index) => (
                        <button
                            key={member.id}
                            onClick={() => setFeaturedIndex(index)}
                            className={cn(
                                "h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-200",
                                index === featuredIndex
                                    ? "border-brand ring-2 ring-brand/30"
                                    : "border-surface-border hover:border-brand/50"
                            )}
                        >
                            {member.image_url ? (
                                <img
                                    src={getImageUrl(member.image_url) || undefined}
                                    alt={member.display_name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-section text-sm font-bold text-text-muted">
                                    {member.display_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
