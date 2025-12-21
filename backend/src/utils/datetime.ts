/**
 * Centralized Date/Time Utility Module
 * 
 * CRITICAL: All date/time operations across the project MUST use this module
 * to ensure consistency and correctness.
 * 
 * TIMEZONE: All operations use Asia/Kolkata (IST) timezone
 * WEEK DEFINITION: Friday 5pm IST to Friday 5pm IST
 * 
 * This module provides:
 * - Timezone-aware date creation and manipulation
 * - Week boundary calculations (Friday to Friday)
 * - Day-of-week and time-of-day utilities
 * - Date formatting and parsing
 * - Snapshot ID generation
 */

import { setHours, setMinutes, setSeconds, setMilliseconds, addDays, subDays, addWeeks, subWeeks, startOfYear, startOfMonth, endOfMonth, isFriday, previousFriday, nextFriday } from 'date-fns';

// Constants
export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_HOURS = 5.5;
export const IST_OFFSET_MS = IST_OFFSET_HOURS * 60 * 60 * 1000;

// Week definition: Friday 5pm to Friday 5pm
export const WEEK_END_DAY = 5; // Friday (0=Sunday, 5=Friday)
export const WEEK_END_HOUR = 17; // 5pm in 24-hour format
export const WEEK_END_MINUTE = 0;

// Cron job timing (Friday 4:30pm IST for data collection before week ends at 5pm)
export const CRON_JOB_HOUR = 16;
export const CRON_JOB_MINUTE = 30;

/**
 * Get current date/time in IST timezone
 * This is the SINGLE SOURCE OF TRUTH for "now" across the entire application
 * 
 * @returns Date object representing current time in IST
 * 
 * @example
 * const now = getNowIST();
 * console.log(now); // 2025-12-22T00:46:00.000Z (represents 6:16 AM IST)
 */
export function getNowIST(): Date {
  const now = new Date();
  // Convert to IST by using toLocaleString with Asia/Kolkata timezone
  const istString = now.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
  return new Date(istString);
}

/**
 * Get day of week for a date in IST timezone
 * 
 * @param date - Date to get day of week for
 * @returns Day of week (0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday)
 * 
 * @example
 * const day = getDayOfWeekIST(new Date('2025-12-22')); // Returns 0 (Sunday)
 */
export function getDayOfWeekIST(date: Date): number {
  const istString = date.toLocaleString('en-US', { 
    timeZone: IST_TIMEZONE, 
    weekday: 'short' 
  });
  const dayMap: Record<string, number> = { 
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 
  };
  return dayMap[istString] ?? date.getDay();
}

/**
 * Get hour of day for a date in IST timezone (0-23 format)
 * 
 * @param date - Date to get hour for
 * @returns Hour in 24-hour format (0-23)
 * 
 * @example
 * const hour = getHourIST(new Date('2025-12-22T00:46:00Z')); // Returns 6 (6 AM IST)
 */
export function getHourIST(date: Date): number {
  const istString = date.toLocaleString('en-US', { 
    timeZone: IST_TIMEZONE, 
    hour: 'numeric', 
    hour12: false 
  });
  return parseInt(istString, 10);
}

/**
 * Get minute of hour for a date in IST timezone
 * 
 * @param date - Date to get minute for
 * @returns Minute (0-59)
 */
export function getMinuteIST(date: Date): number {
  const istString = date.toLocaleString('en-US', { 
    timeZone: IST_TIMEZONE, 
    minute: 'numeric'
  });
  return parseInt(istString, 10);
}

/**
 * Create a date at a specific time in IST timezone
 * 
 * @param date - Base date
 * @param hour - Hour in IST (0-23)
 * @param minute - Minute (0-59)
 * @param second - Second (0-59), default 0
 * @param millisecond - Millisecond (0-999), default 0
 * @returns Date set to specified time in IST
 */
export function setTimeIST(
  date: Date, 
  hour: number, 
  minute: number, 
  second: number = 0, 
  millisecond: number = 0
): Date {
  let result = setHours(date, hour);
  result = setMinutes(result, minute);
  result = setSeconds(result, second);
  result = setMilliseconds(result, millisecond);
  return result;
}

