import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import type { FreshdeskTicket } from '../services/freshdesk';

export interface YtdTicketRecord {
  id: string;
  freshdeskTicketId: bigint;
  subject: string;
  status: number;
  priority: number;
  groupId: bigint | null;
  companyId: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

/**
 * Upsert all YTD tickets from Freshdesk into the database.
 * Uses batched upserts to avoid connection pool exhaustion.
 */
export async function upsertYtdTickets(tickets: readonly FreshdeskTicket[]): Promise<{ success: boolean; upsertedCount: number; error?: string }> {
  const prisma = getPrismaClient();
  const BATCH_SIZE = 100; // Small batches to avoid connection issues
  
  let upsertedCount = 0;
  
  try {
    logger.info({ totalTickets: tickets.length }, 'Starting YTD ticket upsert');
    
    // Process in batches to avoid overwhelming the connection pool
    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const batch = tickets.slice(i, i + BATCH_SIZE);
      
      // Use individual upserts within a transaction for reliability
      await prisma.$transaction(
        batch.map(ticket => {
          const ticketTags = [...ticket.tags];
          return prisma.ytdTicket.upsert({
            where: { freshdeskTicketId: BigInt(ticket.id) },
            update: {
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
              groupId: ticket.group_id ? BigInt(ticket.group_id) : null,
              companyId: ticket.company_id ? BigInt(ticket.company_id) : null,
              updatedAt: new Date(ticket.updated_at),
              tags: ticketTags,
            },
            create: {
              freshdeskTicketId: BigInt(ticket.id),
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
              groupId: ticket.group_id ? BigInt(ticket.group_id) : null,
              companyId: ticket.company_id ? BigInt(ticket.company_id) : null,
              createdAt: new Date(ticket.created_at),
              updatedAt: new Date(ticket.updated_at),
              tags: ticketTags,
            },
          });
        })
      );
      
      upsertedCount += batch.length;
      
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= tickets.length) {
        logger.info({ progress: `${upsertedCount}/${tickets.length}` }, 'YTD ticket upsert progress');
      }
    }
    
    logger.info({ upsertedCount }, 'YTD ticket upsert completed successfully');
    
    return { success: true, upsertedCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, upsertedCount }, 'Failed to upsert YTD tickets');
    
    return { success: false, upsertedCount, error: errorMessage };
  }
}

/**
 * Get all YTD tickets from the database.
 */
export async function getAllYtdTickets(): Promise<YtdTicketRecord[]> {
  const prisma = getPrismaClient();
  return prisma.ytdTicket.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get YTD tickets filtered by date range.
 */
export async function getYtdTicketsByDateRange(startDate: Date, endDate: Date): Promise<YtdTicketRecord[]> {
  const prisma = getPrismaClient();
  return prisma.ytdTicket.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get count of YTD tickets.
 */
export async function getYtdTicketCount(): Promise<number> {
  const prisma = getPrismaClient();
  return prisma.ytdTicket.count();
}

/**
 * Get the last sync timestamp (most recent updatedAt).
 */
export async function getLastSyncTimestamp(): Promise<Date | null> {
  const prisma = getPrismaClient();
  const latest = await prisma.ytdTicket.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });
  return latest?.updatedAt ?? null;
}

/**
 * Clear all YTD tickets (for full refresh).
 */
export async function clearYtdTickets(): Promise<number> {
  const prisma = getPrismaClient();
  const result = await prisma.ytdTicket.deleteMany({});
  logger.info({ deletedCount: result.count }, 'Cleared all YTD tickets');
  return result.count;
}
