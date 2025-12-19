import type { FastifyInstance } from 'fastify';
import { dryRunYearlyCleanup, triggerManualCleanup } from '../jobs/yearly-cleanup';
import { logger } from '../utils/logger';
import { writeAuditLog } from '../services/audit-log';

export async function registerCleanupRoutes(fastify: FastifyInstance): Promise<void> {
  
  // GET /api/cleanup/dry-run - Preview what would be deleted
  fastify.get('/api/cleanup/dry-run', async (_request, reply) => {
    try {
      logger.info('Dry run cleanup requested');
      
      const result = await dryRunYearlyCleanup();
      
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Dry run cleanup failed');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
  
  // POST /api/cleanup/trigger - Manual cleanup trigger (admin only)
  fastify.post('/api/cleanup/trigger', async (request, reply) => {
    try {
      logger.warn('Manual cleanup triggered');
      
      // Log the manual trigger
      await writeAuditLog({
        action: 'manual_cleanup_triggered',
        userId: request.headers['x-user-id'] as string,
        userEmail: request.headers['x-user-email'] as string,
        details: {
          triggeredAt: new Date().toISOString(),
          ipAddress: request.ip,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      
      const result = await triggerManualCleanup();
      
      return reply.send({
        success: result.success,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Manual cleanup failed');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
