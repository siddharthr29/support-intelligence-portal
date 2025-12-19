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
  fastify.get<{
    Querystring: { year?: string };
  }>('/api/app-data', {
    preHandler: async (request, reply) => {
      // Apply rate limiting for year switches
      const { yearRateLimitMiddleware } = await import('../middleware/year-rate-limit');
      if (request.query.year) {
        await yearRateLimitMiddleware(request, reply);
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    // Declare year outside try block so it's accessible in catch
    let year = new Date().getFullYear();
    
    try {
      const prisma = getPrismaClient();
      
      // Get year from query parameter (default to current year)
      if (request.query.year) {
        const { sanitizeYearInput } = await import('../services/year-manager');
        const sanitized = sanitizeYearInput(request.query.year);
        if (sanitized === null) {
          return reply.status(400).send({
            success: false,
            error: `Invalid year parameter: ${request.query.year}`,
          });
        }
        year = sanitized;
      }
      
      logger.info({ year }, 'Fetching unified app data (single request)');
      
      // Query 1: Get YTD tickets filtered by year
      const dbTickets = await prisma.ytdTicket.findMany({
        where: { year },
        orderBy: { createdAt: 'desc' },
      });
      
      // Query 2: Get all cached companies
      const dbCompanies = await prisma.companyCache.findMany();
      
      // Query 3: Get all cached groups
      const dbGroups = await prisma.groupCache.findMany();
      
      // Query 4: Get last sync timestamp
      const lastSyncTimestamp = await getConfig('ytd_last_sync_timestamp');
      
      // Transform tickets (convert BigInt to Number for JSON)
      // Defensive: Handle empty arrays and invalid data
      const tickets = (dbTickets || []).map(t => {
        try {
          return {
            id: Number(t.freshdeskTicketId),
            subject: t.subject || '',
            status: t.status || 0,
            priority: t.priority || 0,
            groupId: t.groupId ? Number(t.groupId) : null,
            companyId: t.companyId ? Number(t.companyId) : null,
            createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: t.updatedAt ? t.updatedAt.toISOString() : new Date().toISOString(),
            tags: Array.isArray(t.tags) ? t.tags : [],
          };
        } catch (err) {
          logger.warn({ ticketId: t.freshdeskTicketId, error: err }, 'Failed to transform ticket, skipping');
          return null;
        }
      }).filter(Boolean) as any[];
      
      // Transform companies to lookup map
      // Defensive: Handle empty arrays and invalid data
      const companies: Record<number, string> = {};
      for (const c of (dbCompanies || [])) {
        try {
          const companyId = Number(c.freshdeskCompanyId);
          if (!isNaN(companyId) && c.name) {
            companies[companyId] = c.name;
          }
        } catch (err) {
          logger.warn({ companyId: c.freshdeskCompanyId, error: err }, 'Failed to transform company, skipping');
        }
      }
      
      // Transform groups to lookup map
      // Defensive: Handle empty arrays and invalid data
      const groups: Record<number, string> = {};
      for (const g of (dbGroups || [])) {
        try {
          const groupId = Number(g.freshdeskGroupId);
          if (!isNaN(groupId) && g.name) {
            groups[groupId] = g.name;
          }
        } catch (err) {
          logger.warn({ groupId: g.freshdeskGroupId, error: err }, 'Failed to transform group, skipping');
        }
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
      // Log full error object with stack trace for debugging
      if (error instanceof Error) {
        logger.error({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          year,
        }, 'Failed to fetch unified app data');
      } else {
        // Handle non-Error objects
        logger.error({
          error: {
            type: typeof error,
            value: JSON.stringify(error),
          },
          year,
        }, 'Failed to fetch unified app data (non-Error thrown)');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
