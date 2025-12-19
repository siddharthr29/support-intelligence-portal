import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityLogEntry {
  id: string;
  activityType: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

export interface ActivityLogInput {
  activityType: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

/**
 * Log an activity with immutable UUID and timestamp.
 * Activity logs are append-only and cannot be modified.
 */
export async function logActivity(input: ActivityLogInput): Promise<ActivityLogEntry> {
  const prisma = getPrismaClient();
  
  const id = uuidv4();
  const timestamp = new Date();

  const entry = await prisma.activityLog.create({
    data: {
      id,
      activityType: input.activityType,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      userId: input.userId || null,
      timestamp,
    },
  });

  logger.info({
    activityId: id,
    activityType: input.activityType,
    description: input.description,
  }, 'Activity logged');

  return {
    id: entry.id,
    activityType: entry.activityType,
    description: entry.description,
    metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
    timestamp: entry.timestamp,
    userId: entry.userId || undefined,
  };
}

/**
 * Get activity logs with pagination.
 * Logs are returned in reverse chronological order (newest first).
 */
export async function getActivityLogs(
  limit: number = 100,
  offset: number = 0,
  activityType?: string
): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  const prisma = getPrismaClient();

  const where = activityType ? { activityType } : {};

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      id: log.id,
      activityType: log.activityType,
      description: log.description,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      timestamp: log.timestamp,
      userId: log.userId || undefined,
    })),
    total,
  };
}
