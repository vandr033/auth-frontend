"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { fontPairingMap } from "@/utils/themepicker";

interface FontPairingSelectorProps {
    selected: string;
    onChange: (value: string) => void;
}

const pairings = [
    {
        value: "classic",
        label: "Classic",
        description: "Playfair Display + Inter",
        sampleHeading: "Elegant Style",
        sampleBody: "Timeless serif headings with clean sans-serif body text.",
    },
    {
        value: "modern",
        label: "Modern",
        description: "Space Grotesk + DM Sans",
        sampleHeading: "Sharp & Clean",
        sampleBody: "Geometric headings with a contemporary feel.",
    },
    {
        value: "bold",
        label: "Bold",
        description: "Bebas Neue + Roboto",
        sampleHeading: "MAKE A STATEMENT",
        sampleBody: "High-impact condensed headings with reliable body text.",
    },
    {
        value: "refined",
        label: "Refined",
        description: "Cormorant Garamond + Lato",
        sampleHeading: "Luxury Feel",
        sampleBody: "Sophisticated serif headings with elegant proportions.",
    },
    {
        value: "friendly",
        label: "Friendly",
        description: "Nunito + Nunito Sans",
        sampleHeading: "Warm & Inviting",
        sampleBody: "Rounded, approachable fonts for a welcoming vibe.",
    },
];

export function FontPairingSelector({ selected, onChange }: FontPairingSelectorProps) {
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
                                ? "border-brand bg-brand/5 shadow-sm"
                                : "border-surface-border hover:border-brand/40"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                                <Check className="h-3 w-3" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <p
                                className="text-lg font-bold text-text-main leading-tight"
                                style={{ fontFamily: fonts?.heading }}
                            >
                                {pairing.sampleHeading}
                            </p>
                            <p
                                className="text-xs text-text-muted"
                                style={{ fontFamily: fonts?.body }}
                            >
                                {pairing.sampleBody}
                            </p>
                        </div>
                        <div className="mt-auto pt-2 border-t border-surface-border">
                            <p className={cn(
                                "text-xs font-semibold",
                                isSelected ? "text-brand" : "text-text-main"
                            )}>
                                {pairing.label}
                            </p>
                            <p className="text-[10px] text-text-muted">{pairing.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
