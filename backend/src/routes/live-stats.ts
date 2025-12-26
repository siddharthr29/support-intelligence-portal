import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FRESHDESK_STATUS, FRESHDESK_PRIORITY } from '../services/freshdesk';
import { getPrismaClient } from '../persistence/prisma-client';
import { logger } from '../utils/logger';
import { startOfYear, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Cache for live stats (refresh every 5 minutes)
interface LiveStatsCache {
  data: LiveStats | null;
  lastUpdated: number;
}

interface LiveStats {
  // Total counts
  totalTicketsCreated: number;
  totalTicketsResolved: number;
  totalTicketsClosed: number;
  totalTicketsOpen: number;
  totalTicketsPending: number;
  
  // Priority breakdown
  urgentTickets: number;
  highTickets: number;
  mediumTickets: number;
  lowTickets: number;
  
  // Company breakdown (top 15)
  companyBreakdown: { companyId: number; ticketCount: number; ytdCount: number; weekCount: number }[];
  
  // Group breakdown
  groupBreakdown: { groupId: number; ticketCount: number; open: number; pending: number; resolved: number }[];
  
  // Tags breakdown
  tagsBreakdown: { tag: string; count: number }[];
  
  // Time-based
  ticketsThisYear: number;
  ticketsThisWeek: number;
  ticketsThisMonth: number;
  
  // Resolution rate
  resolutionRate: number;
  
  // Metadata
  fetchedAt: string;
  totalFetched: number;
  
  // Raw ticket data for frontend filtering (lightweight version)
  ticketsSummary?: TicketSummary[];
}

interface TicketSummary {
  id: number;
  created_at: string;
  status: number;
  priority: number;
  group_id: number | null;
  company_id: number | null;
  tags: string[];
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
const MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // Minimum 2 minutes between refreshes
let statsCache: LiveStatsCache = { data: null, lastUpdated: 0 };
let lastRefreshAttempt = 0;

// Cache for ticket summaries
interface TicketsCacheData {
  tickets: TicketSummary[];
  fetchedAt: string;
  totalCount: number;
}
let ticketsCache: { data: TicketsCacheData | null; lastUpdated: number } = { data: null, lastUpdated: 0 };

// Excluded company IDs
const EXCLUDED_COMPANY_IDS = [36000989803]; // Healthchecks

export async function registerLiveStatsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get live stats from Freshdesk
  fastify.get('/api/live-stats', async (_request, reply) => {
    const now = Date.now();
    
    // Return cached data if still valid
    if (statsCache.data && (now - statsCache.lastUpdated) < CACHE_TTL_MS) {
      return reply.send({
        success: true,
        data: statsCache.data,
        cached: true,
      });
    }

    try {
      logger.info('Fetching live stats from Freshdesk');
      const stats = await fetchLiveStats();
      
      statsCache = {
        data: stats,
        lastUpdated: now,
      };

      return reply.send({
        success: true,
        data: stats,
        cached: false,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch live stats');
      
      // Return stale cache if available
      if (statsCache.data) {
        return reply.send({
          success: true,
          data: statsCache.data,
          cached: true,
          stale: true,
        });
      }
      
      throw error;
    }
  });

  // Get week-specific stats for a date range (Friday to Friday)
  // Uses DATABASE for reliability - no Freshdesk API calls
  fastify.get('/api/live-stats/week', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply) => {
    const { startDate, endDate } = request.query;
    
    if (!startDate || !endDate) {
      return reply.status(400).send({
        success: false,
        error: 'startDate and endDate query parameters are required (ISO format)',
      });
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      logger.info({ startDate, endDate }, 'Fetching week-specific stats from YtdTicket table');
      
      // Use YtdTicket table - the main cached data source
      const prisma = getPrismaClient();
      
      // Query tickets that were resolved/closed during the specified week
      const dbTickets = await prisma.ytdTicket.findMany({
        where: {
          // Ticket was resolved/closed during this week
          createdAt: {
            gte: start,
            lte: end,
          },
          status: {
            in: [FRESHDESK_STATUS.RESOLVED, FRESHDESK_STATUS.CLOSED]
          }
        },
      });

      // Debug logging
      logger.info({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalTicketsFound: dbTickets.length,
        ticketIds: dbTickets.map(t => Number(t.freshdeskTicketId)).sort(),
        groupIds: [...new Set(dbTickets.map(t => t.groupId?.toString()).filter(Boolean))],
        productSupportTickets: dbTickets.filter(t => t.groupId === 36000098158n || t.groupId === 36000247508n || t.groupId === 36000441443n).length,
        productSupportTicketIds: dbTickets.filter(t => t.groupId === 36000098158n).map(t => Number(t.freshdeskTicketId))
      }, 'Week stats query results');

      // Map to expected format
      const weekTickets = dbTickets.map(t => ({
        id: Number(t.freshdeskTicketId),
        created_at: t.createdAt.toISOString(),
        status: t.status,
        priority: t.priority,
        group_id: t.groupId ? Number(t.groupId) : null,
        company_id: t.companyId ? Number(t.companyId) : null,
        tags: t.tags || [],
      }));

      // Priority breakdown for the week
      const urgentTickets = weekTickets.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length;
      const highTickets = weekTickets.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length;
      const mediumTickets = weekTickets.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length;
      const lowTickets = weekTickets.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length;

      // Status breakdown for the week
      const resolvedTickets = weekTickets.filter(t => 
        t.status === FRESHDESK_STATUS.RESOLVED || t.status === FRESHDESK_STATUS.CLOSED
      ).length;

      // Group breakdown for the week
      const groupMap = new Map<number, { total: number; open: number; pending: number; resolved: number }>();
      for (const ticket of weekTickets) {
        if (ticket.group_id) {
          // Combine both Product Support groups into one category
          let effectiveGroupId = ticket.group_id;
          if (ticket.group_id === 36000098158 || ticket.group_id === 36000247508 || ticket.group_id === 36000441443) {
            effectiveGroupId = 36000247508; // Use the main Product Support group ID
          }

          if (!groupMap.has(effectiveGroupId)) {
            groupMap.set(effectiveGroupId, { total: 0, open: 0, pending: 0, resolved: 0 });
          }
          const entry = groupMap.get(effectiveGroupId)!;
          entry.total++;
          
          if (ticket.status === FRESHDESK_STATUS.OPEN) entry.open++;
          else if (ticket.status === FRESHDESK_STATUS.PENDING) entry.pending++;
          else if (ticket.status === FRESHDESK_STATUS.RESOLVED || ticket.status === FRESHDESK_STATUS.CLOSED) entry.resolved++;
        }
      }

      const groupBreakdown = Array.from(groupMap.entries())
        .map(([groupId, counts]) => ({
          groupId,
          ticketCount: counts.total,
          open: counts.open,
          pending: counts.pending,
          resolved: counts.resolved,
        }))
        .sort((a, b) => b.ticketCount - a.ticketCount);

      // Company breakdown for the week
      const companyMap = new Map<number, number>();
      for (const ticket of weekTickets) {
        if (ticket.company_id && !EXCLUDED_COMPANY_IDS.includes(ticket.company_id)) {
          companyMap.set(ticket.company_id, (companyMap.get(ticket.company_id) || 0) + 1);
        }
      }

      const companyBreakdown = Array.from(companyMap.entries())
        .map(([companyId, count]) => ({ companyId, ticketCount: count }))
        .sort((a, b) => b.ticketCount - a.ticketCount)
        .slice(0, 10);

      // Tags breakdown for the week
      const tagMap = new Map<string, number>();
      let ticketsWithTags = 0;
      let ticketsWithoutTags = 0;
      for (const ticket of weekTickets) {
        if (ticket.tags && ticket.tags.length > 0) {
          ticketsWithTags++;
          for (const tag of ticket.tags) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        } else {
          ticketsWithoutTags++;
        }
      }

      const tagsBreakdown = Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      return reply.send({
        success: true,
        data: {
          ticketsCreated: weekTickets.length,
          ticketsResolved: resolvedTickets,
          urgentTickets,
          highTickets,
          mediumTickets,
          lowTickets,
          groupBreakdown,
          companyBreakdown,
          tagsBreakdown,
          ticketsWithTags,
          ticketsWithoutTags,
          dateRange: { startDate, endDate },
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      logger.error({ errorMessage, errorStack, errorType: typeof error }, 'Failed to fetch week-specific stats');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        message: 'Failed to fetch week stats',
      });
    }
  });

  // Get all ticket summaries - USE DATABASE CACHE to avoid Freshdesk rate limits
  fastify.get('/api/live-stats/tickets', async (_request, reply) => {
    // Always return from memory cache if available (avoid Freshdesk API)
    if (ticketsCache.data) {
      return reply.send({
        success: true,
        data: ticketsCache.data,
        cached: true,
        message: 'Using cached data. Freshdesk data is refreshed weekly.',
      });
    }

    // If no cache, return empty with message - don't hit Freshdesk API
    // Data will be populated by the weekly scheduled job
    return reply.send({
      success: true,
      data: {
        tickets: [],
        fetchedAt: new Date().toISOString(),
        totalCount: 0,
      },
      cached: false,
      message: 'No cached data available. Use /api/stats for database-backed statistics.',
    });
  });

  // Force refresh live stats (with rate limiting)
  fastify.post('/api/live-stats/refresh', async (_request, reply) => {
    const now = Date.now();
    
    // Rate limit: prevent refresh if last attempt was too recent
    if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_REFRESH_INTERVAL_MS - (now - lastRefreshAttempt)) / 1000);
      return reply.status(429).send({
        success: false,
        error: `Rate limited. Please wait ${waitSeconds} seconds before refreshing again.`,
        cached: true,
        data: statsCache.data,
      });
    }

    try {
      lastRefreshAttempt = now;
      logger.info('Force refreshing live stats from Freshdesk');
      const stats = await fetchLiveStats();
      
      statsCache = {
        data: stats,
        lastUpdated: now,
      };

      return reply.send({
        success: true,
        data: stats,
        message: 'Stats refreshed successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to refresh live stats');
      throw error;
    }
  });
}

async function fetchLiveStats(): Promise<LiveStats> {
  const prisma = getPrismaClient();
  const now = new Date();
  const yearStart = startOfYear(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(now);

  // Fetch all YTD tickets from database (populated by Friday 4:30PM job)
  logger.info({ yearStart: yearStart.toISOString() }, 'Fetching tickets from YtdTicket table');
  
  const dbTickets = await prisma.ytdTicket.findMany();
  
  // Map to expected format
  const allTickets = dbTickets.map(t => ({
    id: Number(t.freshdeskTicketId),
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    status: t.status,
    priority: t.priority,
    group_id: t.groupId ? Number(t.groupId) : null,
    company_id: t.companyId ? Number(t.companyId) : null,
    tags: t.tags || [],
    is_escalated: false,
    subject: t.subject,
  }));
  
  logger.info({ totalTickets: allTickets.length }, 'Fetched all tickets from YtdTicket table');

  // Filter tickets created this year
  const ticketsThisYear = allTickets.filter(t => new Date(t.created_at) >= yearStart);
  const ticketsThisWeek = allTickets.filter(t => new Date(t.created_at) >= weekStart);
  const ticketsThisMonth = allTickets.filter(t => new Date(t.created_at) >= monthStart);

  // Count by status (from all fetched tickets)
  const totalTicketsOpen = allTickets.filter(t => t.status === FRESHDESK_STATUS.OPEN).length;
  const totalTicketsPending = allTickets.filter(t => t.status === FRESHDESK_STATUS.PENDING).length;
  const totalTicketsResolved = allTickets.filter(t => t.status === FRESHDESK_STATUS.RESOLVED).length;
  const totalTicketsClosed = allTickets.filter(t => t.status === FRESHDESK_STATUS.CLOSED).length;

  // Priority breakdown (from tickets created this year)
  const urgentTickets = ticketsThisYear.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length;
  const highTickets = ticketsThisYear.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length;
  const mediumTickets = ticketsThisYear.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length;
  const lowTickets = ticketsThisYear.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length;

  // Company breakdown (excluding Healthchecks)
  const companyMap = new Map<number, { total: number; ytd: number; week: number }>();
  
  for (const ticket of allTickets) {
    if (ticket.company_id && !EXCLUDED_COMPANY_IDS.includes(ticket.company_id)) {
      if (!companyMap.has(ticket.company_id)) {
        companyMap.set(ticket.company_id, { total: 0, ytd: 0, week: 0 });
      }
      const entry = companyMap.get(ticket.company_id)!;
      entry.total++;
      
      const createdAt = new Date(ticket.created_at);
      if (createdAt >= yearStart) entry.ytd++;
      if (createdAt >= weekStart) entry.week++;
    }
  }

  const companyBreakdown = Array.from(companyMap.entries())
    .map(([companyId, counts]) => ({
      companyId,
      ticketCount: counts.total,
      ytdCount: counts.ytd,
      weekCount: counts.week,
    }))
    .sort((a, b) => b.ytdCount - a.ytdCount)
    .slice(0, 15);

  // Group breakdown
  const groupMap = new Map<number, { total: number; open: number; pending: number; resolved: number }>();
  
  for (const ticket of allTickets) {
    if (ticket.group_id) {
      if (!groupMap.has(ticket.group_id)) {
        groupMap.set(ticket.group_id, { total: 0, open: 0, pending: 0, resolved: 0 });
      }
      const entry = groupMap.get(ticket.group_id)!;
      entry.total++;
      
      if (ticket.status === FRESHDESK_STATUS.OPEN) entry.open++;
      else if (ticket.status === FRESHDESK_STATUS.PENDING) entry.pending++;
      else if (ticket.status === FRESHDESK_STATUS.RESOLVED || ticket.status === FRESHDESK_STATUS.CLOSED) entry.resolved++;
    }
  }

  const groupBreakdown = Array.from(groupMap.entries())
    .map(([groupId, counts]) => ({
      groupId,
      ticketCount: counts.total,
      open: counts.open,
      pending: counts.pending,
      resolved: counts.resolved,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount);

  // Tags breakdown (from tickets this year)
  const tagMap = new Map<string, number>();
  for (const ticket of ticketsThisYear) {
    if (ticket.tags && ticket.tags.length > 0) {
      for (const tag of ticket.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
  }

  const tagsBreakdown = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Resolution rate (from tickets this year)
  const resolvedThisYear = ticketsThisYear.filter(t => 
    t.status === FRESHDESK_STATUS.RESOLVED || t.status === FRESHDESK_STATUS.CLOSED
  ).length;
  const resolutionRate = ticketsThisYear.length > 0 
    ? Math.round((resolvedThisYear / ticketsThisYear.length) * 100) 
    : 0;

  return {
    totalTicketsCreated: ticketsThisYear.length,
    totalTicketsResolved,
    totalTicketsClosed,
    totalTicketsOpen,
    totalTicketsPending,
    urgentTickets,
    highTickets,
    mediumTickets,
    lowTickets,
    companyBreakdown,
    groupBreakdown,
    tagsBreakdown,
    ticketsThisYear: ticketsThisYear.length,
    ticketsThisWeek: ticketsThisWeek.length,
    ticketsThisMonth: ticketsThisMonth.length,
    resolutionRate,
    fetchedAt: now.toISOString(),
    totalFetched: allTickets.length,
  };
}
