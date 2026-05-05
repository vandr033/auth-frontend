"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { ImageIcon, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentProofUploaderProps = {
  id: string;
  label: string;
  acceptedTypesLabel: string;
  emptyHelpText: string;
  changeLabel: string;
  removeLabel: string;
  file: File | null;
  error?: string | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
};

export function PaymentProofUploader({
  id,
  label,
  acceptedTypesLabel,
  emptyHelpText,
  changeLabel,
  removeLabel,
  file,
  error,
  disabled = false,
  onFileChange,
}: PaymentProofUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const triggerFilePicker = React.useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      <div
        className={cn(
          "rounded-2xl border border-dashed p-4 transition",
          error ? "border-rose-300 bg-rose-50/60" : "border-surface-border bg-page",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-main">{label}</p>
            <p className="text-xs text-text-muted">{acceptedTypesLabel}</p>
            <p className="text-sm text-text-muted">
              {file ? file.name : emptyHelpText}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={triggerFilePicker}
              disabled={disabled}
            >
              <Upload className="mr-2 h-4 w-4" />
              {file ? changeLabel : label}
            </Button>

            {file ? (
              <Button
                type="button"
                variant="ghost"
                className="text-text-muted hover:text-rose-600"
                onClick={() => onFileChange(null)}
                disabled={disabled}
              >
                <X className="mr-2 h-4 w-4" />
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </div>

        {file ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-surface-border bg-surface">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="h-56 w-full object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-text-muted">
                <ImageIcon className="mr-2 h-5 w-5" />
                <span className="text-sm">{file.name}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
