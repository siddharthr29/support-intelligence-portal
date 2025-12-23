import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createMetabaseClient } from '../services/metabase';
import { writeRftSnapshot } from '../persistence';

let dailyRftTask: cron.ScheduledTask | null = null;

/**
 * Daily RFT Refresh Scheduler
 * Automatically refreshes RFT metrics from Metabase every morning at 9:00 AM IST
 */
export function startDailyRftRefresh(): void {
  const timezone = config.scheduler.timezone; // Asia/Kolkata

  // Daily at 9:00 AM IST
  const cronExpression = '0 9 * * *';

  logger.info({
    cronExpression,
    timezone,
    description: 'Daily 9:00 AM IST - RFT Metabase refresh',
  }, 'Starting daily RFT refresh scheduler');

  dailyRftTask = cron.schedule(
    cronExpression,
    async () => {
      logger.info('Starting automated daily RFT refresh from Metabase');
      
      try {
        const client = createMetabaseClient();
        const metrics = await client.getRftWeeklyMetrics();

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const snapshotId = `rft_${dateStr}`;

        const result = await writeRftSnapshot(snapshotId, metrics, true); // Force refresh

        logger.info({
          snapshotId: result.snapshotId,
          totalOpenRfts: metrics.totals.totalOpenRfts,
          organisationCount: metrics.byOrganisation.length,
        }, 'Daily RFT refresh completed successfully');

      } catch (error) {
        logger.error({ error }, 'Failed to execute daily RFT refresh');
      }
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Daily RFT refresh scheduler started successfully');
}

export function stopDailyRftRefresh(): void {
  if (dailyRftTask) {
    dailyRftTask.stop();
    dailyRftTask = null;
    logger.info('Daily RFT refresh scheduler stopped');
  }
}

export function isDailyRftRefreshRunning(): boolean {
  return dailyRftTask !== null;
}
