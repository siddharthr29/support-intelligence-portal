import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { getPrismaClient } from '../../persistence/prisma-client';

/**
 * Trends Analysis Routes
 * Provides comprehensive ticket pattern analysis
 */

export async function registerTrendsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get ticket type distribution
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/leadership/trends/ticket-types', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
      const startDate = request.query.startDate 
        ? new Date(request.query.startDate) 
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const twelveMonthsAgo = startDate;

      // Categorize tickets by title and tags
      const ticketTypes = await prisma.$queryRaw<Array<any>>`
        SELECT 
          CASE 
            WHEN tags && ARRAY['data-loss', 'sync-failure', 'migration', 'backup'] 
              OR subject ILIKE '%data loss%' OR subject ILIKE '%sync%'
              THEN 'Data Issues'
            WHEN tags && ARRAY['how-to', 'training', 'onboarding'] 
              OR subject ILIKE '%how to%' OR subject ILIKE '%training%'
              THEN 'How-To/Training'
            WHEN tags && ARRAY['bug', 'error', 'crash'] 
              OR subject ILIKE '%error%' OR subject ILIKE '%bug%'
              THEN 'Technical Issues'
            WHEN tags && ARRAY['feature', 'enhancement'] 
              OR subject ILIKE '%feature%' OR subject ILIKE '%request%'
              THEN 'Feature Requests'
            WHEN tags && ARRAY['setup', 'configuration', 'installation'] 
              OR subject ILIKE '%setup%' OR subject ILIKE '%config%'
              THEN 'Configuration'
            WHEN tags && ARRAY['report', 'analytics', 'dashboard'] 
              OR subject ILIKE '%report%' OR subject ILIKE '%analytics%'
              THEN 'Reporting'
            WHEN tags && ARRAY['integration', 'api', 'webhook'] 
              OR subject ILIKE '%integration%' OR subject ILIKE '%api%'
              THEN 'Integration'
            ELSE 'Other'
          END as ticket_type,
          COUNT(*) as count
        FROM ytd_tickets
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY ticket_type
        ORDER BY count DESC
      `;

      // Calculate percentages
      const total = ticketTypes.reduce((sum, t) => sum + Number(t.count), 0);
      const categories = ticketTypes.map(t => ({
        type: t.ticket_type,
        count: Number(t.count),
        percentage: total > 0 ? Math.round((Number(t.count) / total) * 1000) / 10 : 0,
      }));

      // Get monthly breakdown
      const monthlyBreakdown = await prisma.$queryRaw<Array<any>>`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          CASE 
            WHEN tags && ARRAY['data-loss', 'sync-failure', 'migration', 'backup'] 
              OR subject ILIKE '%data loss%' OR subject ILIKE '%sync%'
              THEN 'Data Issues'
            WHEN tags && ARRAY['how-to', 'training', 'onboarding'] 
              OR subject ILIKE '%how to%' OR subject ILIKE '%training%'
              THEN 'How-To/Training'
            WHEN tags && ARRAY['bug', 'error', 'crash'] 
              OR subject ILIKE '%error%' OR subject ILIKE '%bug%'
              THEN 'Technical Issues'
            WHEN tags && ARRAY['feature', 'enhancement'] 
              OR subject ILIKE '%feature%' OR subject ILIKE '%request%'
              THEN 'Feature Requests'
            WHEN tags && ARRAY['setup', 'configuration', 'installation'] 
              OR subject ILIKE '%setup%' OR subject ILIKE '%config%'
              THEN 'Configuration'
            WHEN tags && ARRAY['report', 'analytics', 'dashboard'] 
              OR subject ILIKE '%report%' OR subject ILIKE '%analytics%'
              THEN 'Reporting'
            WHEN tags && ARRAY['integration', 'api', 'webhook'] 
              OR subject ILIKE '%integration%' OR subject ILIKE '%api%'
              THEN 'Integration'
            ELSE 'Other'
          END as ticket_type,
          COUNT(*) as count
        FROM ytd_tickets
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY month, ticket_type
        ORDER BY month, count DESC
      `;

      return reply.send({
        success: true,
        data: {
          categories,
          monthly_breakdown: monthlyBreakdown,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch ticket types');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve ticket type analysis',
      });
    }
  });

  // Get company-wise ticket breakdown
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/leadership/trends/companies', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
      const startDate = request.query.startDate 
        ? new Date(request.query.startDate) 
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const twelveMonthsAgo = startDate;
      const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);

      const companies = await prisma.$queryRaw<Array<any>>`
        SELECT 
          c.freshdesk_company_id as company_id,
          c.name as company_name,
          COUNT(t.id) as total_tickets,
          COUNT(t.id) FILTER (WHERE t.created_at >= ${thirtyDaysAgo}) as tickets_last_30d,
          COUNT(t.id) FILTER (WHERE t.created_at >= ${sixtyDaysAgo} AND t.created_at < ${thirtyDaysAgo}) as tickets_prev_30d,
          AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_resolution_hours,
          COUNT(*) FILTER (WHERE t.status IN (2, 3)) as unresolved_count,
          COUNT(*) FILTER (WHERE tags && ARRAY['data-loss', 'sync-failure']) as data_issues,
          COUNT(*) FILTER (WHERE tags && ARRAY['how-to', 'training']) as how_to_training,
          COUNT(*) FILTER (WHERE tags && ARRAY['bug', 'error']) as technical_issues
        FROM company_cache c
        LEFT JOIN ytd_tickets t ON t.company_id = c.freshdesk_company_id
        WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
        GROUP BY c.freshdesk_company_id, c.name
        HAVING COUNT(t.id) > 0
        ORDER BY total_tickets DESC
        LIMIT 10
      `;

      const companiesWithTrend = companies.map(c => ({
        ...c,
        company_id: Number(c.company_id),
        total_tickets: Number(c.total_tickets),
        tickets_last_30d: Number(c.tickets_last_30d),
        tickets_prev_30d: Number(c.tickets_prev_30d),
        avg_resolution_hours: c.avg_resolution_hours ? Math.round(Number(c.avg_resolution_hours) * 10) / 10 : 0,
        unresolved_count: Number(c.unresolved_count),
        data_issues: Number(c.data_issues),
        how_to_training: Number(c.how_to_training),
        technical_issues: Number(c.technical_issues),
        trend: Number(c.tickets_prev_30d) > 0 
          ? (Number(c.tickets_last_30d) / Number(c.tickets_prev_30d) > 1.2 ? 'increasing' : 
             Number(c.tickets_last_30d) / Number(c.tickets_prev_30d) < 0.8 ? 'decreasing' : 'stable')
          : 'new',
        trend_percentage: Number(c.tickets_prev_30d) > 0
          ? Math.round(((Number(c.tickets_last_30d) - Number(c.tickets_prev_30d)) / Number(c.tickets_prev_30d)) * 100)
          : 0,
      }));

      return reply.send({
        success: true,
        data: {
          companies: companiesWithTrend,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch company trends');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve company analysis',
      });
    }
  });

  // Get tag analysis
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/leadership/trends/tags', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
      const startDate = request.query.startDate 
        ? new Date(request.query.startDate) 
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const tags = await prisma.$queryRaw<Array<any>>`
        SELECT 
          tag,
          COUNT(*) as count
        FROM ytd_tickets,
        UNNEST(tags) as tag
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `;

      return reply.send({
        success: true,
        data: {
          tags: tags.map(t => ({
            tag: t.tag,
            count: Number(t.count),
          })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch tag analysis');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve tag analysis',
      });
    }
  });

  // Get timeline trends
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/api/leadership/trends/timeline', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
      const startDate = request.query.startDate 
        ? new Date(request.query.startDate) 
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const timeline = await prisma.$queryRaw<Array<any>>`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as total_tickets,
          COUNT(*) FILTER (WHERE status IN (4, 5)) as resolved,
          COUNT(*) FILTER (WHERE status IN (2, 3)) as unresolved,
          COUNT(*) FILTER (WHERE priority = 4) as urgent,
          COUNT(*) FILTER (WHERE priority = 3) as high,
          COUNT(*) FILTER (WHERE priority = 2) as medium,
          COUNT(*) FILTER (WHERE priority = 1) as low
        FROM ytd_tickets
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY month
        ORDER BY month
      `;

      return reply.send({
        success: true,
        data: {
          monthly: timeline.map(t => ({
            month: t.month,
            total_tickets: Number(t.total_tickets),
            resolved: Number(t.resolved),
            unresolved: Number(t.unresolved),
            urgent: Number(t.urgent),
            high: Number(t.high),
            medium: Number(t.medium),
            low: Number(t.low),
          })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch timeline trends');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve timeline analysis',
      });
    }
  });
}
