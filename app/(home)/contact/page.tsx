"use client";

import { useT } from "@/lib/i18n";

export default function ContactPage() {
  const t = useT();
  return (
    <main className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">{t("contact.title")}</h1>
        <p className="mt-4 text-lg text-text-muted">
          {t("contact.description")}
        </p>
      </div>
    </main>
  );
}
