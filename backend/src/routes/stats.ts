import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseDateRange, formatDateRangeDisplay } from '../utils/date-range';
import { getTicketsByDateRange } from '../persistence/date-range-repository';
import { computeDateRangeMetrics } from '../analytics/date-range-metrics';
import { logger, ValidationError } from '../utils';

interface StatsQueryParams {
  startDate?: string;
  endDate?: string;
}

export async function registerStatsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: StatsQueryParams }>(
    '/api/stats',
    async (request: FastifyRequest<{ Querystring: StatsQueryParams }>, reply: FastifyReply) => {
      const { startDate, endDate } = request.query;

      try {
        const dateRange = parseDateRange(startDate, endDate);
        const displayRange = formatDateRangeDisplay(dateRange);

        logger.info({
          startDate: dateRange.startDateISO,
          endDate: dateRange.endDateISO,
          isDefault: !startDate && !endDate,
        }, 'Stats request received');

        const tickets = await getTicketsByDateRange(dateRange);
        const metrics = computeDateRangeMetrics(tickets, dateRange, displayRange);

        return reply.send({
          success: true,
          data: metrics,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid date')) {
          throw new ValidationError(error.message);
        }
        if (error instanceof Error && error.message.includes('startDate must be')) {
          throw new ValidationError(error.message);
        }
        if (error instanceof Error && error.message.includes('cannot exceed')) {
          throw new ValidationError(error.message);
        }
        throw error;
      }
    }
  );

  fastify.get('/api/stats/defaults', async (_request, reply) => {
    const dateRange = parseDateRange();
    const displayRange = formatDateRangeDisplay(dateRange);

    return reply.send({
      success: true,
      data: {
        defaultRange: {
          startDate: dateRange.startDateISO,
          endDate: dateRange.endDateISO,
          displayRange,
          description: 'Monday 00:00 to Friday 16:30 IST (current week)',
        },
        timezone: 'Asia/Kolkata',
        maxRangeDays: 400,
      },
    });
  });
}
