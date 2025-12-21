/**
 * DEPRECATED: This file is replaced by centralized datetime utilities
 * Import from @/utils/datetime instead
 */

import { 
  generateSnapshotId as generateSnapshotIdNew,
  parseSnapshotId as parseSnapshotIdNew,
  getCurrentWeekBoundariesIST,
} from '../utils/datetime';

// Re-export centralized functions for backward compatibility
export const generateSnapshotId = generateSnapshotIdNew;
export const parseSnapshotId = parseSnapshotIdNew;

/**
 * Get week boundaries using centralized datetime utilities
 * @deprecated Use getCurrentWeekBoundariesIST() from @/utils/datetime instead
 */
export function getWeekBoundaries(referenceDate: Date, timezone: string): {
  weekStart: Date;
  weekEnd: Date;
} {
  // Use centralized datetime utility
  return getCurrentWeekBoundariesIST(referenceDate);
}
