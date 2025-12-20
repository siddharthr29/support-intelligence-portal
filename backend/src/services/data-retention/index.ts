import { getPrismaClient } from '../../persistence/prisma-client';
import { logger } from '../../utils/logger';

/**
 * Data Retention Service
 * 
 * Implements 3-year rolling retention policy:
 * - Last 12 months: Full resolution (individual tickets in ytd_tickets)
 * - Months 13-36: Compressed (monthly aggregates)
 * - >36 months: Hard delete
 */

export interface CompressionResult {
  success: boolean;
  monthsCompressed: number;
  ticketsCompressed: number;
  ticketsDeleted: number;
  error?: string;
}

export interface RetentionStats {
  full_resolution_months: number;
  compressed_months: number;
  total_tickets_full: number;
  total_tickets_compressed: number;
  oldest_data_date: Date | null;
  newest_data_date: Date | null;
}

/**
 * Compress tickets older than 12 months into monthly aggregates
 * This is the main retention function called by scheduled job
 */
export async function compressOldTickets(dryRun: boolean = false): Promise<CompressionResult> {
  const prisma = getPrismaClient();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  const thirtySixMonthsAgo = new Date();
  thirtySixMonthsAgo.setMonth(thirtySixMonthsAgo.getMonth() - 36);

  try {
    logger.info({
      twelveMonthsAgo: twelveMonthsAgo.toISOString(),
      thirtySixMonthsAgo: thirtySixMonthsAgo.toISOString(),
      dryRun,
    }, 'Starting data compression');

    // Get tickets to compress (between 12-36 months old)
    const ticketsToCompress = await prisma.ytdTicket.findMany({
      where: {
        createdAt: {
          gte: thirtySixMonthsAgo,
          lt: twelveMonthsAgo,
        },
      },
    });

    if (ticketsToCompress.length === 0) {
      logger.info('No tickets to compress');
      return {
        success: true,
        monthsCompressed: 0,
        ticketsCompressed: 0,
        ticketsDeleted: 0,
      };
    }

    // Group tickets by year, month, and partner
    const aggregates = new Map<string, any>();
    
    for (const ticket of ticketsToCompress) {
      const year = ticket.createdAt.getFullYear();
      const month = ticket.createdAt.getMonth() + 1; // 1-12
      const partnerId = ticket.companyId ? Number(ticket.companyId) : null;
      const key = `${year}-${month}-${partnerId}`;

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          year,
          month,
          partner_id: partnerId,
          partner_name: null, // Will be filled from cache
          total_tickets: 0,
          open_tickets: 0,
          resolved_tickets: 0,
          closed_tickets: 0,
          priority_urgent: 0,
          priority_high: 0,
          priority_medium: 0,
          priority_low: 0,
          data_loss_tickets: 0,
          sync_failure_tickets: 0,
          how_to_tickets: 0,
          training_tickets: 0,
          resolution_times: [] as number[],
        });
      }

      const agg = aggregates.get(key);
      agg.total_tickets++;

      // Status counts (2=open, 3=pending, 4=resolved, 5=closed)
      if (ticket.status === 2) agg.open_tickets++;
      if (ticket.status === 3) agg.open_tickets++; // pending counts as open
      if (ticket.status === 4) agg.resolved_tickets++;
      if (ticket.status === 5) agg.closed_tickets++;

      // Priority counts (1=low, 2=medium, 3=high, 4=urgent)
      if (ticket.priority === 1) agg.priority_low++;
      if (ticket.priority === 2) agg.priority_medium++;
      if (ticket.priority === 3) agg.priority_high++;
      if (ticket.priority === 4) agg.priority_urgent++;

      // Tag-based risk signals
      if (ticket.tags.includes('data-loss')) agg.data_loss_tickets++;
      if (ticket.tags.includes('sync-failure')) agg.sync_failure_tickets++;
      if (ticket.tags.includes('how-to')) agg.how_to_tickets++;
      if (ticket.tags.includes('training')) agg.training_tickets++;

      // Resolution time calculation
      const resolutionHours = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      agg.resolution_times.push(resolutionHours);
    }

    // Get partner names from cache
    const partnerIds = Array.from(new Set(
      Array.from(aggregates.values())
        .map(a => a.partner_id)
        .filter(id => id !== null)
    ));

    const partnerNames = await prisma.companyCache.findMany({
      where: { freshdeskCompanyId: { in: partnerIds.map(id => BigInt(id!)) } },
    });

    const partnerMap = new Map(
      partnerNames.map(p => [Number(p.freshdeskCompanyId), p.name])
    );

    // Calculate averages and prepare for insertion
    const aggregateRecords = Array.from(aggregates.values()).map(agg => {
      const avgResolution = agg.resolution_times.length > 0
        ? agg.resolution_times.reduce((a: number, b: number) => a + b, 0) / agg.resolution_times.length
        : null;

      const sortedTimes = agg.resolution_times.sort((a: number, b: number) => a - b);
      const medianResolution = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
        : null;

      return {
        year: agg.year,
        month: agg.month,
        partnerId: agg.partner_id,
        partnerName: agg.partner_id ? partnerMap.get(agg.partner_id) || null : null,
        totalTickets: agg.total_tickets,
        openTickets: agg.open_tickets,
        resolvedTickets: agg.resolved_tickets,
        closedTickets: agg.closed_tickets,
        avgResolutionHours: avgResolution,
        medianResolutionHours: medianResolution,
        priorityUrgent: agg.priority_urgent,
        priorityHigh: agg.priority_high,
        priorityMedium: agg.priority_medium,
        priorityLow: agg.priority_low,
        dataLossTickets: agg.data_loss_tickets,
        syncFailureTickets: agg.sync_failure_tickets,
        howToTickets: agg.how_to_tickets,
        trainingTickets: agg.training_tickets,
        compressedFromCount: agg.total_tickets,
      };
    });

    if (dryRun) {
      logger.info({
        aggregateCount: aggregateRecords.length,
        ticketsToCompress: ticketsToCompress.length,
        sample: aggregateRecords.slice(0, 3),
      }, 'DRY RUN: Would compress tickets into aggregates');

      return {
        success: true,
        monthsCompressed: aggregateRecords.length,
        ticketsCompressed: ticketsToCompress.length,
        ticketsDeleted: 0,
      };
    }

    // Insert aggregates
    for (const record of aggregateRecords) {
      await prisma.$executeRaw`
        INSERT INTO monthly_ticket_aggregates (
          year, month, partner_id, partner_name,
          total_tickets, open_tickets, resolved_tickets, closed_tickets,
          avg_resolution_hours, median_resolution_hours,
          priority_urgent, priority_high, priority_medium, priority_low,
          data_loss_tickets, sync_failure_tickets, how_to_tickets, training_tickets,
          compressed_from_count
        ) VALUES (
          ${record.year}, ${record.month}, ${record.partnerId}, ${record.partnerName},
          ${record.totalTickets}, ${record.openTickets}, ${record.resolvedTickets}, ${record.closedTickets},
          ${record.avgResolutionHours}, ${record.medianResolutionHours},
          ${record.priorityUrgent}, ${record.priorityHigh}, ${record.priorityMedium}, ${record.priorityLow},
          ${record.dataLossTickets}, ${record.syncFailureTickets}, ${record.howToTickets}, ${record.trainingTickets},
          ${record.compressedFromCount}
        )
        ON CONFLICT (year, month, partner_id) DO UPDATE SET
          total_tickets = EXCLUDED.total_tickets,
          compressed_from_count = EXCLUDED.compressed_from_count
      `;
    }

    // Delete compressed tickets
    const deleteResult = await prisma.ytdTicket.deleteMany({
      where: {
        createdAt: {
          gte: thirtySixMonthsAgo,
          lt: twelveMonthsAgo,
        },
      },
    });

    // Delete aggregates older than 36 months
    await prisma.$executeRaw`
      DELETE FROM monthly_ticket_aggregates
      WHERE (year * 12 + month) < ${thirtySixMonthsAgo.getFullYear() * 12 + thirtySixMonthsAgo.getMonth() + 1}
    `;

    logger.info({
      aggregatesCreated: aggregateRecords.length,
      ticketsDeleted: deleteResult.count,
    }, 'Data compression completed successfully');

    return {
      success: true,
      monthsCompressed: aggregateRecords.length,
      ticketsCompressed: ticketsToCompress.length,
      ticketsDeleted: deleteResult.count,
    };

  } catch (error) {
    logger.error({ error }, 'Failed to compress old tickets');
    return {
      success: false,
      monthsCompressed: 0,
      ticketsCompressed: 0,
      ticketsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get retention statistics
 */
export async function getRetentionStats(): Promise<RetentionStats> {
  const prisma = getPrismaClient();

  const fullResolutionTickets = await prisma.ytdTicket.aggregate({
    _count: true,
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const compressedAggregates = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT (year * 12 + month)) as count
    FROM monthly_ticket_aggregates
  `;

  const compressedTicketCount = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT SUM(total_tickets) as total
    FROM monthly_ticket_aggregates
  `;

  return {
    full_resolution_months: fullResolutionTickets._count > 0 ? 12 : 0,
    compressed_months: Number(compressedAggregates[0]?.count || 0),
    total_tickets_full: fullResolutionTickets._count,
    total_tickets_compressed: Number(compressedTicketCount[0]?.total || 0),
    oldest_data_date: fullResolutionTickets._min.createdAt,
    newest_data_date: fullResolutionTickets._max.createdAt,
  };
}
