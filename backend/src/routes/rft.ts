import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createMetabaseClient } from '../services/metabase';
import {
  getRftSnapshot,
  getLatestRftSnapshot,
  listRftSnapshots,
  writeRftSnapshot,
} from '../persistence';
import { logger, ValidationError } from '../utils';

interface RftQueryParams {
  snapshotId?: string;
}

export async function registerRftRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: RftQueryParams }>(
    '/api/rft',
    async (request: FastifyRequest<{ Querystring: RftQueryParams }>, reply: FastifyReply) => {
      const { snapshotId } = request.query;

      try {
        let rftData;

        if (snapshotId) {
          rftData = await getRftSnapshot(snapshotId);
          if (!rftData) {
            return reply.status(404).send({
              success: false,
              error: 'RFT snapshot not found',
            });
          }
        } else {
          rftData = await getLatestRftSnapshot();
          if (!rftData) {
            return reply.status(404).send({
              success: false,
              error: 'No RFT snapshots available',
            });
          }
        }

        return reply.send({
          success: true,
          data: {
            snapshotId: rftData.snapshotId,
            fetchedAt: rftData.fetchedAt,
            totals: {
              newlyReportedCurrentWeek: rftData.totalNewlyReported,
              closuresThisWeek: rftData.totalClosuresThisWeek,
              closedRftsSoFar: rftData.totalClosedSoFar,
              totalOpenRfts: rftData.totalOpenRfts,
            },
            byOrganisation: rftData.organisationBreakdown,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch RFT data');
        throw error;
      }
    }
  );

  fastify.get('/api/rft/list', async (_request, reply) => {
    const snapshots = await listRftSnapshots();

    return reply.send({
      success: true,
      data: snapshots,
    });
  });

  fastify.post<{ Querystring: { force?: string } }>(
    '/api/rft/fetch',
    async (request, reply) => {
      try {
        const forceRefresh = request.query.force === 'true';
        const client = createMetabaseClient();
        const metrics = await client.getRftWeeklyMetrics();

        const snapshotId = `rft_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

        const result = await writeRftSnapshot(snapshotId, metrics, forceRefresh, undefined);

        if (result.alreadyExists && !forceRefresh) {
          return reply.send({
            success: true,
            message: 'RFT snapshot already exists for today',
            snapshotId: result.snapshotId,
          });
        }

        return reply.send({
          success: true,
          message: forceRefresh ? 'RFT data force refreshed' : 'RFT data fetched and stored',
          snapshotId: result.snapshotId,
          totals: metrics.totals,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch RFT data from Metabase');
        throw error;
      }
    }
  );
}
