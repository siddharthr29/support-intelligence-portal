import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireLeadership } from '../middleware/role-check';
import { logger } from '../utils/logger';
import { createMetabaseClient } from '../services/metabase';

/**
 * Metabase Implementations Routes
 * Fetches all Avni implementations data from Metabase
 */

export async function registerMetabaseImplementationsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all implementations from Metabase
  fastify.get<{
    Querystring: { force?: string };
  }>('/api/metabase/implementations', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    try {
      const force = request.query.force === 'true';
      
      logger.info({ force }, 'Fetching implementations from Metabase');
      
      const metabase = createMetabaseClient();
      
      // Question ID 816 - All Avni Implementations
      const questionId = 816;
      
      // Use the card query endpoint directly
      const endpoint = `/api/card/${questionId}/query/json`;
      const rawData = await (metabase as any).executeRequest(endpoint, 'POST') as (string | number)[][];
      
      // Transform the data
      // Skip first row if it contains headers
      const dataRows = Array.isArray(rawData) && rawData.length > 0 ? rawData : [];
      
      const implementations = dataRows.map((row: any[]) => {
        // Map columns based on Metabase question structure
        // Adjust indices based on actual column order
        return {
          organisation_name: row[0] || 'Unknown',
          state: row[1] || 'Unknown',
          district: row[2] || 'Unknown',
          project_name: row[3] || 'Unknown',
          start_date: row[4] || new Date().toISOString(),
          status: row[5] || 'Active',
          users_count: Number(row[6]) || 0,
          subjects_count: Number(row[7]) || 0,
        };
      });
      
      logger.info({ count: implementations.length }, 'Implementations fetched successfully');
      
      return reply.send({
        success: true,
        data: {
          implementations,
          count: implementations.length,
          fetched_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch implementations from Metabase');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve implementations data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  logger.info('Metabase implementations routes registered');
}
