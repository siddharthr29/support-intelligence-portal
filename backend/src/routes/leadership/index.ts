import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership, requireFounder } from '../../middleware/role-check';
import { logger } from '../../utils/logger';

/**
 * Leadership Intelligence Routes
 * 
 * All routes require authentication + leadership/founder role
 * These routes are completely separate from support engineer dashboards
 */

export async function registerLeadershipRoutes(fastify: FastifyInstance): Promise<void> {
  
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
    const claims = request.user?.customClaims as Record<string, boolean> || {};
    
    const roles = {
      support_engineer: claims.support_engineer === true,
      product_manager: claims.product_manager === true,
      leadership: claims.leadership === true,
      founder: claims.founder === true,
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

  logger.info('Leadership intelligence routes registered');
}
