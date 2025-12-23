import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';

export interface WeeklyReportPushStatus {
  id: string;
  snapshotId: string;
  pushedAt: Date;
  pushedBy: string;
}

/**
 * Mark a weekly report as pushed to Google Sheets
 * @param snapshotId - The snapshot ID (e.g., "snapshot_20251219")
 * @param pushedBy - Who pushed it: 'admin' or 'auto-scheduler'
 */
export async function markWeeklyReportAsPushed(
  snapshotId: string,
  pushedBy: 'admin' | 'auto-scheduler'
): Promise<WeeklyReportPushStatus> {
  const prisma = getPrismaClient();

  const status = await prisma.weeklyReportPushStatus.upsert({
    where: { snapshotId },
    create: {
      snapshotId,
      pushedAt: new Date(),
      pushedBy,
    },
    update: {
      pushedAt: new Date(),
      pushedBy,
    },
  });

  logger.info({
    snapshotId,
    pushedBy,
    pushedAt: status.pushedAt,
  }, 'Weekly report marked as pushed');

  return status;
}

/**
 * Check if a weekly report has been pushed to Google Sheets
 * @param snapshotId - The snapshot ID to check
 * @returns true if pushed, false otherwise
 */
export async function isWeeklyReportPushed(snapshotId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const status = await prisma.weeklyReportPushStatus.findUnique({
    where: { snapshotId },
  });

  return status !== null;
}

/**
 * Get push status for a weekly report
 * @param snapshotId - The snapshot ID to check
 * @returns Push status or null if not pushed
 */
export async function getWeeklyReportPushStatus(
  snapshotId: string
): Promise<WeeklyReportPushStatus | null> {
  const prisma = getPrismaClient();

  return prisma.weeklyReportPushStatus.findUnique({
    where: { snapshotId },
  });
}
