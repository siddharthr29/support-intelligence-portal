import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../persistence/prisma-client';
import { FRESHDESK_STATUS } from '../services/freshdesk';
import { logger } from '../utils/logger';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

// Constants
const AVG_HOURS_PER_TICKET = 2.5;

// Known group IDs
const SUPPORT_ENGINEERS_GROUP_ID = 36000098156;
const PRODUCT_SUPPORT_GROUP_ID = 36000098158;

// Excluded company IDs (internal/test)
const EXCLUDED_COMPANY_IDS = [36000989803]; // Healthchecks

// Cache for monthly reports (key: "YYYY-MM")
interface MonthlyReportCache {
  data: MonthlyReportData;
  lastUpdated: number;
}
const monthlyReportCache = new Map<string, MonthlyReportCache>();
const MONTHLY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

// Public share tokens (key: token, value: { month, expiresAt })
interface ShareToken {
  month: string;
  year: number;
  expiresAt: number;
}
const publicShareTokens = new Map<string, ShareToken>();

interface MonthlyReportQuery {
  year: string;
  month: string;
}

interface MonthlyReportData {
  month: string;
  year: number;
  monthName: string;
  
  // Opening/Closing Balance
  openingBalance: number; // Total open tickets at start of month
  closingBalance: number; // Total open tickets at end of month
  
  // Ticket Stats
  totalTicketsCreated: number;
  totalTicketsResolved: number;
  totalTicketsClosed: number;
  
  // Resolution Time
  avgResolutionTimePerTicket: number; // Based on engineer hours
  totalEngineerHours: number;
  estimatedResolutionTime: number; // 2.5 hrs * resolved tickets
  
  // Group Breakdown
  productSupportTickets: number;
  supportEngineersTickets: number;
  
  // Top Companies (excluding Healthchecks)
  topCompanies: { companyId: number; companyName: string; ticketCount: number }[];
  
  // Top Tags
  topTags: { tag: string; count: number }[];
  
  // For download
  generatedAt: string;
}