/**
 * Get the most recent Friday at 5pm IST for a given date
 * 
 * Rules:
 * - If date is Friday: returns that Friday at 5pm
 * - If date is any other day: returns the previous Friday at 5pm
 * 
 * @param date - Reference date
 * @returns Most recent Friday at 5pm IST
 * 
 * @example
 * // Sunday Dec 22, 2025 → Friday Dec 19, 2025 at 5pm
 * const friday = getMostRecentFriday5pmIST(new Date('2025-12-22'));
 * 
 * // Friday Dec 19, 2025 → Friday Dec 19, 2025 at 5pm
 * const friday2 = getMostRecentFriday5pmIST(new Date('2025-12-19'));
 */
export function getMostRecentFriday5pmIST(date: Date): Date {
  let friday: Date;
  
  if (isFriday(date)) {
    friday = date;
  } else {
    friday = previousFriday(date);
  }
  
  // Set to 5pm (17:00) IST
  return setTimeIST(friday, WEEK_END_HOUR, WEEK_END_MINUTE, 0, 0);
}

/**
 * Get the next Friday at 5pm IST after a given date
 * 
 * @param date - Reference date
 * @returns Next Friday at 5pm IST
 * 
 * @example
 * // Sunday Dec 22, 2025 → Friday Dec 26, 2025 at 5pm
 * const nextFri = getNextFriday5pmIST(new Date('2025-12-22'));
 */
export function getNextFriday5pmIST(date: Date): Date {
  const friday = nextFriday(date);
  return setTimeIST(friday, WEEK_END_HOUR, WEEK_END_MINUTE, 0, 0);
}

/**
 * Get week boundaries (Friday 5pm to Friday 5pm) for a given reference date
 * 
 * WEEK DEFINITION:
 * - A week runs from Friday 5pm IST to the next Friday 5pm IST
 * - Example: Dec 19 (Fri 5pm) to Dec 26 (Fri 5pm)
 * 
 * LOGIC:
 * - If it's Friday after 5pm IST: Current week just started (this Fri to next Fri)
 * - If it's any other time: Current week started last Friday
 * 
 * @param referenceDate - Date to calculate week boundaries for (defaults to now)
 * @returns Object with weekStart and weekEnd dates
 * 
 * @example
 * // Sunday Dec 22, 2025, 12:46 AM IST
 * const { weekStart, weekEnd } = getCurrentWeekBoundariesIST();
 * // weekStart: Dec 19, 2025 at 5pm IST
 * // weekEnd: Dec 26, 2025 at 5pm IST
 */
export function getCurrentWeekBoundariesIST(referenceDate: Date = getNowIST()): {
  weekStart: Date;
  weekEnd: Date;
} {
  const now = referenceDate;
  const nowDay = getDayOfWeekIST(now);
  const nowHour = getHourIST(now);
  
  let weekStart: Date;
  
  if (nowDay === WEEK_END_DAY && nowHour >= WEEK_END_HOUR) {
    // It's Friday after 5pm IST - current week just started
    weekStart = getMostRecentFriday5pmIST(now);
  } else {
    // Any other time - current week started last Friday 5pm
    weekStart = getMostRecentFriday5pmIST(now);
  }
  
  const weekEnd = getNextFriday5pmIST(weekStart);
  
  return { weekStart, weekEnd };
}

/**
 * Get week boundaries for a completed week ending on a specific Friday
 * 
 * @param fridayEndDate - Friday that marks the end of the week
 * @returns Object with weekStart (previous Friday 5pm) and weekEnd (this Friday 5pm)
 * 
 * @example
 * // Week ending Dec 19, 2025
 * const { weekStart, weekEnd } = getCompletedWeekBoundariesIST(new Date('2025-12-19'));
 * // weekStart: Dec 12, 2025 at 5pm
 * // weekEnd: Dec 19, 2025 at 5pm
 */
export function getCompletedWeekBoundariesIST(fridayEndDate: Date): {
  weekStart: Date;
  weekEnd: Date;
} {
  const weekEnd = setTimeIST(fridayEndDate, WEEK_END_HOUR, WEEK_END_MINUTE, 0, 0);
  const weekStart = subWeeks(weekEnd, 1);
  
  return { weekStart, weekEnd };
}

/**
 * Generate snapshot ID for a given week end date
 * Format: snapshot_YYYYMMDD
 * 
 * @param weekEndDate - Friday that marks the end of the week
 * @returns Snapshot ID string
 * 
 * @example
 * generateSnapshotId(new Date('2025-12-19')) // Returns "snapshot_20251219"
 */
export function generateSnapshotId(weekEndDate: Date): string {
  const year = weekEndDate.getFullYear();
  const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
  const day = String(weekEndDate.getDate()).padStart(2, '0');
  
  return `snapshot_${year}${month}${day}`;
}

