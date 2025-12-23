import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../persistence/prisma-client';

let monthlyReportTask: cron.ScheduledTask | null = null;

/**
 * Monthly Report Cache Refresh Scheduler
 * Runs on the last day of every month at 9:00 PM IST
 * Clears the monthly report cache to force fresh data generation
 */
export function startMonthlyReportScheduler(): void {
  const { timezone } = config.scheduler;

  // Cron expression: 0 21 28-31 * *
  // Runs at 9:00 PM on days 28-31 of every month
  // We check if it's actually the last day in the job itself
  const cronExpression = '0 21 28-31 * *';

  logger.info({
    cronExpression,
    timezone,
    description: 'Last day of month at 9:00 PM IST - Monthly report cache refresh',
  }, 'Starting monthly report scheduler');

  monthlyReportTask = cron.schedule(
    cronExpression,
    async () => {
      await refreshMonthlyReportCache();
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Monthly report scheduler started successfully');
}

export function stopMonthlyReportScheduler(): void {
  if (monthlyReportTask) {
    monthlyReportTask.stop();
    monthlyReportTask = null;
    logger.info('Monthly report scheduler stopped');
  }
}

async function refreshMonthlyReportCache(): Promise<void> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if tomorrow is the 1st (meaning today is the last day of the month)
  if (tomorrow.getDate() !== 1) {
    logger.info({ date: now.toISOString() }, 'Not the last day of month, skipping cache refresh');
    return;
  }

  logger.info({ 
    date: now.toISOString(),
    month: now.getMonth() + 1,
    year: now.getFullYear() 
  }, 'Last day of month detected - clearing monthly report cache');

  try {
    // Trigger a fresh monthly report generation for the current month
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${API_BASE_URL}/api/monthly-report?year=${year}&month=${month}`);
    
    if (response.ok) {
      logger.info({ year, month }, 'Monthly report cache refreshed successfully');
    } else {
      logger.error({ year, month, status: response.status }, 'Failed to refresh monthly report cache');
    }
  } catch (error) {
    logger.error({ error }, 'Error refreshing monthly report cache');
  }
}

export function isMonthlyReportSchedulerRunning(): boolean {
  return monthlyReportTask !== null;
}
