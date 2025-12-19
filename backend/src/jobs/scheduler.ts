import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { executeWeeklyIngestion, createJobContext } from './weekly-ingestion';
import { sendDiscordReminder, sendDiscordWeeklyReport } from '../services/discord';
import type { IngestionJobResult } from './types';

let scheduledTask: cron.ScheduledTask | null = null;
let discordReminderTask: cron.ScheduledTask | null = null;
let discordReportTask: cron.ScheduledTask | null = null;
let isJobRunning = false;

export function startWeeklyScheduler(): void {
  const { weeklyJobDay, weeklyJobHour, weeklyJobMinute, timezone } = config.scheduler;

  const cronExpression = `${weeklyJobMinute} ${weeklyJobHour} * * ${weeklyJobDay}`;

  logger.info({
    cronExpression,
    timezone,
    description: 'Friday 16:30 Asia/Kolkata',
  }, 'Starting weekly scheduler');

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      await runScheduledJob();
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Weekly scheduler started successfully');

  // Discord reminder at Friday 2pm IST (14:00)
  discordReminderTask = cron.schedule(
    '0 14 * * 5', // Friday 2:00 PM
    async () => {
      logger.info('Sending Discord reminder for engineer hours');
      await sendDiscordReminder();
    },
    {
      timezone,
      scheduled: true,
    }
  );
  logger.info('Discord reminder scheduler started (Friday 2pm IST)');

  // Discord weekly report notification at Friday 5pm IST (17:00)
  discordReportTask = cron.schedule(
    '0 17 * * 5', // Friday 5:00 PM
    async () => {
      logger.info('Sending Discord weekly report notification');
      await sendDiscordWeeklyReport();
    },
    {
      timezone,
      scheduled: true,
    }
  );
  logger.info('Discord weekly report scheduler started (Friday 5pm IST)');
}

export function stopWeeklyScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Weekly scheduler stopped');
  }
  if (discordReminderTask) {
    discordReminderTask.stop();
    discordReminderTask = null;
    logger.info('Discord reminder scheduler stopped');
  }
  if (discordReportTask) {
    discordReportTask.stop();
    discordReportTask = null;
    logger.info('Discord report scheduler stopped');
  }
}

async function runScheduledJob(): Promise<IngestionJobResult | null> {
  if (isJobRunning) {
    logger.warn('Skipping scheduled job execution - previous job still running (idempotent guard)');
    return null;
  }

  isJobRunning = true;

  try {
    const context = createJobContext(false, 0);
    logger.info({ jobId: context.jobId }, 'Scheduled job triggered');

    const result = await executeWeeklyIngestion(context);

    if (!result.success) {
      logger.error({ result }, 'Scheduled job failed, will retry on next schedule');
    }

    return result;
  } finally {
    isJobRunning = false;
  }
}

export async function triggerManualIngestion(): Promise<IngestionJobResult> {
  if (isJobRunning) {
    throw new Error('Job already running - cannot trigger manual ingestion');
  }

  isJobRunning = true;

  try {
    const context = createJobContext(false, 0);
    logger.info({ jobId: context.jobId }, 'Manual ingestion triggered');

    return await executeWeeklyIngestion(context);
  } finally {
    isJobRunning = false;
  }
}

export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

export function isIngestionJobRunning(): boolean {
  return isJobRunning;
}
