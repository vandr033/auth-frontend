import { formatCurrencyFromCents } from "@/lib/currency";
import type {
  GroupRecurrenceType,
  GroupStaffAssignment,
  PublicGroupClassSession,
  PublicGroupEvent,
} from "./groupReservationsApi";

export function formatGroupMoney(cents: number, currency?: string | null): string {
  return formatCurrencyFromCents(cents, currency);
}

export function formatGroupDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatGroupDate(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  return new Date(dateIso).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function formatGroupDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${start.toLocaleDateString(undefined, { dateStyle: "medium" })} · ${start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${end.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return `${formatGroupDateTime(startIso)} - ${formatGroupDateTime(endIso)}`;
}

export function getGroupItemImage(item: { cover_image_url?: string | null; thumbnail_url?: string | null }): string | null {
  return item.cover_image_url || item.thumbnail_url || null;
}

export function getVisibleStaffAssignments(assignments: GroupStaffAssignment[] | undefined): GroupStaffAssignment[] {
  if (!assignments) return [];
  return assignments.filter(
    (assignment) =>
      assignment.staff_profile_id !== null ||
      (assignment.display_name && assignment.display_name.trim().length > 0),
  );
}

export function getStaffDisplayName(assignment: GroupStaffAssignment): string {
  return assignment.staff_profile?.display_name || assignment.display_name || "Staff";
}

export function getStaffDisplayPhone(assignment: GroupStaffAssignment): string | null {
  if (assignment.staff_profile_id !== null) return null;
  return assignment.display_phone || null;
}

export function isEventSoldOut(event: PublicGroupEvent): boolean {
  const booked = event.booked_spots_confirmed ?? event._count?.bookings ?? 0;
  return booked >= event.max_capacity;
}

export function getClassNextSession(sessions: PublicGroupClassSession[]): PublicGroupClassSession | null {
  if (sessions.length === 0) return null;
  const now = Date.now();
  return (
    sessions
      .filter((session) => !session.cancelled_at)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .find((session) => new Date(session.start_at).getTime() >= now) || null
  );
}

function summarizeWeekdays(values: number[]): string {
  const normalized = [...new Set(values)]
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    .sort((a, b) => a - b);

  if (normalized.length === 0) return "—";
  return normalized
    .map((value) => {
      const date = new Date(Date.UTC(2024, 0, 7 + value));
      return date.toLocaleDateString(undefined, { weekday: "short" });
    })
    .join(", ");
}

function summarizeMonthdays(values: number[]): string {
  const normalized = [...new Set(values)]
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31)
    .sort((a, b) => a - b);

  if (normalized.length === 0) return "—";
  return normalized.map((value) => String(value)).join(", ");
}

export function getRecurrenceSummary(
  type: GroupRecurrenceType,
  config: Record<string, unknown>,
  t?: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (type === "MONTHLY") {
    const monthdays = Array.isArray(config.monthdays)
      ? config.monthdays.map((item) => Number.parseInt(String(item), 10))
      : [];
    const days = summarizeMonthdays(monthdays);
    return t ? t("shopGroup.recurrence.monthlyDays", { days }) : `Monthly on days ${days}`;
  }

  const weekdays = Array.isArray(config.weekdays)
    ? config.weekdays.map((item) => Number.parseInt(String(item), 10))
    : [];

  if (type === "CUSTOM") {
    const days = summarizeWeekdays(weekdays);
    return t ? t("shopGroup.recurrence.customDays", { days }) : `Custom weekdays: ${days}`;
  }

  const days = summarizeWeekdays(weekdays);
  return t ? t("shopGroup.recurrence.weeklyDays", { days }) : `Weekly on ${days}`;
}
