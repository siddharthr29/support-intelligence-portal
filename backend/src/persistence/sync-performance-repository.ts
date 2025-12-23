import { getPrismaClient } from './prisma-client';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { SyncPerformanceMetrics, SyncPerformanceOrganisationMetrics } from '../services/metabase';

export interface SyncPerformanceSnapshotWriteResult {
  readonly success: boolean;
  readonly snapshotId: string;
  readonly alreadyExists: boolean;
  readonly error?: string;
}

export async function syncPerformanceSnapshotExists(snapshotId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const existing = await prisma.syncPerformanceSnapshot.findUnique({
    where: { snapshotId },
    select: { snapshotId: true },
  });

  return existing !== null;
}

export async function writeSyncPerformanceSnapshot(
  snapshotId: string,
  metrics: SyncPerformanceMetrics,
  forceRefresh: boolean = false
): Promise<SyncPerformanceSnapshotWriteResult> {
  const prisma = getPrismaClient();

  const exists = await syncPerformanceSnapshotExists(snapshotId);
  if (exists && !forceRefresh) {
    logger.warn({ snapshotId }, 'Sync performance snapshot already exists - idempotent skip');
    return {
      success: true,
      snapshotId,
      alreadyExists: true,
    };
  }

  if (exists && forceRefresh) {
    logger.info({ snapshotId }, 'Force refresh - deleting existing sync performance snapshot');
    await prisma.syncPerformanceOrganisation.deleteMany({ where: { syncPerformanceSnapshotId: snapshotId } });
    await prisma.syncPerformanceSnapshot.delete({ where: { snapshotId } });
  }

  try {
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      await tx.syncPerformanceSnapshot.create({
        data: {
          snapshotId,
          fetchedAt: new Date(metrics.fetchedAt),
          questionId: metrics.questionId,
          totalOrganisations: metrics.totals.totalOrganisations,
          avgSuccessRate: metrics.totals.avgSuccessRate,
          avgUsabilityScore: metrics.totals.avgUsabilityScore,
        },
      });

      if (metrics.byOrganisation.length > 0) {
        await tx.syncPerformanceOrganisation.createMany({
          data: metrics.byOrganisation.map((org: SyncPerformanceOrganisationMetrics) => ({
            syncPerformanceSnapshotId: snapshotId,
            sNo: org.sNo,
            organisationName: org.organisationName,
            totalSyncs: org.totalSyncs,
            successfulSyncs: org.successfulSyncs,
            failedSyncs: org.incompleteSyncs,
            successRate: org.successRate,
            usabilityScore: org.usabilityScore,
            rank: org.rank,
          })),
        });
      }
    });

    logger.info({
      snapshotId,
      totalOrganisations: metrics.totals.totalOrganisations,
      avgUsabilityScore: metrics.totals.avgUsabilityScore.toFixed(2),
    }, 'Sync performance snapshot written successfully');

    return {
      success: true,
      snapshotId,
      alreadyExists: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, snapshotId }, 'Failed to write sync performance snapshot');

    return {
      success: false,
      snapshotId,
      alreadyExists: false,
      error: errorMessage,
    };
  }
}

export async function getSyncPerformanceSnapshot(snapshotId: string) {
  const prisma = getPrismaClient();

  return prisma.syncPerformanceSnapshot.findUnique({
    where: { snapshotId },
    include: {
      organisationBreakdown: {
        orderBy: { rank: 'asc' },
      },
    },
  });
}

export async function getLatestSyncPerformanceSnapshot() {
  const prisma = getPrismaClient();

  return prisma.syncPerformanceSnapshot.findFirst({
    orderBy: { fetchedAt: 'desc' },
    include: {
      organisationBreakdown: {
        orderBy: { rank: 'asc' },
      },
    },
  });
}

export async function listSyncPerformanceSnapshots(limit: number = 52) {
  const prisma = getPrismaClient();

  return prisma.syncPerformanceSnapshot.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: limit,
    select: {
      snapshotId: true,
      fetchedAt: true,
      totalOrganisations: true,
      avgSuccessRate: true,
      avgUsabilityScore: true,
    },
  });
}
