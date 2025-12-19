import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../persistence/prisma-client';
import { getConfig } from '../persistence';
import { logger } from '../utils/logger';

/**
 * Unified App Data Endpoint
 * 
 * Returns ALL data needed by frontend in ONE request:
 * - YTD tickets (from YtdTicket table)
 * - Companies (from CompanyCache table)
 * - Groups (from GroupCache table)
 * - Last sync timestamp
 * 
 * This eliminates connection pool exhaustion by reducing
 * multiple parallel API calls to a single sequential query.
 */

interface AppDataResponse {
  success: boolean;
  data: {
    tickets: Array<{
      id: number;
      subject: string;
      status: number;
      priority: number;
      groupId: number | null;
      companyId: number | null;
      createdAt: string;
      updatedAt: string;
      tags: string[];
    }>;
    companies: Record<number, string>;
    groups: Record<number, string>;
    lastSyncTimestamp: string | null;
    ticketCount: number;
  };
}

export async function registerAppDataRoutes(fastify: FastifyInstance): Promise<void> {
  
  // GET /api/app-data - Single endpoint for ALL frontend data
  fastify.get('/api/app-data', async (_request, reply) => {
    const startTime = Date.now();
    
    try {
      const prisma = getPrismaClient();
      
      logger.info('Fetching unified app data (single request)');
      
      // Query 1: Get all YTD tickets
      const dbTickets = await prisma.ytdTicket.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      // Query 2: Get all cached companies
      const dbCompanies = await prisma.companyCache.findMany();
      
      // Query 3: Get all cached groups
      const dbGroups = await prisma.groupCache.findMany();
      
      // Query 4: Get last sync timestamp
      const lastSyncTimestamp = await getConfig('ytd_last_sync_timestamp');
      
      // Transform tickets (convert BigInt to Number for JSON)
      const tickets = dbTickets.map(t => ({
        id: Number(t.freshdeskTicketId),
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        groupId: t.groupId ? Number(t.groupId) : null,
        companyId: t.companyId ? Number(t.companyId) : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        tags: t.tags || [],
      }));
      
      // Transform companies to lookup map
      const companies: Record<number, string> = {};
      for (const c of dbCompanies) {
        companies[Number(c.freshdeskCompanyId)] = c.name;
      }
      
      // Transform groups to lookup map
      const groups: Record<number, string> = {};
      for (const g of dbGroups) {
        groups[Number(g.freshdeskGroupId)] = g.name;
      }
      
      const durationMs = Date.now() - startTime;
      
      logger.info({
        ticketCount: tickets.length,
        companyCount: Object.keys(companies).length,
        groupCount: Object.keys(groups).length,
        durationMs,
      }, 'Unified app data fetched successfully');
      
      const response: AppDataResponse = {
        success: true,
        data: {
          tickets,
          companies,
          groups,
          lastSyncTimestamp,
          ticketCount: tickets.length,
        },
      };
      
      return reply.send(response);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to fetch unified app data');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
