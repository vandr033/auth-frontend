"use client";

import { useMemo } from "react";
import { useShop } from "@/app/shop/contexts/ShopContext";
import { TeamCards } from "./TeamCards";
import { TeamSpotlight } from "./TeamSpotlight";
import { useT } from "@/lib/i18n";

export function TeamWrapper() {
    const { staff, teamVariant, slug } = useShop();
    const t = useT();

    const sections = useMemo(() => {
        const people = staff.filter((member) => member.resource_type !== "ROOM" && member.resource_type !== "EQUIPMENT");
        const rooms = staff.filter((member) => member.resource_type === "ROOM");
        const equipment = staff.filter((member) => member.resource_type === "EQUIPMENT");

        return [
            people.length > 0
                ? { key: "people", title: t("shopHome.ourPeople"), staff: people }
                : null,
            rooms.length > 0
                ? { key: "rooms", title: t("shopHome.ourRooms"), staff: rooms }
                : null,
            equipment.length > 0
                ? { key: "equipment", title: t("shopHome.ourEquipment"), staff: equipment }
                : null,
        ].filter((section): section is { key: string; title: string; staff: typeof staff } => Boolean(section));
    }, [staff, t]);

    if (sections.length === 0) {
        return teamVariant === "team-spotlight"
            ? <TeamSpotlight staff={[]} slug={slug} />
            : <TeamCards staff={[]} slug={slug} />;
    }

    const showSectionTitles = sections.length > 1;

    return (
        <div className="space-y-10">
            {sections.map((section) => (
                <div key={section.key} className="space-y-4">
                    {showSectionTitles ? (
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                            {section.title}
                        </h3>
                    ) : null}
                    {teamVariant === "team-spotlight" ? (
                        <TeamSpotlight staff={section.staff} slug={slug} />
                    ) : (
                        <TeamCards staff={section.staff} slug={slug} />
                    )}
                </div>
            ))}
        </div>
    );
}
