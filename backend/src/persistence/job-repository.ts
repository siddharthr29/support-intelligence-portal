import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import type { IngestionJobResult, JobExecutionContext } from '../jobs';

export async function recordJobStart(context: JobExecutionContext): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.jobExecution.create({
    data: {
      jobId: context.jobId,
      status: 'running',
      startedAt: new Date(context.executedAt),
    },
  });

  logger.info({ jobId: context.jobId }, 'Job execution started');
}

export async function recordJobCompletion(
  context: JobExecutionContext,
  result: IngestionJobResult
): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.jobExecution.update({
    where: { jobId: context.jobId },
    data: {
      status: result.success ? 'completed' : 'failed',
      snapshotId: result.snapshotId || null,
      completedAt: new Date(result.completedAt),
      durationMs: result.durationMs,
      error: result.error || null,
      ticketsIngested: result.ticketsIngested,
      groupsIngested: result.groupsIngested,
      companiesIngested: result.companiesIngested,
    },
  });

  logger.info({
    jobId: context.jobId,
    success: result.success,
    snapshotId: result.snapshotId,
  }, 'Job execution recorded');
}

export async function getRecentJobExecutions(limit: number = 10) {
  const prisma = getPrismaClient();

  return prisma.jobExecution.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export async function getJobExecution(jobId: string) {
  const prisma = getPrismaClient();

  return prisma.jobExecution.findUnique({
    where: { jobId },
  });
}
