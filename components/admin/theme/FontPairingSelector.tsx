"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { fontPairingMap } from "@/utils/themepicker";
import { useT } from "@/lib/i18n";

interface FontPairingSelectorProps {
    selected: string;
    onChange: (value: string) => void;
}

const pairings = [
    {
        value: "classic",
        labelKey: "adminTheme.fontPairingClassicLabel",
        description: "Playfair Display + Inter",
        sampleHeadingKey: "adminTheme.fontPairingClassicHeading",
        sampleBodyKey: "adminTheme.fontPairingClassicBody",
    },
    {
        value: "modern",
        labelKey: "adminTheme.fontPairingModernLabel",
        description: "Space Grotesk + DM Sans",
        sampleHeadingKey: "adminTheme.fontPairingModernHeading",
        sampleBodyKey: "adminTheme.fontPairingModernBody",
    },
    {
        value: "bold",
        labelKey: "adminTheme.fontPairingBoldLabel",
        description: "Bebas Neue + Roboto",
        sampleHeadingKey: "adminTheme.fontPairingBoldHeading",
        sampleBodyKey: "adminTheme.fontPairingBoldBody",
    },
    {
        value: "refined",
        labelKey: "adminTheme.fontPairingRefinedLabel",
        description: "Cormorant Garamond + Lato",
        sampleHeadingKey: "adminTheme.fontPairingRefinedHeading",
        sampleBodyKey: "adminTheme.fontPairingRefinedBody",
    },
    {
        value: "friendly",
        labelKey: "adminTheme.fontPairingFriendlyLabel",
        description: "Nunito + Nunito Sans",
        sampleHeadingKey: "adminTheme.fontPairingFriendlyHeading",
        sampleBodyKey: "adminTheme.fontPairingFriendlyBody",
    },
];

export function FontPairingSelector({ selected, onChange }: FontPairingSelectorProps) {
    const t = useT();

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pairings.map((pairing) => {
                const isSelected = selected === pairing.value;
                const fonts = fontPairingMap[pairing.value];
                return (
                    <button
                        key={pairing.value}
                        type="button"
                        onClick={() => onChange(pairing.value)}
                        className={cn(
                            "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
                            isSelected
                                ? "border-admin-brand bg-admin-brand-soft shadow-sm"
                                : "border-surface-border hover:border-admin-brand/40"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-admin-brand text-white">
                                <Check className="h-3 w-3" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <p
                                className="text-lg font-bold text-text-main leading-tight"
                                style={{ fontFamily: fonts?.heading }}
                            >
                                {t(pairing.sampleHeadingKey)}
                            </p>
                            <p
                                className="text-xs text-text-muted"
                                style={{ fontFamily: fonts?.body }}
                            >
                                {t(pairing.sampleBodyKey)}
                            </p>
                        </div>
                        <div className="mt-auto pt-2 border-t border-surface-border">
                            <p className={cn(
                                "text-xs font-semibold",
                                isSelected ? "text-admin-brand" : "text-text-main"
                            )}>
                                {t(pairing.labelKey)}
                            </p>
                            <p className="text-[10px] text-text-muted">{pairing.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
