import type { FastifyInstance, FastifyRequest } from 'fastify';
import { queryAuditLogs, exportAuditLogs, getAuditLogStats } from '../services/audit-log';
import { logger } from '../utils/logger';

export async function registerAuditLogRoutes(fastify: FastifyInstance): Promise<void> {
  
  // GET /api/audit-logs - Query audit logs with filters
  fastify.get<{
    Querystring: {
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/audit-logs', async (request, reply) => {
    try {
      const { action, userId, startDate, endDate, limit, offset } = request.query;
      
      const filter: any = {};
      
      if (action) filter.action = action;
      if (userId) filter.userId = userId;
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);
      if (limit) filter.limit = parseInt(limit);
      if (offset) filter.offset = parseInt(offset);
      
      const result = await queryAuditLogs(filter);
      
      return reply.send({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          page: filter.offset ? Math.floor(filter.offset / (filter.limit || 50)) + 1 : 1,
          pageSize: filter.limit || 50,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to query audit logs');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
  
  // GET /api/audit-logs/export - Export all audit logs as JSON
  fastify.get('/api/audit-logs/export', async (_request, reply) => {
    try {
      const logs = await exportAuditLogs();
      
      // Set headers for file download
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString()}.json"`);
      
      return reply.send({
        success: true,
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        logs,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to export audit logs');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
  
  // GET /api/audit-logs/stats - Get audit log statistics
  fastify.get('/api/audit-logs/stats', async (_request, reply) => {
    try {
      const stats = await getAuditLogStats();
      
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to fetch audit log stats');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
