import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { getPrismaClient } from '../../persistence/prisma-client';

/**
 * Partner Intelligence Routes
 * Provides partner-level risk metrics and operational insights
 */

export async function registerPartnerRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all partners with risk metrics
  fastify.get('/api/leadership/partners', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const partners = await prisma.$queryRaw<Array<any>>`
        SELECT * FROM partner_risk_recent
        ORDER BY unresolved_count DESC, urgent_tickets DESC
      `;

      return reply.send({
        success: true,
        data: {
          partners,
          count: partners.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch partner risk metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve partner metrics',
      });
    }
  });

  // Get top partners by volume
  fastify.get('/api/leadership/partners/top', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const topPartners = await prisma.$queryRaw<Array<any>>`
        SELECT * FROM top_partners_by_volume
      `;

      return reply.send({
        success: true,
        data: {
          partners: topPartners,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch top partners');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve top partners',
      });
    }
  });

  // Get partner details with tickets
  fastify.get<{
    Params: { partnerId: string };
    Querystring: { range?: string };
  }>('/api/leadership/partners/:partnerId', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();
    const partnerId = BigInt(request.params.partnerId);
    const range = request.query.range || '12m';

    try {
      // Get partner info
      const partner = await prisma.companyCache.findUnique({
        where: { freshdeskCompanyId: partnerId },
      });

      if (!partner) {
        return reply.status(404).send({
          success: false,
          error: 'Partner not found',
        });
      }

      // Get tickets based on range
      const rangeDate = range === '3y' 
        ? new Date(Date.now() - 36 * 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);

      const tickets = await prisma.ytdTicket.findMany({
        where: {
          companyId: partnerId,
          createdAt: { gte: rangeDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Calculate metrics
      const metrics = {
        total_tickets: tickets.length,
        unresolved: tickets.filter(t => [2, 3].includes(t.status)).length,
        urgent: tickets.filter(t => t.priority === 4).length,
        high: tickets.filter(t => t.priority === 3).length,
        data_loss: tickets.filter(t => t.tags.includes('data-loss')).length,
        sync_failure: tickets.filter(t => t.tags.includes('sync-failure')).length,
        how_to: tickets.filter(t => t.tags.includes('how-to')).length,
        training: tickets.filter(t => t.tags.includes('training')).length,
      };

      return reply.send({
        success: true,
        data: {
          partner: {
            id: Number(partner.freshdeskCompanyId),
            name: partner.name,
          },
          metrics,
          recent_tickets: tickets.slice(0, 20).map(t => ({
            id: Number(t.freshdeskTicketId),
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            tags: t.tags,
          })),
        },
      });
    } catch (error) {
      logger.error({ error, partnerId }, 'Failed to fetch partner details');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve partner details',
      });
    }
  });

  logger.info('Partner intelligence routes registered');
}
