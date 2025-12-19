import { getPrismaClient } from '../../persistence/prisma-client';
import { logger } from '../../utils/logger';

export interface AuditLogEntry {
  action: string;
  userId?: string;
  userEmail?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Write an immutable audit log entry
 * This function NEVER throws - it logs errors but continues
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const prisma = getPrismaClient();
    
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        userEmail: entry.userEmail,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
    
    logger.info({ action: entry.action, userId: entry.userId }, 'Audit log written');
  } catch (error) {
    // CRITICAL: Never throw - audit log failures should not break the application
    logger.error({ error, entry }, 'Failed to write audit log - continuing operation');
    
    // Fallback: Write to file system
    try {
      const fs = await import('fs/promises');
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry,
        error: 'Failed to write to database',
      });
      await fs.appendFile('audit-fallback.log', logEntry + '\n');
    } catch (fsError) {
      logger.error({ fsError }, 'Failed to write audit log to fallback file');
    }
  }
}

/**
 * Query audit logs with filters
 * Returns paginated results
 */
export async function queryAuditLogs(filter: AuditLogFilter = {}): Promise<{
  logs: Array<{
    id: string;
    timestamp: Date;
    action: string;
    userId: string | null;
    userEmail: string | null;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  total: number;
}> {
  const prisma = getPrismaClient();
  
  const where: any = {};
  
  if (filter.action) {
    where.action = filter.action;
  }
  
  if (filter.userId) {
    where.userId = filter.userId;
  }
  
  if (filter.startDate || filter.endDate) {
    where.timestamp = {};
    if (filter.startDate) {
      where.timestamp.gte = filter.startDate;
    }
    if (filter.endDate) {
      where.timestamp.lte = filter.endDate;
    }
  }
  
  const limit = filter.limit || 50;
  const offset = filter.offset || 0;
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}

/**
 * Export all audit logs as JSON
 * WARNING: This can be a large file
 */
export async function exportAuditLogs(): Promise<any[]> {
  const prisma = getPrismaClient();
  
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
  });
  
  logger.info({ count: logs.length }, 'Exported audit logs');
  
  return logs;
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(): Promise<{
  totalLogs: number;
  actionCounts: Record<string, number>;
  oldestLog: Date | null;
  newestLog: Date | null;
}> {
  const prisma = getPrismaClient();
  
  const [totalLogs, actionGroups, oldest, newest] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
    }),
    prisma.auditLog.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
  ]);
  
  const actionCounts: Record<string, number> = {};
  for (const group of actionGroups) {
    actionCounts[group.action] = group._count.action;
  }
  
  return {
    totalLogs,
    actionCounts,
    oldestLog: oldest?.timestamp || null,
    newestLog: newest?.timestamp || null,
  };
}
