/**
 * Business hours utility functions for checking open/closed status
 * and filtering available booking dates.
 */

export interface TimeWindow {
    open_time: string;  // "09:00"
    close_time: string; // "18:00"
}

export interface AvailableDate {
    date: string;       // "2026-01-22"
    day_of_week: number;
    is_open: boolean;
    windows: TimeWindow[];
}

export interface OpenStatus {
    is_open_now: boolean;
    current_time: string;
    today_windows: TimeWindow[];
    next_open_time: string | null;
    next_open_today: boolean;
    is_closed_today: boolean;
}

/**
 * Convert time string "HH:mm" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to "HH:mm" string
 */
export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Format time for display (e.g., "9:00 AM")
 */
export function formatTimeDisplay(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Check if a given time falls within any of the provided windows
 */
export function isTimeWithinWindows(time: string, windows: TimeWindow[]): boolean {
    if (!windows || windows.length === 0) return false;
    
    const currentMinutes = timeToMinutes(time);
    
    return windows.some(({ open_time, close_time }) => {
        const openMinutes = timeToMinutes(open_time);
        const closeMinutes = timeToMinutes(close_time);
        
        // Handle overnight windows (close_time < open_time means it goes past midnight)
        if (closeMinutes < openMinutes) {
            return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
        }
        
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    });
}

/**
 * Get the next opening time from windows, given current time
 * Returns null if no more openings today
 */
export function getNextOpenTime(currentTime: string, windows: TimeWindow[]): string | null {
    if (!windows || windows.length === 0) return null;
    
    const currentMinutes = timeToMinutes(currentTime);
    
    // Sort windows by open_time
    const sortedWindows = [...windows].sort(
        (a, b) => timeToMinutes(a.open_time) - timeToMinutes(b.open_time)
    );
    
    // Find the next window that opens after current time
    for (const window of sortedWindows) {
        const openMinutes = timeToMinutes(window.open_time);
        if (openMinutes > currentMinutes) {
            return window.open_time;
        }
    }
    
    return null;
}

/**
 * Get current local time as "HH:mm" string
 */
export function getCurrentTimeString(timezone?: string): string {
    const now = new Date();
    
    if (timezone) {
        try {
            const formatter = new Intl.DateTimeFormat("en-US", {
                timeZone: timezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
            const parts = formatter.formatToParts(now);
            const hour = parts.find(p => p.type === "hour")?.value || "00";
            const minute = parts.find(p => p.type === "minute")?.value || "00";
            return `${hour}:${minute}`;
        } catch {
            // Fall back to local time if timezone is invalid
        }
    }
    
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Get today's date as "YYYY-MM-DD" string
 */
export function getTodayDateString(timezone?: string): string {
    const now = new Date();
    
    if (timezone) {
        try {
            const formatter = new Intl.DateTimeFormat("en-CA", {
                timeZone: timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            return formatter.format(now);
        } catch {
            // Fall back to local date if timezone is invalid
        }
    }
    
    return now.toISOString().split("T")[0];
}

/**
 * Calculate open status from available dates data
 */
export function calculateOpenStatus(
    availableDates: AvailableDate[],
    timezone?: string
): OpenStatus {
    const currentTime = getCurrentTimeString(timezone);
    const today = getTodayDateString(timezone);
    
    const todayData = availableDates.find(d => d.date === today);
    
    if (!todayData || !todayData.is_open || todayData.windows.length === 0) {
        return {
            is_open_now: false,
            current_time: currentTime,
            today_windows: [],
            next_open_time: null,
            next_open_today: false,
            is_closed_today: true,
        };
    }
    
    const isOpenNow = isTimeWithinWindows(currentTime, todayData.windows);
    const nextOpenTime = isOpenNow ? null : getNextOpenTime(currentTime, todayData.windows);
    
    return {
        is_open_now: isOpenNow,
        current_time: currentTime,
        today_windows: todayData.windows,
        next_open_time: nextOpenTime,
        next_open_today: nextOpenTime !== null,
        is_closed_today: false,
    };
}
