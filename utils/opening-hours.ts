export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface OpeningWindow {
  /**
   * Time in 24h HH:MM format (local time, e.g. "09:30").
   */
  start: string;
  end: string;
}

export type OpeningHours = Record<DayOfWeek, OpeningWindow[]>;

const dayIndexToName: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Checks if a date falls within any opening window for its day.
 * Handles overnight windows where the end time is past midnight.
 */
export const isOpenAt = (
  hours: OpeningHours,
  date: Date = new Date()
): boolean => {
  console.log(hours);
  console.log(date);
  const day = dayIndexToName[date.getDay()];
  
  const windows = hours[day] ?? [];
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return windows.some(({ start, end }) => {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    if (startMinutes === endMinutes) {
      return false;
    }

    if (endMinutes > startMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  });
};
