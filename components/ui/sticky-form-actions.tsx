"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StickyActionBarProps = {
  children: React.ReactNode;
  show?: boolean;
  statusLabel?: React.ReactNode;
  statusTone?: "neutral" | "dirty" | "success" | "error";
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
};

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
  statusLabel?: React.ReactNode;
  statusTone?: StickyActionBarProps["statusTone"];
}

const statusToneClasses: Record<NonNullable<StickyActionBarProps["statusTone"]>, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  dirty: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StickyActionBar({
  children,
  show = true,
  statusLabel,
  statusTone = "neutral",
  className,
  contentClassName,
  actionsClassName,
}: StickyActionBarProps) {
  if (!show) return null;

  return (
    <>
      <div className="h-24 sm:h-20" aria-hidden="true" />

      <div
        className={cn(
          "admin-sticky-actions fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:left-72",
          className,
        )}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
            contentClassName,
          )}
        >
          <div className="min-w-0 sm:flex-1">
            {statusLabel ? (
              <div
                className={cn(
                  "inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium",
                  statusToneClasses[statusTone],
                )}
              >
                <span className="truncate">{statusLabel}</span>
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "flex w-full flex-col gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-row sm:justify-end",
              actionsClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
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
  statusLabel,
  statusTone,
}: StickyFormActionsProps) {
  return (
    <StickyActionBar show={show} statusLabel={statusLabel} statusTone={statusTone}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type={type}
        onClick={type === "button" ? onSave : undefined}
        disabled={loading || disabled}
        className={cn(
          "flex-1 sm:flex-none",
          !saveClassName && "bg-admin-brand text-white hover:bg-admin-brand-hover",
          saveClassName,
        )}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : saveIcon ? (
          <span className="mr-2 flex items-center">{saveIcon}</span>
        ) : null}
        {loading ? loadingLabel : saveLabel}
      </Button>
    </StickyActionBar>
  );
}
