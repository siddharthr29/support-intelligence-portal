const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface DateRange {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly startDateISO: string;
  readonly endDateISO: string;
}

export function getDefaultWeekRange(referenceDate: Date = new Date()): DateRange {
  const now = new Date(referenceDate);

  const dayOfWeek = now.getDay();

  const daysFromMonday = (dayOfWeek + 6) % 7;
  const mondayStart = new Date(now);
  mondayStart.setDate(now.getDate() - daysFromMonday);
  mondayStart.setHours(0, 0, 0, 0);

  const fridayEnd = new Date(mondayStart);
  fridayEnd.setDate(mondayStart.getDate() + 4);
  fridayEnd.setHours(16, 30, 0, 0);

  return {
    startDate: mondayStart,
    endDate: fridayEnd,
    startDateISO: mondayStart.toISOString(),
    endDateISO: fridayEnd.toISOString(),
  };
}

export function parseDateRange(
  startDateStr?: string,
  endDateStr?: string
): DateRange {
  if (!startDateStr || !endDateStr) {
    return getDefaultWeekRange();
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)');
  }

  if (startDate > endDate) {
    throw new Error('startDate must be before endDate');
  }

  const maxRangeDays = 400;
  const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  if (diffDays > maxRangeDays) {
    throw new Error(`Date range cannot exceed ${maxRangeDays} days`);
  }

  return {
    startDate,
    endDate,
    startDateISO: startDate.toISOString(),
    endDateISO: endDate.toISOString(),
  };
}

export function toISTString(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().replace('Z', '+05:30');
}

export function formatDateRangeDisplay(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  };

  const startStr = range.startDate.toLocaleString('en-IN', options);
  const endStr = range.endDate.toLocaleString('en-IN', options);

  return `${startStr} to ${endStr}`;
}
