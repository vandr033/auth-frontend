"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface VariantOption {
    value: string;
    label: string;
    description: string;
    icon?: React.ReactNode;
}

interface VariantSelectorProps {
    options: VariantOption[];
    selected: string;
    onChange: (value: string) => void;
}

export function VariantSelector({ options, selected, onChange }: VariantSelectorProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((option) => {
                const isSelected = selected === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
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
                        {option.icon && (
                            <div className="text-brand">{option.icon}</div>
                        )}
                        <div>
                            <p className={cn(
                                "text-sm font-semibold",
                                isSelected ? "text-brand" : "text-text-main"
                            )}>
                                {option.label}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                                {option.description}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
