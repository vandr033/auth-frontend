"use client";

import React from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface ShareButtonProps {
    title: string;
    text?: string;
    url?: string;
    className?: string;
    variant?: "outline" | "ghost" | "default";
    size?: "default" | "sm" | "icon";
    label?: string;
}

export function ShareButton({
    title,
    text,
    url,
    className,
    variant = "outline",
    size = "sm",
    label,
}: ShareButtonProps) {
    const t = useT();
    const [copied, setCopied] = React.useState(false);

    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

    const handleShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({ title, text, url: shareUrl });
            } catch {
                // User cancelled or error — no action needed
            }
            return;
        }

        // Clipboard fallback
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
    const icon = copied ? <Check className="h-4 w-4" /> : canNativeShare ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />;
    const displayLabel = copied ? t("common.copied") : (label ?? t("common.share"));

    if (size === "icon") {
        return (
            <Button
                variant={variant}
                size="icon"
                className={className}
                onClick={() => void handleShare()}
                title={displayLabel}
            >
                {icon}
            </Button>
        );
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={() => void handleShare()}
        >
            {icon}
            <span className="ml-2">{displayLabel}</span>
        </Button>
    );
}
