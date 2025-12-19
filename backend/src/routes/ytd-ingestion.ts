import type { FastifyInstance } from 'fastify';
import { createFreshdeskClient } from '../services/freshdesk';
import { getPrismaClient } from '../persistence/prisma-client';
import { logger } from '../utils/logger';
import { startOfYear } from 'date-fns';

// Track if YTD ingestion is running
let isYtdIngestionRunning = false;
let lastYtdIngestion: Date | null = null;

export async function registerYtdIngestionRoutes(fastify: FastifyInstance): Promise<void> {
  // Get YTD ingestion status
  fastify.get('/api/ytd-ingestion/status', async (_request, reply) => {
    const prisma = getPrismaClient();
    
    // Count YTD tickets in database
    const yearStart = startOfYear(new Date());
    const ytdTicketCount = await prisma.ytdTicket.count({
      where: {
        createdAt: { gte: yearStart },
      },
    });

    return reply.send({
      success: true,
      data: {
        isRunning: isYtdIngestionRunning,
        lastIngestion: lastYtdIngestion?.toISOString() || null,
        ytdTicketCount,
        yearStart: yearStart.toISOString(),
      },
    });
  });

  // Trigger YTD data fetch (admin only, one-time)
  fastify.post('/api/ytd-ingestion/trigger', async (_request, reply) => {
    if (isYtdIngestionRunning) {
      return reply.status(409).send({
        success: false,
        error: 'YTD ingestion is already running. Please wait for it to complete.',
      });
    }

    // Start ingestion in background
    isYtdIngestionRunning = true;
    
    // Don't await - run in background
    runYtdIngestion().finally(() => {
      isYtdIngestionRunning = false;
    });

    return reply.send({
      success: true,
      message: 'YTD ingestion started. This may take several minutes. Check /api/ytd-ingestion/status for progress.',
    });
  });

  // Get YTD stats for yearly report
  fastify.get('/api/ytd-stats', async (request, reply) => {
    const prisma = getPrismaClient();
    const yearStart = startOfYear(new Date());

    const dbTickets = await prisma.ytdTicket.findMany({
      where: {
        createdAt: { gte: yearStart },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Convert BigInt to Number for JSON serialization
    const tickets = dbTickets.map(t => ({
      ...t,
      freshdeskTicketId: Number(t.freshdeskTicketId),
      groupId: t.groupId ? Number(t.groupId) : null,
      companyId: t.companyId ? Number(t.companyId) : null,
    }));

    // Compute stats
    const totalTickets = tickets.length;
    const ticketsOpen = tickets.filter(t => t.status === 2).length;
    const ticketsPending = tickets.filter(t => t.status === 3).length;
    const ticketsResolved = tickets.filter(t => t.status === 4).length;
    const ticketsClosed = tickets.filter(t => t.status === 5).length;

    const urgentTickets = tickets.filter(t => t.priority === 4).length;
    const highTickets = tickets.filter(t => t.priority === 3).length;
    const mediumTickets = tickets.filter(t => t.priority === 2).length;
    const lowTickets = tickets.filter(t => t.priority === 1).length;

    // Monthly breakdown
    const monthlyBreakdown: Record<string, { created: number; resolved: number }> = {};
    tickets.forEach(t => {
      const month = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { created: 0, resolved: 0 };
      }
      monthlyBreakdown[month].created++;
      if (t.status === 4 || t.status === 5) {
        monthlyBreakdown[month].resolved++;
      }
    });

    // Company breakdown
    const companyMap = new Map<number, number>();
    tickets.forEach(t => {
      if (t.companyId) {
        companyMap.set(t.companyId, (companyMap.get(t.companyId) || 0) + 1);
      }
    });
    const companyBreakdown = Array.from(companyMap.entries())
      .map(([companyId, count]) => ({ companyId, ticketCount: count }))
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 20);

    // Group breakdown
    const groupMap = new Map<number, { total: number; resolved: number }>();
    tickets.forEach(t => {
      if (t.groupId) {
        const existing = groupMap.get(t.groupId) || { total: 0, resolved: 0 };
        existing.total++;
        if (t.status === 4 || t.status === 5) existing.resolved++;
        groupMap.set(t.groupId, existing);
      }
    });
    const groupBreakdown = Array.from(groupMap.entries())
      .map(([groupId, stats]) => ({ groupId, ticketCount: stats.total, resolved: stats.resolved }))
      .sort((a, b) => b.ticketCount - a.ticketCount);

    const resolutionRate = totalTickets > 0 
      ? Math.round(((ticketsResolved + ticketsClosed) / totalTickets) * 100) 
      : 0;

    return reply.send({
      success: true,
      data: {
        yearStart: yearStart.toISOString(),
        fetchedAt: new Date().toISOString(),
        totalTickets,
        ticketsOpen,
        ticketsPending,
        ticketsResolved,
        ticketsClosed,
        resolutionRate,
        priorityBreakdown: {
          urgent: urgentTickets,
          high: highTickets,
          medium: mediumTickets,
          low: lowTickets,
        },
        statusBreakdown: {
          open: ticketsOpen,
          pending: ticketsPending,
          resolved: ticketsResolved,
          closed: ticketsClosed,
        },
        monthlyBreakdown,
        companyBreakdown,
        groupBreakdown,
      },
    });
  });
}

async function runYtdIngestion(): Promise<void> {
  const prisma = getPrismaClient();
  const client = createFreshdeskClient();
  const yearStart = startOfYear(new Date());

  logger.info({ yearStart: yearStart.toISOString() }, 'Starting YTD data ingestion');

  try {
    // Fetch all tickets from Jan 1 to now
    const allTickets = await client.getAllTicketsByDateRange(yearStart);
    
    logger.info({ ticketCount: allTickets.length }, 'Fetched YTD tickets from Freshdesk');

    // Filter to only tickets created this year
    const ytdTickets = allTickets.filter(t => new Date(t.created_at) >= yearStart);

    logger.info({ ytdTicketCount: ytdTickets.length }, 'Filtered to YTD created tickets');

    // Clear existing YTD data and insert fresh
    await prisma.ytdTicket.deleteMany({});

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < ytdTickets.length; i += batchSize) {
      const batch = ytdTickets.slice(i, i + batchSize);
      await prisma.ytdTicket.createMany({
        data: batch.map(t => ({
          freshdeskTicketId: BigInt(t.id),
          subject: t.subject || '',
          status: t.status,
          priority: t.priority,
          groupId: t.group_id ? BigInt(t.group_id) : null,
          companyId: t.company_id ? BigInt(t.company_id) : null,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          tags: [...(t.tags || [])],
        })),
        skipDuplicates: true,
      });
      logger.info({ batch: Math.floor(i / batchSize) + 1, inserted: batch.length }, 'Inserted YTD ticket batch');
    }

    lastYtdIngestion = new Date();
    logger.info({ 
      totalIngested: ytdTickets.length,
      completedAt: lastYtdIngestion.toISOString(),
    }, 'YTD ingestion completed successfully');

  } catch (error) {
    logger.error({ error }, 'YTD ingestion failed');
    throw error;
  }
}
