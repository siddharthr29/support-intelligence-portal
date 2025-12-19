import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import type { EngineerHoursInput, DerivedEngineerMetrics } from '../analytics';
import { computeEngineerMetrics } from '../analytics';

export async function saveEngineerHours(
  input: EngineerHoursInput,
  ticketsResolvedByEngineer: number
): Promise<DerivedEngineerMetrics> {
  const prisma = getPrismaClient();

  const metrics = computeEngineerMetrics(input, ticketsResolvedByEngineer);

  await prisma.engineerHours.upsert({
    where: {
      snapshotId_engineerName: {
        snapshotId: input.weekSnapshotId,
        engineerName: input.engineerName,
      },
    },
    create: {
      snapshotId: input.weekSnapshotId,
      engineerName: input.engineerName,
      totalHoursWorked: input.totalHoursWorked,
      ticketsResolved: ticketsResolvedByEngineer,
      avgTimePerTicket: metrics.averageTimePerTicketHours,
    },
    update: {
      totalHoursWorked: input.totalHoursWorked,
      ticketsResolved: ticketsResolvedByEngineer,
      avgTimePerTicket: metrics.averageTimePerTicketHours,
    },
  });

  logger.info({
    snapshotId: input.weekSnapshotId,
    engineerName: input.engineerName,
  }, 'Engineer hours saved');

  return metrics;
}

export async function getEngineerHours(snapshotId: string) {
  const prisma = getPrismaClient();

  return prisma.engineerHours.findMany({
    where: { snapshotId },
    orderBy: { engineerName: 'asc' },
  });
}
