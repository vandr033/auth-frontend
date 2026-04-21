"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";
import { ShareButton } from "@/components/shop/ShareButton";
import type { PublicGroupClass, PublicGroupClassSession, PublicGroupEvent } from "@/app/shop/lib/groupReservationsApi";
import {
  formatGroupDateTime,
  formatGroupMoney,
  getClassNextSession,
  getGroupItemImage,
  getRecurrenceSummary,
  getStaffDisplayName,
  getVisibleStaffAssignments,
  isEventSoldOut,
} from "@/app/shop/lib/groupReservationsFormat";

type EventCardProps = {
  event: PublicGroupEvent;
  slug: string;
  currency?: string | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function GroupEventCard({ event, slug, currency, t }: EventCardProps) {
  const { locale } = useI18n();
  const image = getGroupItemImage(event);
  const soldOut = isEventSoldOut(event);
  const staff = getVisibleStaffAssignments(event.staff_assignments);

  return (
    <article className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-card">
      <div className="relative h-44 w-full bg-section">
        {image ? (
          <img
            src={getImageUrl(image) || undefined}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
            {t("shopGroup.media.noCover")}
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="outline" className="bg-white/90 text-xs text-text-main">
            {event.is_free ? t("shopGroup.labels.free") : t("shopGroup.labels.paid")}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-lg font-semibold text-text-main">{event.title}</h3>
          <p className="text-sm text-text-muted">
            {event.is_free ? t("shopGroup.labels.free") : formatGroupMoney(event.price_cents, currency)}
          </p>
        </div>

        <div className="space-y-1 text-sm text-text-muted">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatGroupDateTime(event.start_at, locale)}
          </p>
          {event.location_text ? (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location_text}</span>
            </p>
          ) : null}
        </div>

        {staff.length > 0 ? (
          <p className="line-clamp-1 text-xs text-text-muted">
            {t("shopGroup.fields.staff")}: {staff.map((item) => getStaffDisplayName(item)).join(", ")}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button asChild className="flex-1 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}/events/${event.id}`}>{t("shopGroup.actions.viewEvent")}</Link>
          </Button>
          <ShareButton
            title={event.title}
            url={typeof window !== "undefined" ? `${window.location.origin}/shop/${slug}/events/${event.id}` : ""}
            size="icon"
            variant="outline"
          />
        </div>
      </div>
    </article>
  );
}

type ClassCardProps = {
  groupClass: PublicGroupClass;
  sessions: PublicGroupClassSession[];
  slug: string;
  currency?: string | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function GroupClassCard({ groupClass, sessions, slug, currency, t }: ClassCardProps) {
  const { locale } = useI18n();
  const image = getGroupItemImage(groupClass);
  const staff = getVisibleStaffAssignments(groupClass.staff_assignments);
  const nextSession = getClassNextSession(sessions);

  return (
    <article className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-card">
      <div className="relative h-44 w-full bg-section">
        {image ? (
          <img
            src={getImageUrl(image) || undefined}
            alt={groupClass.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
            {t("shopGroup.media.noCover")}
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="outline" className="bg-white/90 text-xs text-text-main">
            {t(`shopGroup.pricing.${groupClass.pricing_mode}`)}
          </Badge>
          {groupClass.price_cents > 0 && (
            <Badge variant="outline" className="bg-white/90 text-xs text-text-main">
              {formatGroupMoney(groupClass.price_cents, currency)}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-lg font-semibold text-text-main">{groupClass.title}</h3>
          <p className="text-sm text-text-muted">{t(`shopGroup.pricing.${groupClass.pricing_mode}`)}</p>
        </div>

        <div className="space-y-1 text-sm text-text-muted">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {getRecurrenceSummary(groupClass.recurrence_type, groupClass.recurrence_config, t)}
          </p>
          {nextSession ? (
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("shopGroup.classes.nextSession", { value: formatGroupDateTime(nextSession.start_at, locale) })}
            </p>
          ) : (
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("shopGroup.classes.noUpcomingSessions")}
            </p>
          )}
          {groupClass.capacity_visible ? (
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("shopGroup.classes.capacityPerSession", {
                value: groupClass.max_capacity_per_session,
              })}
            </p>
          ) : null}
        </div>

        {staff.length > 0 ? (
          <p className="line-clamp-1 text-xs text-text-muted">
            {t("shopGroup.fields.staff")}: {staff.map((item) => getStaffDisplayName(item)).join(", ")}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button asChild className="flex-1 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}/classes/${groupClass.id}`}>{t("shopGroup.actions.viewClass")}</Link>
          </Button>
          <ShareButton
            title={groupClass.title}
            url={typeof window !== "undefined" ? `${window.location.origin}/shop/${slug}/classes/${groupClass.id}` : ""}
            size="icon"
            variant="outline"
          />
        </div>
      </div>
    </article>
  );
}
