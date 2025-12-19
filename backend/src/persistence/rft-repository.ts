import { getPrismaClient } from './prisma-client';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { RftWeeklyMetrics, RftOrganisationMetrics } from '../services/metabase';

export interface RftSnapshotWriteResult {
  readonly success: boolean;
  readonly snapshotId: string;
  readonly alreadyExists: boolean;
  readonly error?: string;
}

export async function rftSnapshotExists(snapshotId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const existing = await prisma.rftSnapshot.findUnique({
    where: { snapshotId },
    select: { snapshotId: true },
  });

  return existing !== null;
}

export async function writeRftSnapshot(
  snapshotId: string,
  metrics: RftWeeklyMetrics,
  forceRefresh: boolean = false,
  weeklySnapshotId?: string
): Promise<RftSnapshotWriteResult> {
  const prisma = getPrismaClient();

  const exists = await rftSnapshotExists(snapshotId);
  if (exists && !forceRefresh) {
    logger.warn({ snapshotId }, 'RFT snapshot already exists - idempotent skip');
    return {
      success: true,
      snapshotId,
      alreadyExists: true,
    };
  }

  // Delete existing snapshot if force refresh
  if (exists && forceRefresh) {
    logger.info({ snapshotId }, 'Force refresh - deleting existing RFT snapshot');
    await prisma.rftOrganisationSnapshot.deleteMany({ where: { rftSnapshotId: snapshotId } });
    await prisma.rftSnapshot.delete({ where: { snapshotId } });
  }

  try {
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      await tx.rftSnapshot.create({
        data: {
          snapshotId,
          fetchedAt: new Date(metrics.fetchedAt),
          questionId: metrics.questionId,
          totalNewlyReported: metrics.totals.newlyReportedCurrentWeek,
          totalClosuresThisWeek: metrics.totals.closuresThisWeek,
          totalClosedSoFar: metrics.totals.closedRftsSoFar,
          totalOpenRfts: metrics.totals.totalOpenRfts,
          weeklySnapshotId: weeklySnapshotId || null,
        },
      });

      if (metrics.byOrganisation.length > 0) {
        await tx.rftOrganisationSnapshot.createMany({
          data: metrics.byOrganisation.map((org: RftOrganisationMetrics) => ({
            rftSnapshotId: snapshotId,
            organisation: org.organisation,
            newlyReportedCurrentWeek: org.newlyReportedCurrentWeek,
            closuresThisWeek: org.closuresThisWeek,
            closedRftsSoFar: org.closedRftsSoFar,
            totalOpenRfts: org.totalOpenRfts,
          })),
        });
      }
    });

    logger.info({
      snapshotId,
      totalOpenRfts: metrics.totals.totalOpenRfts,
      organisationCount: metrics.byOrganisation.length,
    }, 'RFT snapshot written successfully');

    return {
      success: true,
      snapshotId,
      alreadyExists: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, snapshotId }, 'Failed to write RFT snapshot');

    return {
      success: false,
      snapshotId,
      alreadyExists: false,
      error: errorMessage,
    };
  }
}

export async function getRftSnapshot(snapshotId: string) {
  const prisma = getPrismaClient();

  return prisma.rftSnapshot.findUnique({
    where: { snapshotId },
    include: {
      organisationBreakdown: {
        orderBy: { totalOpenRfts: 'desc' },
      },
    },
  });
}

export async function getLatestRftSnapshot() {
  const prisma = getPrismaClient();

  return prisma.rftSnapshot.findFirst({
    orderBy: { fetchedAt: 'desc' },
    include: {
      organisationBreakdown: {
        orderBy: { totalOpenRfts: 'desc' },
      },
    },
  });
}

export async function listRftSnapshots(limit: number = 52) {
  const prisma = getPrismaClient();

  return prisma.rftSnapshot.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: limit,
    select: {
      snapshotId: true,
      fetchedAt: true,
      totalNewlyReported: true,
      totalClosuresThisWeek: true,
      totalOpenRfts: true,
    },
  });
}
