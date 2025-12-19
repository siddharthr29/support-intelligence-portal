import { FastifyInstance, FastifyRequest } from 'fastify';
import { getErrorLogs, getErrorStats, cleanupOldErrorLogs } from '../services/error-log-service';
import { getPrismaClient } from '../persistence/prisma-client';
import { logger } from '../utils/logger';

interface ErrorLogsQuery {
  limit?: string;
  offset?: string;
  days?: string;
}

export async function registerErrorLogRoutes(fastify: FastifyInstance): Promise<void> {
  // Get error logs with pagination
  fastify.get('/api/error-logs', async (request: FastifyRequest<{ Querystring: ErrorLogsQuery }>, reply) => {
    const limit = Math.min(parseInt(request.query.limit || '50', 10), 100);
    const offset = parseInt(request.query.offset || '0', 10);
    const days = Math.min(parseInt(request.query.days || '30', 10), 30);

    const { logs, total } = await getErrorLogs(limit, offset, days);

    return reply.send({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          message: log.message,
          source: log.source,
          statusCode: log.statusCode,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          timestamp: log.timestamp.toISOString(),
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  });

  // Get error statistics
  fastify.get('/api/error-logs/stats', async (request: FastifyRequest<{ Querystring: { days?: string } }>, reply) => {
    const days = Math.min(parseInt(request.query.days || '7', 10), 30);
    const stats = await getErrorStats(days);

    return reply.send({
      success: true,
      data: stats,
    });
  });

  // Cleanup old logs (admin endpoint)
  fastify.post('/api/error-logs/cleanup', async (_request, reply) => {
    const deletedCount = await cleanupOldErrorLogs();

    return reply.send({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} old error logs`,
      },
    });
  });

  // Clear all error logs (mark as resolved/dismissed)
  fastify.delete('/api/error-logs/clear-all', async (_request, reply) => {
    try {
      const prisma = getPrismaClient();
      const result = await prisma.errorLog.deleteMany({});
      
      logger.info({ deletedCount: result.count }, 'All error logs cleared by admin');

      return reply.send({
        success: true,
        data: {
          deletedCount: result.count,
          message: `Cleared ${result.count} error logs`,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to clear error logs');
      throw error;
    }
  });
}
