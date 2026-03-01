"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyFormActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (...args: any[]) => void;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  saveLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  saveIcon?: React.ReactNode;
  saveClassName?: string;
  /** type="submit" for forms, "button" for onClick handlers */
  type?: "submit" | "button";
  /** Only show when true (for conditional save buttons like page-management) */
  show?: boolean;
}

export function StickyFormActions({
  onSave,
  onCancel,
  loading = false,
  disabled = false,
  saveLabel = "Save",
  loadingLabel = "Saving...",
  cancelLabel = "Cancel",
  saveIcon,
  saveClassName,
  type = "button",
  show = true,
}: StickyFormActionsProps) {
  if (!show) return null;

  return (
    <>
      {/* Spacer for mobile so content isn't hidden behind the fixed bar */}
      <div className="h-20 md:hidden" />

      {/* Mobile: fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type={type}
            onClick={type === "button" ? onSave : undefined}
            disabled={loading || disabled}
            className={cn("flex-1", saveClassName)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saveIcon ? (
              <span className="mr-2 flex items-center">{saveIcon}</span>
            ) : null}
            {loading ? loadingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
