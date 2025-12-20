import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { getPrismaClient } from '../../persistence/prisma-client';

/**
 * Social Sector Support Metrics Routes
 * Metrics that matter for NGO/social-sector deployments
 */

export async function registerMetricsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get leadership metrics summary
  fastify.get('/api/leadership/metrics/summary', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // Fallback: Calculate metrics directly if view doesn't exist
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        longUnresolvedBlockers,
        dataLossIncidents,
        howToVolume,
        trainingRequests,
        slaBreaches,
        currentBacklog,
        totalTickets,
        avgResolution
      ] = await Promise.all([
        // Long unresolved blockers
        prisma.ytdTicket.count({
          where: {
            status: { in: [2, 3] },
            priority: { gte: 3 },
            updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // Data loss incidents
        prisma.ytdTicket.count({
          where: {
            tags: { has: 'data-loss' },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // How-to volume
        prisma.ytdTicket.count({
          where: {
            tags: { has: 'how-to' },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // Training requests
        prisma.ytdTicket.count({
          where: {
            tags: { has: 'training' },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // SLA breaches
        prisma.ytdTicket.count({
          where: {
            priority: 4,
            status: { in: [2, 3] },
            updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // Current backlog
        prisma.ytdTicket.count({
          where: {
            status: { in: [2, 3] },
          },
        }),
        // Total tickets last 30 days
        prisma.ytdTicket.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        // Average resolution hours
        prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
          SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
          FROM ytd_tickets
          WHERE created_at >= ${thirtyDaysAgo}
            AND status IN (4, 5)
        `
      ]);

      const summary = {
        long_unresolved_blockers: longUnresolvedBlockers,
        data_loss_incidents: dataLossIncidents,
        how_to_volume: howToVolume,
        training_requests: trainingRequests,
        sla_breaches: slaBreaches,
        current_backlog: currentBacklog,
        total_tickets_30d: totalTickets,
        avg_resolution_hours: avgResolution[0]?.avg_hours || 0,
      };

      return reply.send({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch metrics summary');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve metrics summary',
      });
    }
  });

  // Get program risk metrics
  fastify.get('/api/leadership/metrics/program-risk', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // Long-unresolved operational blockers
      const longUnresolved = await prisma.ytdTicket.findMany({
        where: {
          status: { in: [2, 3] },
          priority: { gte: 3 },
          updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Repeated data loss tickets by partner
      const dataLossPatterns = await prisma.$queryRaw<Array<any>>`
        SELECT 
          company_id,
          COUNT(*) as data_loss_count,
          MAX(created_at) as latest_incident
        FROM ytd_tickets
        WHERE 'data-loss' = ANY(tags)
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY company_id
        HAVING COUNT(*) > 2
        ORDER BY data_loss_count DESC
      `;

      // Compliance/reporting escalations
      const complianceIssues = await prisma.ytdTicket.count({
        where: {
          OR: [
            { tags: { has: 'compliance' } },
            { tags: { has: 'reporting' } },
          ],
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      return reply.send({
        success: true,
        data: {
          long_unresolved_blockers: longUnresolved.map(t => ({
            id: Number(t.freshdeskTicketId),
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            company_id: t.companyId ? Number(t.companyId) : null,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            days_unresolved: Math.floor((Date.now() - t.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
          })),
          data_loss_patterns: dataLossPatterns.map(p => ({
            partner_id: p.company_id ? Number(p.company_id) : null,
            incident_count: Number(p.data_loss_count),
            latest_incident: p.latest_incident,
          })),
          compliance_issues_count: complianceIssues,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch program risk metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve program risk metrics',
      });
    }
  });

  // Get adoption & training metrics
  fastify.get('/api/leadership/metrics/adoption', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // High how-to ticket volume by partner
      const highHowToPartners = await prisma.$queryRaw<Array<any>>`
        SELECT 
          company_id,
          COUNT(*) as how_to_count,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_count
        FROM ytd_tickets
        WHERE 'how-to' = ANY(tags)
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY company_id
        HAVING COUNT(*) > 5
        ORDER BY how_to_count DESC
      `;

      // Training requests
      const trainingRequests = await prisma.ytdTicket.count({
        where: {
          tags: { has: 'training' },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      // Silent drop-offs (no reply >48 hours)
      const silentDropoffs = await prisma.ytdTicket.count({
        where: {
          status: { in: [2, 3] },
          updatedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      return reply.send({
        success: true,
        data: {
          high_how_to_partners: highHowToPartners.map(p => ({
            partner_id: p.company_id ? Number(p.company_id) : null,
            how_to_count: Number(p.how_to_count),
            recent_count: Number(p.recent_count),
          })),
          training_requests_30d: trainingRequests,
          silent_dropoffs_7d: silentDropoffs,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch adoption metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve adoption metrics',
      });
    }
  });

  // Get platform reliability metrics
  fastify.get('/api/leadership/metrics/reliability', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // Daily ticket volume for spike detection
      const dailyVolume = await prisma.$queryRaw<Array<any>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as ticket_count
        FROM ytd_tickets
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const avgDaily = dailyVolume.reduce((sum, d) => sum + Number(d.ticket_count), 0) / dailyVolume.length;
      const spikes = dailyVolume.filter(d => Number(d.ticket_count) > avgDaily * 3);

      // Critical SLA breaches (urgent tickets >24h unresolved)
      const slaBreaches = await prisma.ytdTicket.count({
        where: {
          priority: 4,
          status: { in: [2, 3] },
          updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      return reply.send({
        success: true,
        data: {
          avg_daily_tickets: Math.round(avgDaily),
          incident_spikes: spikes.map(s => ({
            date: s.date,
            ticket_count: Number(s.ticket_count),
            spike_ratio: (Number(s.ticket_count) / avgDaily).toFixed(2),
          })),
          sla_breaches_30d: slaBreaches,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch reliability metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve reliability metrics',
      });
    }
  });

  // Get support capacity metrics
  fastify.get('/api/leadership/metrics/capacity', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      // Weekly backlog trend
      const weeklyBacklog = await prisma.$queryRaw<Array<any>>`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) FILTER (WHERE status IN (2, 3)) as unresolved_count,
          COUNT(*) as total_count
        FROM ytd_tickets
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
      `;

      // Resolution time trend
      const resolutionTrend = await prisma.$queryRaw<Array<any>>`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_resolution_hours
        FROM ytd_tickets
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
          AND status IN (4, 5)
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
      `;

      // Reopen frequency
      const reopenCount = await prisma.ytdTicket.count({
        where: {
          tags: { has: 'reopened' },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      return reply.send({
        success: true,
        data: {
          weekly_backlog: weeklyBacklog.map(w => ({
            week: w.week,
            unresolved: Number(w.unresolved_count),
            total: Number(w.total_count),
          })),
          resolution_trend: resolutionTrend.map(w => ({
            week: w.week,
            avg_hours: Number(w.avg_resolution_hours).toFixed(2),
          })),
          reopened_tickets_30d: reopenCount,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch capacity metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve capacity metrics',
      });
    }
  });

  logger.info('Social sector metrics routes registered');
}
