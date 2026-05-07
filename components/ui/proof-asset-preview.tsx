"use client";

import { ExternalLink, FileText } from "lucide-react";

type ProofAssetPreviewProps = {
  alt: string;
  title: string;
  url: string;
};

function isPdfUrl(url: string) {
  return /\.pdf($|[?#])/i.test(url);
}

export function ProofAssetPreview({ alt, title, url }: ProofAssetPreviewProps) {
  if (isPdfUrl(url)) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <FileText className="h-8 w-8 text-slate-500" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{title}</p>
            <p className="text-sm text-slate-500">PDF</p>
          </div>
        </div>
        <iframe
          src={url}
          title={title}
          className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
        />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-admin-brand hover:underline"
        >
          Open PDF
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-h-80 w-full rounded-lg border border-slate-200 object-contain"
      />
    </div>
  );
}
