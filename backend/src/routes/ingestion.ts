import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { triggerManualIngestion, isIngestionJobRunning } from '../jobs';
import { logger } from '../utils';

export async function registerIngestionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/ingestion/trigger', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (isIngestionJobRunning()) {
        return reply.status(409).send({
          success: false,
          message: 'Ingestion job is already running',
        });
      }

      // Trigger async job
      triggerManualIngestion().catch(err => {
        logger.error({ err }, 'Manual ingestion job failed');
      });

      return reply.send({
        success: true,
        message: 'Manual ingestion job triggered successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to trigger manual ingestion');
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  });
}
