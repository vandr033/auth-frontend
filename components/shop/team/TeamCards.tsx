"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { getImageUrl } from "@/utils/image-url";
import type { ShopStaff } from "@/types/shop";
import { useT } from "@/lib/i18n";

interface TeamCardsProps {
    staff: ShopStaff[];
    slug: string;
}

export function TeamCards({ staff, slug }: TeamCardsProps) {
    const t = useT();
    const visibleStaff = staff.filter((member) => (member.services?.length ?? 0) > 0);

    if (visibleStaff.length === 0) {
        return <p className="text-text-muted">{t("shopHome.teamInfoSoon")}</p>;
    }

    return (
        <>
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 md:hidden">
                {visibleStaff.map(member => (
                    <StaffCard key={member.id} member={member} slug={slug} />
                ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
                {visibleStaff.map(member => (
                    <StaffCard key={member.id} member={member} slug={slug} />
                ))}
            </div>
        </>
    );
}

function StaffCard({ member, slug }: { member: ShopStaff; slug: string }) {
    const t = useT();
    const canBook = (member.services?.length ?? 0) > 0;

    return (
        <div className="group relative w-[260px] shrink-0 overflow-hidden rounded-lg border border-surface-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg md:w-auto">
            {/* Photo */}
            <div className="aspect-[3/4] w-full overflow-hidden bg-section">
                {member.image_url ? (
                    <img
                        src={getImageUrl(member.image_url) || undefined}
                        alt={member.display_name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-text-muted/30">
                        {member.display_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info overlay at bottom */}
            <div className="p-4">
                <p className="font-heading text-lg font-semibold text-text-main">
                    {member.display_name}
                </p>
                {member.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted font-body">
                        {member.bio}
                    </p>
                )}
                {canBook ? (
                    <Link
                        href={`/shop/${slug}/book?staffId=${member.id}`}
                        className="mt-3 inline-block text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                    >
                        {(member.resource_type === 'ROOM' || member.resource_type === 'EQUIPMENT')
                            ? t('shopHome.bookThe', { name: member.display_name })
                            : t('shopHome.bookWith', { name: member.display_name.split(" ")[0] })}
                        {' →'}
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
