export function generateSnapshotId(weekEndDate: Date): string {
  const year = weekEndDate.getFullYear();
  const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
  const day = String(weekEndDate.getDate()).padStart(2, '0');

  return `snapshot_${year}${month}${day}`;
}

export function getWeekBoundaries(referenceDate: Date, timezone: string): {
  weekStart: Date;
  weekEnd: Date;
} {
  const date = new Date(referenceDate);

  const dayOfWeek = date.getDay();
  const daysToFriday = (5 - dayOfWeek + 7) % 7;
  const daysFromLastFriday = daysToFriday === 0 ? 0 : 7 - daysToFriday;

  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() - daysFromLastFriday);
  weekEnd.setHours(16, 30, 0, 0);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 7);

  return { weekStart, weekEnd };
}

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
