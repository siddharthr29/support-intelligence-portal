import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createMetabaseClient } from '../services/metabase';
import { writeSyncPerformanceSnapshot } from '../persistence';

let refreshTask: cron.ScheduledTask | null = null;

async function refreshSyncPerformanceData(): Promise<void> {
  try {
    logger.info('Starting daily sync performance data refresh from Metabase');
    
    const client = createMetabaseClient();
    const metrics = await client.getSyncPerformanceMetrics();

    const snapshotId = `sync_perf_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

    // Force refresh to overwrite existing snapshot for today
    const result = await writeSyncPerformanceSnapshot(snapshotId, metrics, true);

    if (result.success) {
      logger.info({
        snapshotId,
        totalOrganisations: metrics.totals.totalOrganisations,
        avgUsabilityScore: metrics.totals.avgUsabilityScore.toFixed(2),
      }, 'Daily sync performance data refresh completed successfully');
    } else {
      logger.error({ snapshotId, error: result.error }, 'Failed to write sync performance snapshot');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to refresh sync performance data from Metabase');
  }
}

export function startDailySyncPerformanceRefresh(): void {
  const timezone = config.scheduler.timezone;

  // Run daily at 6:00 AM IST
  const cronExpression = '0 6 * * *';

  logger.info({
    cronExpression,
    timezone,
    description: 'Daily at 6:00 AM IST - Refresh sync performance data from Metabase',
  }, 'Starting daily sync performance refresh scheduler');

  refreshTask = cron.schedule(
    cronExpression,
    async () => {
      await refreshSyncPerformanceData();
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Daily sync performance refresh scheduler started successfully');
  
  // Run immediately on startup to ensure fresh data
  refreshSyncPerformanceData().catch(error => {
    logger.error({ error }, 'Failed to run initial sync performance refresh');
  });
}

export function stopDailySyncPerformanceRefresh(): void {
  if (refreshTask) {
    refreshTask.stop();
    refreshTask = null;
    logger.info('Daily sync performance refresh scheduler stopped');
  }
}

export function isDailySyncPerformanceRefreshRunning(): boolean {
  return refreshTask !== null;
}
