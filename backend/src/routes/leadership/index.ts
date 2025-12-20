import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership, requireFounder } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { registerPartnerRoutes } from './partners';
import { registerMetricsRoutes } from './metrics';
import { generateWeeklySummary } from '../../services/founder-summary';
import { compressOldTickets, getRetentionStats } from '../../services/data-retention';

/**
 * Leadership Intelligence Routes
 * 
 * All routes require authentication + leadership/founder role
 * These routes are completely separate from support engineer dashboards
 */

export async function registerLeadershipRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Register sub-routes
  await registerPartnerRoutes(fastify);
  await registerMetricsRoutes(fastify);
  
  // Health check for leadership routes
  fastify.get('/api/leadership/health', async (_request, reply) => {
    return reply.send({
      success: true,
      message: 'Leadership intelligence API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Get user's roles (for UI to show/hide features)
  fastify.get('/api/leadership/user/roles', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    // Custom claims are at root level of decoded token, not in customClaims property
    const user = request.user as any;
    
    const roles = {
      support_engineer: user?.support_engineer === true,
      product_manager: user?.product_manager === true,
      leadership: user?.leadership === true,
      founder: user?.founder === true,
    };

    return reply.send({
      success: true,
      data: {
        uid: request.user?.uid,
        email: request.user?.email,
        roles,
      },
    });
  });

  // Get available data range (for UI to show coverage period)
  fastify.get('/api/leadership/data-range', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (_request, reply) => {
    const { getPrismaClient } = await import('../../persistence/prisma-client');
    const prisma = getPrismaClient();

    try {
      const result = await prisma.ytdTicket.aggregate({
        _min: { createdAt: true },
        _max: { createdAt: true },
        _count: true,
      });

      const yearCount = await prisma.ytdTicket.groupBy({
        by: ['year'],
        _count: true,
      });

      return reply.send({
        success: true,
        data: {
          earliest_date: result._min.createdAt,
          latest_date: result._max.createdAt,
          total_tickets: result._count,
          years_available: yearCount.map(y => y.year).sort((a, b) => b - a),
          coverage: result._min.createdAt && result._max.createdAt
            ? `${result._min.createdAt.toISOString().split('T')[0]} to ${result._max.createdAt.toISOString().split('T')[0]}`
            : 'No data available',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get data range');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve data range',
      });
    }
  });

  // Get weekly founder summary (leadership and founder)
  fastify.get('/api/leadership/summary/weekly', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (_request, reply) => {
    try {
      const summary = await generateWeeklySummary();
      return reply.send({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate weekly summary');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate weekly summary',
      });
    }
  });

  // Get retention statistics
  fastify.get('/api/leadership/retention/stats', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (_request, reply) => {
    try {
      const stats = await getRetentionStats();
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get retention stats');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve retention statistics',
      });
    }
  });

  // Trigger data compression (dry run)
  fastify.post('/api/leadership/retention/compress-dry-run', {
    preHandler: [authMiddleware, requireFounder],
  }, async (_request, reply) => {
    try {
      const result = await compressOldTickets(true);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to run compression dry-run');
      return reply.status(500).send({
        success: false,
        error: 'Failed to run compression dry-run',
      });
    }
  });

  // Trigger actual data compression (founder only)
  fastify.post('/api/leadership/retention/compress', {
    preHandler: [authMiddleware, requireFounder],
  }, async (_request, reply) => {
    try {
      const result = await compressOldTickets(false);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to compress data');
      return reply.status(500).send({
        success: false,
        error: 'Failed to compress data',
      });
    }
  });

  logger.info('Leadership intelligence routes registered');
}
