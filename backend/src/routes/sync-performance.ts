import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createMetabaseClient } from '../services/metabase';
import {
  getSyncPerformanceSnapshot,
  getLatestSyncPerformanceSnapshot,
  listSyncPerformanceSnapshots,
  writeSyncPerformanceSnapshot,
} from '../persistence';
import { logger, ValidationError } from '../utils';

interface SyncPerformanceQueryParams {
  snapshotId?: string;
}

export async function registerSyncPerformanceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: SyncPerformanceQueryParams }>(
    '/api/sync-performance',
    async (request: FastifyRequest<{ Querystring: SyncPerformanceQueryParams }>, reply: FastifyReply) => {
      const { snapshotId } = request.query;

      try {
        let syncPerformanceData;

        if (snapshotId) {
          syncPerformanceData = await getSyncPerformanceSnapshot(snapshotId);
          if (!syncPerformanceData) {
            return reply.status(404).send({
              success: false,
              error: 'Sync performance snapshot not found',
            });
          }
        } else {
          syncPerformanceData = await getLatestSyncPerformanceSnapshot();
          if (!syncPerformanceData) {
            return reply.status(404).send({
              success: false,
              error: 'No sync performance snapshots available',
            });
          }
        }

        return reply.send({
          success: true,
          data: {
            snapshotId: syncPerformanceData.snapshotId,
            fetchedAt: syncPerformanceData.fetchedAt,
            totals: {
              totalOrganisations: syncPerformanceData.totalOrganisations,
              avgSuccessRate: syncPerformanceData.avgSuccessRate,
              avgUsabilityScore: syncPerformanceData.avgUsabilityScore,
            },
            byOrganisation: syncPerformanceData.organisationBreakdown,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch sync performance data');
        throw error;
      }
    }
  );

  fastify.get('/api/sync-performance/list', async (_request, reply) => {
    const snapshots = await listSyncPerformanceSnapshots();

    return reply.send({
      success: true,
      data: snapshots,
    });
  });

  fastify.post<{ Querystring: { force?: string } }>(
    '/api/sync-performance/fetch',
    async (request, reply) => {
      try {
        const forceRefresh = request.query.force === 'true';
        const client = createMetabaseClient();
        const metrics = await client.getSyncPerformanceMetrics();

        const snapshotId = `sync_perf_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

        const result = await writeSyncPerformanceSnapshot(snapshotId, metrics, forceRefresh);

        if (result.alreadyExists && !forceRefresh) {
          return reply.send({
            success: true,
            message: 'Sync performance snapshot already exists for today',
            snapshotId: result.snapshotId,
          });
        }

        return reply.send({
          success: true,
          message: forceRefresh ? 'Sync performance data force refreshed' : 'Sync performance data fetched and stored',
          snapshotId: result.snapshotId,
          totals: metrics.totals,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch sync performance data from Metabase');
        throw error;
      }
    }
  );
}
