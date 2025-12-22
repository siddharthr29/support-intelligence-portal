import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { getPrismaClient } from '../../persistence/prisma-client';
import { validateDateRange } from '../../middleware/request-validator';

/**
 * Partner Intelligence Routes
 * Provides partner-level risk metrics and operational insights
 */

export async function registerPartnerRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all partners with risk metrics
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/leadership/partners', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // Validate date range
      const dateValidation = validateDateRange(request.query.startDate, request.query.endDate);
      if (!dateValidation.valid) {
        return reply.status(400).send({
          success: false,
          error: dateValidation.error,
        });
      }

      // Use query params or fallback to defaults
      const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
      const startDate = request.query.startDate 
        ? new Date(request.query.startDate) 
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const twelveMonthsAgo = startDate;
      const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);

      logger.info({ startDate, endDate }, 'Fetching partners with date range');

      const partners = await prisma.$queryRaw<Array<any>>`
        SELECT 
          c.freshdesk_company_id as partner_id,
          c.name as partner_name,
          COUNT(t.id) as total_tickets_12m,
          COUNT(t.id) FILTER (WHERE t.created_at >= ${thirtyDaysAgo}) as tickets_last_30d,
          COUNT(t.id) FILTER (WHERE t.created_at >= ${sixtyDaysAgo} AND t.created_at < ${thirtyDaysAgo}) as tickets_prev_30d,
          AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) FILTER (WHERE t.status IN (4, 5)) as avg_resolution_hours,
          COUNT(*) FILTER (WHERE t.status IN (2, 3)) as unresolved_count,
          COUNT(*) FILTER (WHERE t.priority = 4) as urgent_tickets,
          COUNT(*) FILTER (WHERE t.priority = 3) as high_tickets,
          COUNT(*) FILTER (WHERE 'data-loss' = ANY(t.tags)) as data_loss_tickets,
          COUNT(*) FILTER (WHERE 'sync-failure' = ANY(t.tags)) as sync_failure_tickets,
          COUNT(*) FILTER (WHERE 'how-to' = ANY(t.tags)) as how_to_tickets,
          COUNT(*) FILTER (WHERE 'training' = ANY(t.tags)) as training_tickets,
          CASE 
            WHEN COUNT(t.id) FILTER (WHERE t.created_at >= ${sixtyDaysAgo} AND t.created_at < ${thirtyDaysAgo}) > 0
            THEN COUNT(t.id) FILTER (WHERE t.created_at >= ${thirtyDaysAgo})::FLOAT /
                 COUNT(t.id) FILTER (WHERE t.created_at >= ${sixtyDaysAgo} AND t.created_at < ${thirtyDaysAgo})
            ELSE NULL
          END as trend_ratio
        FROM company_cache c
        LEFT JOIN ytd_tickets t ON t.company_id = c.freshdesk_company_id
        WHERE (t.created_at >= ${twelveMonthsAgo} AND t.created_at <= ${endDate}) OR t.created_at IS NULL
        GROUP BY c.freshdesk_company_id, c.name
        HAVING COUNT(t.id) > 0
        ORDER BY unresolved_count DESC, urgent_tickets DESC
      `;

      // Convert BigInt values to Numbers for JSON serialization
      const partnersWithNumbers = partners.map(p => ({
        partner_id: Number(p.partner_id),
        partner_name: p.partner_name,
        total_tickets_12m: Number(p.total_tickets_12m),
        tickets_last_30d: Number(p.tickets_last_30d),
        tickets_prev_30d: Number(p.tickets_prev_30d),
        avg_resolution_hours: p.avg_resolution_hours ? Math.round(Number(p.avg_resolution_hours) * 10) / 10 : 0,
        unresolved_count: Number(p.unresolved_count),
        urgent_tickets: Number(p.urgent_tickets),
        high_tickets: Number(p.high_tickets),
        data_loss_tickets: Number(p.data_loss_tickets),
        sync_failure_tickets: Number(p.sync_failure_tickets),
        how_to_tickets: Number(p.how_to_tickets),
        training_tickets: Number(p.training_tickets),
        trend_ratio: p.trend_ratio ? Number(p.trend_ratio) : null,
      }));

      return reply.send({
        success: true,
        data: {
          partners: partnersWithNumbers,
          count: partnersWithNumbers.length,
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

      // Convert BigInt values to Numbers for JSON serialization
      const partnersWithNumbers = topPartners.map(p => ({
        ...p,
        partner_id: p.partner_id ? Number(p.partner_id) : null,
        total_tickets: p.total_tickets ? Number(p.total_tickets) : 0,
        unresolved: p.unresolved ? Number(p.unresolved) : 0,
        urgent: p.urgent ? Number(p.urgent) : 0,
      }));

      return reply.send({
        success: true,
        data: {
          partners: partnersWithNumbers,
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
