import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { requireLeadership } from '../../middleware/role-check';
import { logger } from '../../utils/logger';
import { getPrismaClient } from '../../persistence/prisma-client';

/**
 * Ticket History Routes
 * Provides recent ticket data for CSV export and table display
 */

export async function registerTicketRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get last 30 tickets (for both leadership and support engineers)
  fastify.get('/api/tickets/recent', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const tickets = await prisma.ytdTicket.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          freshdeskTicketId: true,
          subject: true,
          status: true,
          priority: true,
          groupId: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
          tags: true,
        },
      });

      // Get company names
      const companyIds = tickets
        .map(t => t.companyId)
        .filter((id): id is bigint => id !== null);
      
      const companies = await prisma.companyCache.findMany({
        where: {
          freshdeskCompanyId: { in: companyIds },
        },
        select: {
          freshdeskCompanyId: true,
          name: true,
        },
      });

      const companyMap = new Map(
        companies.map(c => [c.freshdeskCompanyId.toString(), c.name])
      );

      const ticketsWithCompany = tickets.map(t => ({
        ticket_id: Number(t.freshdeskTicketId),
        subject: t.subject,
        status: getStatusName(t.status),
        priority: getPriorityName(t.priority),
        company_name: t.companyId ? companyMap.get(t.companyId.toString()) || 'Unknown' : 'No Company',
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        tags: t.tags,
      }));

      return reply.send({
        success: true,
        data: {
          tickets: ticketsWithCompany,
          count: ticketsWithCompany.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch recent tickets');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve recent tickets',
      });
    }
  });
}

function getStatusName(status: number): string {
  const statusMap: Record<number, string> = {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed',
  };
  return statusMap[status] || 'Unknown';
}

function getPriorityName(priority: number): string {
  const priorityMap: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Urgent',
  };
  return priorityMap[priority] || 'Unknown';
}
