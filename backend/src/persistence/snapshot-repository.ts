import { getPrismaClient } from './prisma-client';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { WeeklyMetrics, GroupResolution } from '../analytics';
import type { FreshdeskTicket } from '../services/freshdesk';

const RETENTION_MONTHS = 13;

export interface SnapshotWriteResult {
  readonly success: boolean;
  readonly snapshotId: string;
  readonly alreadyExists: boolean;
  readonly error?: string;
}

export async function snapshotExists(snapshotId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const existing = await prisma.weeklySnapshot.findUnique({
    where: { snapshotId },
    select: { snapshotId: true },
  });

  return existing !== null;
}

export async function writeWeeklySnapshot(
  metrics: WeeklyMetrics,
  tickets: readonly FreshdeskTicket[]
): Promise<SnapshotWriteResult> {
  const prisma = getPrismaClient();

  const exists = await snapshotExists(metrics.snapshotId);
  if (exists) {
    logger.warn({ snapshotId: metrics.snapshotId }, 'Snapshot already exists - idempotent skip');
    return {
      success: true,
      snapshotId: metrics.snapshotId,
      alreadyExists: true,
    };
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + RETENTION_MONTHS);

  try {
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      await tx.weeklySnapshot.create({
        data: {
          snapshotId: metrics.snapshotId,
          weekStartDate: new Date(metrics.weekStartDate),
          weekEndDate: new Date(metrics.weekEndDate),
          timezone: 'Asia/Kolkata',
          version: 1,
          ticketsCreated: metrics.ticketsCreated,
          ticketsResolved: metrics.ticketsResolved,
          ticketsClosed: metrics.ticketsClosed,
          priorityUrgent: metrics.priorityBreakdown.urgent,
          priorityHigh: metrics.priorityBreakdown.high,
          priorityMedium: metrics.priorityBreakdown.medium,
          priorityLow: metrics.priorityBreakdown.low,
          averageResolutionTimeHours: metrics.averageResolutionTimeHours,
          customerMaxTicketsCompanyId: metrics.customerWithMaxTickets?.companyId ?? null,
          customerMaxTicketsCompanyName: metrics.customerWithMaxTickets?.companyName ?? null,
          customerMaxTicketsCount: metrics.customerWithMaxTickets?.ticketCount ?? null,
          seUnresolvedOpen: metrics.unresolvedSnapshot.supportEngineers.open,
          seUnresolvedPending: metrics.unresolvedSnapshot.supportEngineers.pending,
          psUnresolvedOpen: metrics.unresolvedSnapshot.productSupport.open,
          psUnresolvedPending: metrics.unresolvedSnapshot.productSupport.pending,
          psUnresolvedMarkedForRelease: metrics.unresolvedSnapshot.productSupport.markedForRelease,
          expiresAt,
        },
      });

      if (metrics.resolutionByGroup.length > 0) {
        await tx.groupResolution.createMany({
          data: metrics.resolutionByGroup.map((gr: GroupResolution) => ({
            snapshotId: metrics.snapshotId,
            groupId: gr.groupId,
            groupName: gr.groupName,
            ticketsResolved: gr.ticketsResolved,
            ticketsOpen: gr.ticketsOpen,
            ticketsPending: gr.ticketsPending,
          })),
        });
      }

      if (tickets.length > 0) {
        const ticketData = tickets.map((t) => ({
          snapshotId: metrics.snapshotId,
          freshdeskTicketId: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          groupId: t.group_id,
          companyId: t.company_id,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          isEscalated: t.is_escalated,
          tags: [...t.tags],
        }));

        const BATCH_SIZE = 1000;
        for (let i = 0; i < ticketData.length; i += BATCH_SIZE) {
          const batch = ticketData.slice(i, i + BATCH_SIZE);
          await tx.ticketSnapshot.createMany({ data: batch });
        }
      }
    });

    logger.info({ snapshotId: metrics.snapshotId, ticketCount: tickets.length }, 'Weekly snapshot written successfully');

    return {
      success: true,
      snapshotId: metrics.snapshotId,
      alreadyExists: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, snapshotId: metrics.snapshotId }, 'Failed to write weekly snapshot');

    return {
      success: false,
      snapshotId: metrics.snapshotId,
      alreadyExists: false,
      error: errorMessage,
    };
  }
}

export async function getSnapshot(snapshotId: string) {
  const prisma = getPrismaClient();

  return prisma.weeklySnapshot.findUnique({
    where: { snapshotId },
    include: {
      groupResolutions: true,
    },
  });
}

export async function listSnapshots(limit: number = 52) {
  const prisma = getPrismaClient();

  return prisma.weeklySnapshot.findMany({
    orderBy: { weekEndDate: 'desc' },
    take: limit,
    select: {
      snapshotId: true,
      weekStartDate: true,
      weekEndDate: true,
      createdAt: true,
      ticketsCreated: true,
      ticketsResolved: true,
    },
  });
}
