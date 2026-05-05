"use client";

import Link from "next/link";
import * as React from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteAdminCommercePointOfSale,
  listAdminCommercePointsOfSale,
  type AdminCommercePointOfSale,
} from "@/app/admin/lib/adminCommerceApi";
import {
  DataToolbar,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

function formatTime(time: string) {
  const [hourString, minuteString = "00"] = time.split(":");
  let hours = Number.parseInt(hourString, 10);
  const minutes = minuteString.padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function StorePointsOfSalePage() {
  const t = useT();
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [points, setPoints] = React.useState<AdminCommercePointOfSale[]>([]);
  const [searchValue, setSearchValue] = React.useState("");

  const loadPoints = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPoints(await listAdminCommercePointsOfSale());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("adminStore.pointsOfSale.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  const filteredPoints = React.useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) return points;
    return points.filter((point) =>
      [point.name, point.address, point.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [points, searchValue]);

  const handleDelete = async (point: AdminCommercePointOfSale) => {
    try {
      setDeletingId(point.id);
      await deleteAdminCommercePointOfSale(point.id);
      setPoints((current) => current.filter((entry) => entry.id !== point.id));
      notify.success(t("adminStore.pointsOfSale.deleted"));
    } catch (nextError) {
      notify.error(nextError instanceof Error ? nextError.message : t("adminStore.pointsOfSale.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="cards" rows={3} />;
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner description={error} /> : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("adminStore.pointsOfSale.listTitle")}</CardTitle>
          </div>
          <Link href="/admin/dashboard/store/points-of-sale/new">
            <Button className="bg-admin-brand text-white hover:bg-admin-brand/90">
              <Plus className="mr-2 h-4 w-4" />
              {t("adminStore.pointsOfSale.createAction")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataToolbar
            searchValue={searchValue}
            searchPlaceholder={t("adminStore.pointsOfSale.searchListPlaceholder")}
            onSearchChange={setSearchValue}
            summary={t("adminStore.pointsOfSale.summary", { count: filteredPoints.length })}
          />

          {filteredPoints.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={t("adminStore.pointsOfSale.emptyTitle")}
              description={t("adminStore.pointsOfSale.emptyDescription")}
            />
          ) : (
            <div className="space-y-3">
              {filteredPoints.map((point) => (
                <div key={point.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{point.name}</p>
                        <StatusBadge tone={point.is_active ? "success" : "neutral"} dot>
                          {point.is_active ? t("common.enabled") : t("common.disabled")}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-slate-600">{point.address}</p>
                      <p className="text-sm text-slate-500">
                        {t("adminStore.pointsOfSale.hoursSummary", {
                          openingTime: formatTime(point.opening_time),
                          closingTime: formatTime(point.closing_time),
                        })}
                      </p>
                      {point.notes ? <p className="text-sm text-slate-500">{point.notes}</p> : null}
                      <a
                        href={point.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-medium text-admin-brand hover:underline"
                      >
                        {t("adminStore.pointsOfSale.openMaps")}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/dashboard/store/points-of-sale/${point.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => void handleDelete(point)}
                        disabled={deletingId === point.id}
                      >
                        {deletingId === point.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {t("common.delete")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
