import { getPrismaClient } from '../persistence';
import { logger } from '../utils';

interface ErrorMetadata {
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Log an error to the database for monitoring
 * Errors are retained for 30 days only
 */
export async function logError(
  message: string,
  source: string,
  statusCode: number = 500,
  metadata?: ErrorMetadata
): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.errorLog.create({
      data: {
        message: message.substring(0, 1000), // Limit message length
        source: source.substring(0, 255),
        statusCode,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error(error, 'Failed to log error to database');
  }
}

/**
 * Get error logs with pagination
 * @param limit Number of logs to return
 * @param offset Offset for pagination
 * @param days Number of days to look back (default 30)
 */
export async function getErrorLogs(
  limit: number = 50,
  offset: number = 0,
  days: number = 30
): Promise<{
  logs: Array<{
    id: number;
    message: string;
    source: string;
    statusCode: number;
    metadata: string | null;
    timestamp: Date;
  }>;
  total: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const prisma = getPrismaClient();
  const [logs, total] = await Promise.all([
    prisma.errorLog.findMany({
      where: {
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.errorLog.count({
      where: {
        timestamp: {
          gte: since,
        },
      },
    }),
  ]);

  return { logs, total };
}

/**
 * Clean up old error logs (older than 30 days)
 * Should be called periodically (e.g., daily)
 */
export async function cleanupOldErrorLogs(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const prisma = getPrismaClient();
  const result = await prisma.errorLog.deleteMany({
    where: {
      timestamp: {
        lt: thirtyDaysAgo,
      },
    },
  });

  if (result.count > 0) {
    logger.info({ deletedCount: result.count }, 'Cleaned up old error logs');
  }

  return result.count;
}

/**
 * Get error statistics for the last N days
 */
export async function getErrorStats(days: number = 7): Promise<{
  totalErrors: number;
  errorsByStatusCode: Record<number, number>;
  errorsBySource: Record<string, number>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const prisma = getPrismaClient();
  const logs = await prisma.errorLog.findMany({
    where: {
      timestamp: {
        gte: since,
      },
    },
    select: {
      statusCode: true,
      source: true,
    },
  });

  const errorsByStatusCode: Record<number, number> = {};
  const errorsBySource: Record<string, number> = {};

  logs.forEach((log) => {
    errorsByStatusCode[log.statusCode] = (errorsByStatusCode[log.statusCode] || 0) + 1;
    
    // Extract base path from source
    const basePath = log.source.split('?')[0];
    errorsBySource[basePath] = (errorsBySource[basePath] || 0) + 1;
  });

  return {
    totalErrors: logs.length,
    errorsByStatusCode,
    errorsBySource,
  };
}
