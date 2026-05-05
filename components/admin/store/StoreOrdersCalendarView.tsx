"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AdminCommerceOrder } from "@/app/admin/lib/adminCommerceApi";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/shared";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LABELS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatusTone(status?: string | null) {
  switch (status) {
    case "PAYMENT_CONFIRMED":
    case "COMPLETED":
    case "ACCEPTED":
    case "READY_FOR_PICKUP":
      return "success" as const;
    case "AWAITING_PAYMENT":
    case "PAYMENT_SUBMITTED":
    case "AWAITING_DELIVERY_COST":
    case "PENDING":
    case "PENDING_REVIEW":
    case "NEW":
    case "PREPARING":
    case "OUT_FOR_DELIVERY":
      return "warning" as const;
    case "CANCELLED":
    case "REJECTED":
    case "REFUNDED":
    case "PAYMENT_REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function getStatusLabel(status: string | null | undefined, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!status) return "";
  const key = `adminStore.statusLabels.${status}`;
  const translated = t(key);
  return translated === key ? status.replaceAll("_", " ") : translated;
}

function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

type StoreOrdersCalendarViewProps = {
  orders: AdminCommerceOrder[];
  onOrderClick: (order: AdminCommerceOrder) => void;
};

export function StoreOrdersCalendarView({ orders, onOrderClick }: StoreOrdersCalendarViewProps) {
  const { t, locale } = useI18n();
  const dateFnsLocale = getDateLocale(locale);
  const weekdayLabels = locale === "es" ? WEEKDAY_LABELS_ES : WEEKDAY_LABELS_EN;
  const today = React.useMemo(() => new Date(), []);

  const scheduledOrders = React.useMemo(
    () =>
      orders.filter((order) => {
        if (!order.scheduled_for) return false;
        const date = new Date(order.scheduled_for);
        return !Number.isNaN(date.getTime()) && date >= today;
      }),
    [orders, today],
  );

  const [currentMonth, setCurrentMonth] = React.useState(() =>
    scheduledOrders[0]?.scheduled_for ? parseISO(scheduledOrders[0].scheduled_for) : today,
  );
  const [selectedDay, setSelectedDay] = React.useState(() =>
    scheduledOrders[0]?.scheduled_for ? parseISO(scheduledOrders[0].scheduled_for) : today,
  );

  React.useEffect(() => {
    if (scheduledOrders.length === 0) return;
    const firstScheduled = parseISO(scheduledOrders[0].scheduled_for!);
    setCurrentMonth(firstScheduled);
    setSelectedDay(firstScheduled);
  }, [scheduledOrders]);

  const monthStart = startOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

  const days = React.useMemo(() => {
    const next: Date[] = [];
    let cursor = calendarStart;
    while (cursor <= calendarEnd) {
      next.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return next;
  }, [calendarEnd, calendarStart]);

  const ordersByDay = React.useMemo(() => {
    const map = new Map<string, AdminCommerceOrder[]>();
    for (const order of scheduledOrders) {
      if (!order.scheduled_for) continue;
      const date = parseISO(order.scheduled_for);
      const key = formatDateKey(date);
      const current = map.get(key) ?? [];
      current.push(order);
      current.sort((left, right) => (left.scheduled_for || "").localeCompare(right.scheduled_for || ""));
      map.set(key, current);
    }
    return map;
  }, [scheduledOrders]);

  const selectedOrders = ordersByDay.get(formatDateKey(selectedDay)) ?? [];

  if (scheduledOrders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {t("adminStore.orders.calendarEmpty")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(monthStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold text-slate-950">
            {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}
          </p>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(monthStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {weekdayLabels.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const key = formatDateKey(day);
            const dayOrders = ordersByDay.get(key) ?? [];
            const isOutsideMonth = !isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[82px] rounded-lg border px-2 py-2 text-left transition-colors",
                  isOutsideMonth
                    ? "border-transparent bg-transparent text-slate-400"
                    : "border-slate-200 bg-white hover:border-slate-300",
                  isSelected && "border-admin-brand bg-admin-brand-soft",
                  isToday && !isSelected && "ring-1 ring-admin-brand/60",
                )}
              >
                <div className={cn("text-sm font-semibold", isToday && "text-admin-brand-soft-text")}>
                  {format(day, "d")}
                </div>
                {dayOrders.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-medium text-slate-500">
                      {t("adminStore.orders.calendarCount", { count: dayOrders.length })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {dayOrders.slice(0, 3).map((order) => (
                        <span
                          key={order.id}
                          className={cn(
                            "h-2 w-2 rounded-full",
                            getStatusTone(order.fulfillment_status) === "success"
                              ? "bg-emerald-500"
                              : getStatusTone(order.fulfillment_status) === "warning"
                                ? "bg-amber-500"
                                : getStatusTone(order.fulfillment_status) === "danger"
                                  ? "bg-rose-500"
                                  : "bg-slate-400",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-950">
            {format(selectedDay, "EEEE d 'de' MMMM", { locale: dateFnsLocale })}
          </p>
          <p className="text-xs text-slate-500">
            {t("adminStore.orders.calendarCount", { count: selectedOrders.length })}
          </p>
        </div>
        {selectedOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {t("adminStore.orders.calendarDayEmpty")}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOrderClick(order)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">{order.order_number}</p>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                  </div>
                  <StatusBadge tone={getStatusTone(order.fulfillment_status)} dot>
                    {getStatusLabel(order.fulfillment_status, t)}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {order.scheduled_for
                    ? format(parseISO(order.scheduled_for), "p", { locale: dateFnsLocale })
                    : t("adminStore.orders.labels.asap")}
                  {" · "}
                  {order.assigned_staff?.display_name || t("adminStore.orders.noAssignee")}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
