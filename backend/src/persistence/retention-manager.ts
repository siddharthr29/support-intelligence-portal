import { getPrismaClient } from './prisma-client';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const RETENTION_MONTHS = 13;
const NOTIFICATION_MONTHS = 12;
const GRACE_PERIOD_DAYS = 7;

export interface ExpiringSnapshot {
  readonly snapshotId: string;
  readonly weekEndDate: Date;
  readonly expiresAt: Date;
  readonly daysUntilExpiry: number;
}

export interface RetentionCheckResult {
  readonly expiringSoon: readonly ExpiringSnapshot[];
  readonly expired: readonly string[];
}

export async function checkRetention(): Promise<RetentionCheckResult> {
  const prisma = getPrismaClient();
  const now = new Date();

  const notificationThreshold = new Date();
  notificationThreshold.setMonth(notificationThreshold.getMonth() - NOTIFICATION_MONTHS);

  const expiryThreshold = new Date();
  expiryThreshold.setMonth(expiryThreshold.getMonth() - RETENTION_MONTHS);
  expiryThreshold.setDate(expiryThreshold.getDate() - GRACE_PERIOD_DAYS);

  const expiringSoonSnapshots = await prisma.weeklySnapshot.findMany({
    where: {
      weekEndDate: {
        lte: notificationThreshold,
        gt: expiryThreshold,
      },
    },
    select: {
      snapshotId: true,
      weekEndDate: true,
      expiresAt: true,
    },
    orderBy: { weekEndDate: 'asc' },
  });

  const expiredSnapshots = await prisma.weeklySnapshot.findMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { weekEndDate: { lte: expiryThreshold } },
      ],
    },
    select: { snapshotId: true },
  });

  const expiringSoon: ExpiringSnapshot[] = expiringSoonSnapshots.map((s: { snapshotId: string; weekEndDate: Date; expiresAt: Date | null }) => {
    const expiresAt = s.expiresAt || new Date(s.weekEndDate.getTime() + RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      snapshotId: s.snapshotId,
      weekEndDate: s.weekEndDate,
      expiresAt,
      daysUntilExpiry,
    };
  });

  return {
    expiringSoon,
    expired: expiredSnapshots.map((s: { snapshotId: string }) => s.snapshotId),
  };
}

export async function deleteExpiredSnapshots(): Promise<readonly string[]> {
  const prisma = getPrismaClient();
  const now = new Date();

  const expiryThreshold = new Date();
  expiryThreshold.setMonth(expiryThreshold.getMonth() - RETENTION_MONTHS);
  expiryThreshold.setDate(expiryThreshold.getDate() - GRACE_PERIOD_DAYS);

  const expiredSnapshots = await prisma.weeklySnapshot.findMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { weekEndDate: { lte: expiryThreshold } },
      ],
    },
    select: { snapshotId: true },
  });

  const deletedIds: string[] = [];

  for (const snapshot of expiredSnapshots) {
    try {
      await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
        await tx.retentionAuditLog.create({
          data: {
            snapshotId: snapshot.snapshotId,
            action: 'DELETE',
            details: `Automatic deletion after ${RETENTION_MONTHS} months + ${GRACE_PERIOD_DAYS} day grace period`,
          },
        });

        await tx.weeklySnapshot.delete({
          where: { snapshotId: snapshot.snapshotId },
        });
      });

      deletedIds.push(snapshot.snapshotId);
      logger.info({ snapshotId: snapshot.snapshotId }, 'Expired snapshot deleted (audited)');
    } catch (error) {
      logger.error({ error, snapshotId: snapshot.snapshotId }, 'Failed to delete expired snapshot');
    }
  }

  return deletedIds;
}

export async function getRetentionAuditLogs(snapshotId?: string) {
  const prisma = getPrismaClient();

  return prisma.retentionAuditLog.findMany({
    where: snapshotId ? { snapshotId } : undefined,
    orderBy: { executedAt: 'desc' },
    take: 100,
  });
}
