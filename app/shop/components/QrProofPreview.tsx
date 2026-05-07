"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { FileText, X } from "lucide-react";

type QrProofPreviewProps = {
  file: File;
  alt: string;
  removeLabel: string;
  onRemove: () => void;
};

export function QrProofPreview({ file, alt, removeLabel, onRemove }: QrProofPreviewProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="space-y-3 rounded-md border border-surface-border bg-white p-3">
      <div className="overflow-hidden rounded-md border border-surface-border bg-slate-50">
        {previewUrl && isImage ? (
          <img src={previewUrl} alt={alt} className="h-52 w-full object-contain" />
        ) : previewUrl ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-text-muted">
            <FileText className="h-8 w-8" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-text-muted">{file.name}</span>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-text-muted transition hover:bg-slate-100 hover:text-rose-500"
          onClick={onRemove}
          aria-label={removeLabel}
        >
          <X className="h-3 w-3" />
          <span>{removeLabel}</span>
        </button>
      </div>
    </div>
  );
}