/**
 * Parse snapshot ID to extract date components
 * 
 * @param snapshotId - Snapshot ID string (format: snapshot_YYYYMMDD)
 * @returns Object with year, month, day or null if invalid
 * 
 * @example
 * parseSnapshotId('snapshot_20251219') // Returns { year: 2025, month: 12, day: 19 }
 */
export function parseSnapshotId(snapshotId: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = snapshotId.match(/^snapshot_(\d{4})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }
  
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
  };
}

/**
 * Get start of year in IST
 * 
 * @param date - Reference date (defaults to now)
 * @returns Date representing start of year (Jan 1, 00:00:00 IST)
 */
export function getStartOfYearIST(date: Date = getNowIST()): Date {
  return startOfYear(date);
}

/**
 * Get start of month in IST
 * 
 * @param date - Reference date (defaults to now)
 * @returns Date representing start of month (1st day, 00:00:00 IST)
 */
export function getStartOfMonthIST(date: Date = getNowIST()): Date {
  return startOfMonth(date);
}

/**
 * Get end of month in IST
 * 
 * @param date - Reference date (defaults to now)
 * @returns Date representing end of month (last day, 23:59:59.999 IST)
 */
export function getEndOfMonthIST(date: Date = getNowIST()): Date {
  return endOfMonth(date);
}

/**
 * Convert date to IST string format
 * 
 * @param date - Date to convert
 * @returns ISO string with +05:30 offset
 * 
 * @example
 * toISTString(new Date()) // Returns "2025-12-22T06:16:00.000+05:30"
 */
export function toISTString(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().replace('Z', '+05:30');
}

/**
 * Format date for display in IST timezone
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date string in IST
 * 
 * @example
 * formatDateIST(new Date()) // Returns "Sun, Dec 22, 2025, 06:16 AM"
 */
export function formatDateIST(
  date: Date, 
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  return date.toLocaleString('en-IN', { 
    ...options, 
    timeZone: IST_TIMEZONE 
  });
}

/**
 * Check if a date is within a date range (inclusive)
 * 
 * @param date - Date to check
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (inclusive)
 * @returns true if date is within range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const time = date.getTime();
  return time >= startDate.getTime() && time <= endDate.getTime();
}

/**
 * Get list of week options for dropdown (current week + N previous weeks)
 * 
 * @param numberOfWeeks - Number of previous weeks to include (default 2)
 * @returns Array of week options with labels and boundaries
 * 
 * @example
 * const weeks = getWeekOptionsIST(2);
 * // Returns:
 * // [
 * //   { label: "Current Week (Dec 19 - now)", weekStart: Dec 19 5pm, weekEnd: now },
 * //   { label: "Dec 12 - Dec 19, 2025", weekStart: Dec 12 5pm, weekEnd: Dec 19 5pm },
 * //   { label: "Dec 5 - Dec 12, 2025", weekStart: Dec 5 5pm, weekEnd: Dec 12 5pm }
 * // ]
 */
export function getWeekOptionsIST(numberOfWeeks: number = 2): Array<{
  label: string;
  weekStart: Date;
  weekEnd: Date;
  snapshotId: string;
}> {
  const now = getNowIST();
  const { weekStart: currentWeekStart, weekEnd: currentWeekScheduledEnd } = getCurrentWeekBoundariesIST(now);
  
  const options = [];
  
  // Add current week (in progress)
  options.push({
    label: `Current Week (${formatDateIST(currentWeekStart, { month: 'short', day: 'numeric' })} - now)`,
    weekStart: currentWeekStart,
    weekEnd: now, // Use current time as effective end
    snapshotId: generateSnapshotId(currentWeekScheduledEnd),
  });
  
  // Add previous completed weeks
  for (let i = 1; i <= numberOfWeeks; i++) {
    const weekEnd = subWeeks(currentWeekStart, i);
    const weekStart = subWeeks(weekEnd, 1);
    
    options.push({
      label: `${formatDateIST(weekStart, { month: 'short', day: 'numeric' })} - ${formatDateIST(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`,
      weekStart,
      weekEnd,
      snapshotId: generateSnapshotId(weekEnd),
    });
  }
  
  return options;
}

// Export all date-fns functions that are safe to use (already timezone-agnostic)
export { 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks,
  isFriday,
  previousFriday,
  nextFriday,
  startOfYear,
  startOfMonth,
  endOfMonth,
};
