"use client";

import { useEffect, useState } from "react";

import {
  getSuperAdminProductFeatures,
  type SuperAdminProductFeatureSection,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader, AdminPageShell, LoadingSkeleton } from "@/components/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

function FeatureCell({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
        enabled
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {enabled ? "Sí" : "No"}
    </span>
  );
}

export default function SuperAdminProductFeaturesPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SuperAdminProductFeatureSection[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await getSuperAdminProductFeatures();
        setSections(response.sections);
      } catch (error) {
        await notify.error(
          error instanceof Error ? error.message : "No pudimos cargar las funciones por producto.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingSkeleton variant="page" rows={5} />;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow={t("adminNav.superAdmin")}
        title="Funciones por producto"
        subtitle="Vista de solo lectura de las funciones disponibles por producto, tier y add-on."
      />

      <div className="grid gap-4">
        {sections.map((section) => {
          if (section.kind === "core") {
            return (
              <Card key={section.productKey} className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-3 pr-4 font-medium">Función</th>
                        <th className="py-3 pr-4 font-medium">Base</th>
                        <th className="py-3 font-medium">Pro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={`${section.productKey}-${row.feature}`} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-4 text-slate-900">{row.feature}</td>
                          <td className="py-3 pr-4"><FeatureCell enabled={row.base} /></td>
                          <td className="py-3"><FeatureCell enabled={row.pro} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          }

          if (section.kind === "comingSoon") {
            return (
              <Card key={section.productKey} className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {section.status}
                  </span>
                  <ul className="grid gap-2 text-sm text-slate-700">
                    {section.features.map((feature) => (
                      <li key={`${section.productKey}-${feature}`}>{feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={section.title} className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-3 pr-4 font-medium">Add-on</th>
                      <th className="py-3 pr-4 font-medium">Funciones</th>
                      <th className="py-3 pr-4 font-medium">Dependencia</th>
                      <th className="py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.addOnKey} className="border-b border-slate-100 align-top last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-900">{row.name}</td>
                        <td className="py-3 pr-4 text-slate-700">{row.features.join(", ")}</td>
                        <td className="py-3 pr-4 text-slate-500">{row.dependency || "Sin dependencia"}</td>
                        <td className="py-3 text-slate-700">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminPageShell>
  );
}
