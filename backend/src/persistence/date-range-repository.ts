import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import type { DateRange } from '../utils/date-range';

export interface TicketSnapshotRecord {
  readonly id: string;
  readonly snapshotId: string;
  readonly freshdeskTicketId: number;
  readonly subject: string;
  readonly status: number;
  readonly priority: number;
  readonly groupId: number | null;
  readonly companyId: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isEscalated: boolean;
  readonly tags: string[];
}

export async function getTicketsByDateRange(
  range: DateRange
): Promise<readonly TicketSnapshotRecord[]> {
  const prisma = getPrismaClient();

  logger.info({
    startDate: range.startDateISO,
    endDate: range.endDateISO,
  }, 'Querying tickets by date range');

  const tickets = await prisma.ticketSnapshot.findMany({
    where: {
      createdAt: {
        gte: range.startDate,
        lte: range.endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  logger.info({ count: tickets.length }, 'Tickets retrieved for date range');

  // Convert BigInt fields to Number for JSON serialization
  return tickets.map((t): TicketSnapshotRecord => ({
    id: t.id,
    snapshotId: t.snapshotId,
    freshdeskTicketId: Number(t.freshdeskTicketId),
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    groupId: t.groupId !== null ? Number(t.groupId) : null,
    companyId: t.companyId !== null ? Number(t.companyId) : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    isEscalated: t.isEscalated,
    tags: t.tags,
  }));
}

export async function getSnapshotsByDateRange(range: DateRange) {
  const prisma = getPrismaClient();

  return prisma.weeklySnapshot.findMany({
    where: {
      OR: [
        {
          weekStartDate: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
        {
          weekEndDate: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
      ],
    },
    include: {
      groupResolutions: true,
    },
    orderBy: { weekEndDate: 'desc' },
  });
}

export async function getGroupResolutionsByDateRange(range: DateRange) {
  const prisma = getPrismaClient();

  const snapshots = await prisma.weeklySnapshot.findMany({
    where: {
      weekEndDate: {
        gte: range.startDate,
        lte: range.endDate,
      },
    },
    select: { snapshotId: true },
  });

  const snapshotIds = snapshots.map((s: { snapshotId: string }) => s.snapshotId);

  return prisma.groupResolution.findMany({
    where: {
      snapshotId: { in: snapshotIds },
    },
  });
}
