import type { FastifyInstance } from 'fastify';
import { getAvailableYears, getCurrentYear, getYearStats, validateYear } from '../services/year-manager';
import { logger } from '../utils/logger';

export async function registerYearRoutes(fastify: FastifyInstance): Promise<void> {
  
  // GET /api/years - Get available years
  fastify.get('/api/years', async (_request, reply) => {
    try {
      const years = await getAvailableYears();
      const currentYear = getCurrentYear();
      
      return reply.send({
        success: true,
        data: {
          years,
          currentYear,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to fetch available years');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
  
  // GET /api/years/:year/stats - Get statistics for a specific year
  fastify.get<{
    Params: { year: string };
  }>('/api/years/:year/stats', async (request, reply) => {
    try {
      const { sanitizeYearInput } = await import('../services/year-manager');
      const year = sanitizeYearInput(request.params.year);
      
      if (year === null) {
        return reply.status(400).send({
          success: false,
          error: `Invalid year: ${request.params.year}`,
        });
      }
      
      const stats = await getYearStats(year);
      
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, year: request.params.year }, 'Failed to fetch year stats');
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
