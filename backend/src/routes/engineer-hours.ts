import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { saveEngineerHours, getEngineerHours } from '../persistence/engineer-hours-repository';
import { logger } from '../utils/logger';

interface EngineerHoursBody {
  snapshotId: string;
  engineerName: string;
  totalHoursWorked: number;
  ticketsResolved: number;
}

interface EngineerHoursQuery {
  snapshotId: string;
}

export async function registerEngineerHoursRoutes(fastify: FastifyInstance): Promise<void> {
  // Get engineer hours for a snapshot
  fastify.get<{ Querystring: EngineerHoursQuery }>(
    '/api/engineer-hours',
    async (request: FastifyRequest<{ Querystring: EngineerHoursQuery }>, reply: FastifyReply) => {
      const { snapshotId } = request.query;

      if (!snapshotId) {
        return reply.status(400).send({
          success: false,
          error: 'snapshotId is required',
        });
      }

      try {
        const hours = await getEngineerHours(snapshotId);

        return reply.send({
          success: true,
          data: hours,
        });
      } catch (error) {
        logger.error({ error, snapshotId }, 'Failed to fetch engineer hours');
        throw error;
      }
    }
  );

  // Save engineer hours
  fastify.post<{ Body: EngineerHoursBody }>(
    '/api/engineer-hours',
    async (request: FastifyRequest<{ Body: EngineerHoursBody }>, reply: FastifyReply) => {
      const { snapshotId, engineerName, totalHoursWorked, ticketsResolved } = request.body;

      if (!snapshotId || !engineerName || totalHoursWorked === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'snapshotId, engineerName, and totalHoursWorked are required',
        });
      }

      try {
        const metrics = await saveEngineerHours(
          {
            weekSnapshotId: snapshotId,
            engineerName,
            totalHoursWorked,
          },
          ticketsResolved || 0
        );

        return reply.send({
          success: true,
          data: {
            engineerName,
            totalHoursWorked,
            ticketsResolved,
            avgTimePerTicket: metrics.averageTimePerTicketHours,
          },
        });
      } catch (error) {
        logger.error({ error, snapshotId, engineerName }, 'Failed to save engineer hours');
        throw error;
      }
    }
  );
}
