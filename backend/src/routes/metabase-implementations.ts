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
      
      logger.info({ 
        rawDataLength: rawData?.length, 
        firstRow: rawData?.[0],
        sampleRow: rawData?.[1] 
      }, 'Raw Metabase data received');
      
      // Transform the data
      // Metabase Question 816 columns (based on screenshot):
      // [0] Sl.No, [1] Organisation, [2] Sector, [3] Program, [4] For, [5] Website
      // We need to map these correctly
      const dataRows = Array.isArray(rawData) && rawData.length > 0 ? rawData : [];
      
      const implementations = dataRows.map((row: any[], index: number) => {
        // Based on the Metabase table screenshot:
        // [0] Sl.No
        // [1] Organisation name
        // [2] Sector (e.g., Health, Water, Waste Management)
        // [3] Program name
        // [4] For (e.g., Self, M.P. Government, State NGOs Partnership)
        // [5] Website URL
        return {
          sl_no: Number(row[0]) || index + 1,
          organisation_name: row[1] || 'Unknown',
          sector: row[2] || 'Unknown',
          project_name: row[3] || 'Unknown',
          for_type: row[4] || 'Self',
          website: row[5] || null,
          // Legacy fields for compatibility
          state: 'India',
          district: row[2] || 'Unknown',
          start_date: new Date().toISOString(),
          status: 'Active',
          users_count: 0,
          subjects_count: 0,
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