export async function registerMonthlyReportRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: MonthlyReportQuery }>(
    '/api/monthly-report',
    async (request: FastifyRequest<{ Querystring: MonthlyReportQuery }>, reply: FastifyReply) => {
      const { year, month } = request.query;
      
      if (!year || !month) {
        return reply.status(400).send({
          success: false,
          error: 'year and month are required (e.g., year=2025&month=12)',
        });
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid year or month',
        });
      }

      try {
        const cacheKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        const now = Date.now();
        
        // Check cache first
        const cached = monthlyReportCache.get(cacheKey);
        if (cached && (now - cached.lastUpdated) < MONTHLY_CACHE_TTL_MS) {
          logger.info({ cacheKey }, 'Returning cached monthly report');
          return reply.send({
            success: true,
            data: cached.data,
            cached: true,
          });
        }

        const report = await generateMonthlyReport(yearNum, monthNum);
        
        // Cache the result
        monthlyReportCache.set(cacheKey, { data: report, lastUpdated: now });
        
        return reply.send({
          success: true,
          data: report,
          cached: false,
        });
      } catch (error) {
        logger.error({ error, year, month }, 'Failed to generate monthly report');
        throw error;
      }
    }
  );

  // Generate public share link
  fastify.post<{ Body: { year: number; month: number; expiresInHours?: number } }>(
    '/api/monthly-report/share',
    async (request, reply) => {
      const { year, month, expiresInHours = 24 } = request.body;
      
      // Generate a random token
      const token = `mr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
      
      publicShareTokens.set(token, {
        month: `${year}-${String(month).padStart(2, '0')}`,
        year,
        expiresAt,
      });

      logger.info({ token, year, month, expiresAt }, 'Created public share link for monthly report');

      return reply.send({
        success: true,
        data: {
          token,
          expiresAt: new Date(expiresAt).toISOString(),
          url: `/api/monthly-report/public/${token}`,
        },
      });
    }
  );

  // Revoke public share link
  fastify.delete<{ Params: { token: string } }>(
    '/api/monthly-report/share/:token',
    async (request, reply) => {
      const { token } = request.params;
      
      if (publicShareTokens.has(token)) {
        publicShareTokens.delete(token);
        logger.info({ token }, 'Revoked public share link');
        return reply.send({ success: true, message: 'Share link revoked' });
      }
      
      return reply.status(404).send({ success: false, error: 'Token not found' });
    }
  );

  // Public view of monthly report (no auth required)
  fastify.get<{ Params: { token: string } }>(
    '/api/monthly-report/public/:token',
    async (request, reply) => {
      const { token } = request.params;
      const shareData = publicShareTokens.get(token);
      
      if (!shareData) {
        return reply.status(404).send({ success: false, error: 'Invalid or expired link' });
      }
      
      if (Date.now() > shareData.expiresAt) {
        publicShareTokens.delete(token);
        return reply.status(410).send({ success: false, error: 'Link has expired' });
      }

      const [yearStr, monthStr] = shareData.month.split('-');
      const report = await generateMonthlyReport(parseInt(yearStr), parseInt(monthStr));
      
      return reply.send({
        success: true,
        data: report,
        isPublic: true,
        expiresAt: new Date(shareData.expiresAt).toISOString(),
      });
    }
  );

  // List active share links
  fastify.get('/api/monthly-report/shares', async (_request, reply) => {
    const now = Date.now();
    const activeShares: { token: string; month: string; expiresAt: string }[] = [];
    
    for (const [token, data] of publicShareTokens.entries()) {
      if (now < data.expiresAt) {
        activeShares.push({
          token,
          month: data.month,
          expiresAt: new Date(data.expiresAt).toISOString(),
        });
      } else {
        publicShareTokens.delete(token);
      }
    }
    
    return reply.send({ success: true, data: activeShares });
  });

  // Get available months for reports
  fastify.get('/api/monthly-report/available-months', async (_request, reply) => {
    const prisma = getPrismaClient();
    
    // Use YtdTicket table - the main data source
    const tickets = await prisma.ytdTicket.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (tickets.length === 0) {
      return reply.send({ success: true, data: [] });
    }

    const monthsSet = new Set<string>();
    for (const t of tickets) {
      const date = new Date(t.createdAt);
      monthsSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    const months = Array.from(monthsSet).sort().reverse();
    
    return reply.send({
      success: true,
      data: months.map(m => {
        const [y, mo] = m.split('-');
        const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
        return {
          value: m,
          label: format(date, 'MMMM yyyy'),
          year: parseInt(y),
          month: parseInt(mo),
        };
      }),
    });
  });
}

async function generateMonthlyReport(year: number, month: number): Promise<MonthlyReportData> {
  const prisma = getPrismaClient();
  
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  const monthName = format(monthStart, 'MMMM');

  logger.info({ year, month, monthStart, monthEnd }, 'Generating monthly report from YtdTicket table');

  // Fetch all tickets from YtdTicket table (populated by Friday sync job)
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
    subject: t.subject,
  }));
  
  logger.info({ totalTickets: allTickets.length }, 'Fetched tickets from YtdTicket table for monthly report');

  // Filter tickets created in this specific month
  const ticketsCreatedThisMonth = allTickets.filter(t => {
    const createdAt = new Date(t.created_at);
    return createdAt >= monthStart && createdAt <= monthEnd;
  });

  // Opening balance: All unresolved tickets as of 1st of the month
  // These are tickets created BEFORE this month that were still open/pending
  const ticketsBeforeMonth = allTickets.filter(t => {
    const createdAt = new Date(t.created_at);
    return createdAt < monthStart;
  });
  
  // Count tickets that were unresolved at start of month
  // Note: We can't know exact status at that point, so we count tickets created before
  // that are currently still open/pending OR were resolved/closed during this month
  const openingBalance = ticketsBeforeMonth.filter(t => 
    t.status === FRESHDESK_STATUS.OPEN || 
    t.status === FRESHDESK_STATUS.PENDING ||
    // Include tickets resolved this month (they were open at month start)
    (t.status === FRESHDESK_STATUS.RESOLVED || t.status === FRESHDESK_STATUS.CLOSED) &&
    t.updated_at && new Date(t.updated_at) >= monthStart && new Date(t.updated_at) <= monthEnd
  ).length;

  // Closing balance: All unresolved tickets at end of month
  // Count all tickets (created up to month end) that are currently open/pending
  const allTicketsUpToMonthEnd = allTickets.filter(t => {
    const createdAt = new Date(t.created_at);
    return createdAt <= monthEnd;
  });
  
  const closingBalance = allTicketsUpToMonthEnd.filter(t => 
    t.status === FRESHDESK_STATUS.OPEN || t.status === FRESHDESK_STATUS.PENDING
  ).length;

  // Tickets resolved THIS MONTH (resolved_at or updated_at in this month with resolved status)
  const ticketsResolvedThisMonth = allTickets.filter(t => {
    if (t.status !== FRESHDESK_STATUS.RESOLVED && t.status !== FRESHDESK_STATUS.CLOSED) return false;
    const updatedAt = new Date(t.updated_at);
    return updatedAt >= monthStart && updatedAt <= monthEnd;
  });

  // Ticket stats for this month
  const totalTicketsCreated = ticketsCreatedThisMonth.length;
  const totalTicketsResolved = ticketsResolvedThisMonth.filter(t => t.status === FRESHDESK_STATUS.RESOLVED).length;
  const totalTicketsClosed = ticketsResolvedThisMonth.filter(t => t.status === FRESHDESK_STATUS.CLOSED).length;

  // Get engineer hours for this month's snapshots
  const snapshots = await prisma.weeklySnapshot.findMany({
    where: {
      weekEndDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: { snapshotId: true },
  });

  const snapshotIds = snapshots.map(s => s.snapshotId);
  
  const engineerHours = await prisma.engineerHours.findMany({
    where: { snapshotId: { in: snapshotIds } },
  });

  const totalEngineerHours = engineerHours.reduce((sum, e) => sum + e.totalHoursWorked, 0);
  const resolvedCount = totalTicketsResolved + totalTicketsClosed;
  
  // Average resolution time: if we have engineer hours, use that; otherwise use estimate
  const avgResolutionTimePerTicket = resolvedCount > 0 
    ? (totalEngineerHours > 0 ? totalEngineerHours / resolvedCount : AVG_HOURS_PER_TICKET)
    : 0;
  
  const estimatedResolutionTime = resolvedCount * AVG_HOURS_PER_TICKET;

  // Group breakdown (from tickets created this month)
  const productSupportTickets = ticketsCreatedThisMonth.filter(t => t.group_id === PRODUCT_SUPPORT_GROUP_ID).length;
  const supportEngineersTickets = ticketsCreatedThisMonth.filter(t => t.group_id === SUPPORT_ENGINEERS_GROUP_ID).length;

  // Top companies (excluding Healthchecks) - from tickets created this month
  const companyMap = new Map<number, number>();
  for (const ticket of ticketsCreatedThisMonth) {
    if (ticket.company_id && !EXCLUDED_COMPANY_IDS.includes(ticket.company_id)) {
      companyMap.set(ticket.company_id, (companyMap.get(ticket.company_id) || 0) + 1);
    }
  }

  const topCompanyIds = Array.from(companyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Fetch company names
  const companyNames = await getCompanyNames(topCompanyIds.map(c => c[0]));
  
  const topCompanies = topCompanyIds.map(([companyId, ticketCount]) => ({
    companyId,
    companyName: companyNames.get(companyId) || `Company ${companyId}`,
    ticketCount,
  }));

  // Top tags (from tickets created this month)
  const tagMap = new Map<string, number>();
  for (const ticket of ticketsCreatedThisMonth) {
    if (ticket.tags && ticket.tags.length > 0) {
      for (const tag of ticket.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
  }

  const topTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    year,
    monthName,
    openingBalance,
    closingBalance,
    totalTicketsCreated,
    totalTicketsResolved,
    totalTicketsClosed,
    avgResolutionTimePerTicket: Math.round(avgResolutionTimePerTicket * 10) / 10,
    totalEngineerHours,
    estimatedResolutionTime,
    productSupportTickets,
    supportEngineersTickets,
    topCompanies,
    topTags,
    generatedAt: new Date().toISOString(),
  };
}

async function getCompanyNames(companyIds: number[]): Promise<Map<number, string>> {
  if (companyIds.length === 0) return new Map();
  
  try {
    const { getSecureConfig } = await import('../services/secure-config');
    const freshdeskDomain = await getSecureConfig('FRESHDESK_DOMAIN') || process.env.FRESHDESK_DOMAIN;
    const apiKey = await getSecureConfig('FRESHDESK_API_KEY', true) || process.env.FRESHDESK_API_KEY;
    
    if (!freshdeskDomain || !apiKey) {
      return new Map();
    }

    const result = new Map<number, string>();
    
    for (const companyId of companyIds) {
      try {
        const res = await fetch(`https://${freshdeskDomain}/api/v2/companies/${companyId}`, {
          headers: { 'Authorization': `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}` },
        });
        if (res.ok) {
          const data = await res.json() as { name: string };
          result.set(companyId, data.name);
        }
      } catch { /* ignore individual failures */ }
    }
    
    return result;
  } catch {
    return new Map();
  }
}
