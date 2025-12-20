import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { executeWeeklyIngestion, createJobContext } from './weekly-ingestion';
import { sendDiscordReminder, sendDiscordWeeklyReport } from '../services/discord';
import type { IngestionJobResult } from './types';

let scheduledTask: cron.ScheduledTask | null = null;
let discordReminderTask: cron.ScheduledTask | null = null;
let discordReportTask: cron.ScheduledTask | null = null;
let hourlyReminderTask: cron.ScheduledTask | null = null;
let isJobRunning = false;
let weeklyReportPushed = false; // Track if report has been pushed this week

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

  // Hourly Discord reminders from 2PM Friday until report is pushed
  // Runs every hour on Friday from 2PM to 8PM (14:00-20:00)
  hourlyReminderTask = cron.schedule(
    '0 14-20 * * 5', // Every hour on Friday from 2PM to 8PM
    async () => {
      if (!weeklyReportPushed) {
        logger.info('Sending hourly Discord reminder (report not pushed yet)');
        await sendDiscordReminder();
      } else {
        logger.info('Skipping hourly reminder - report already pushed this week');
      }
    },
    {
      timezone,
      scheduled: true,
    }
  );
  logger.info('Hourly Discord reminder scheduler started (Friday 2-8PM IST)');

  // Monday reminders if report still not pushed (9AM-1PM IST)
  cron.schedule(
    '0 9-13 * * 1', // Every hour on Monday from 9AM to 1PM
    async () => {
      if (!weeklyReportPushed) {
        logger.info('Sending Monday urgent reminder (report still not pushed)');
        await sendDiscordReminder();
      } else {
        logger.info('Skipping Monday reminder - report already pushed');
      }
    },
    {
      timezone,
      scheduled: true,
    }
  );
  logger.info('Monday urgent reminder scheduler started (Monday 9AM-1PM IST)');

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

  // Reset weekly report push flag every Saturday at midnight
  cron.schedule(
    '0 0 * * 6', // Saturday midnight
    () => {
      weeklyReportPushed = false;
      logger.info('Weekly report push flag reset for new week');
    },
    {
      timezone,
      scheduled: true,
    }
  );
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
  if (hourlyReminderTask) {
    hourlyReminderTask.stop();
    hourlyReminderTask = null;
    logger.info('Hourly reminder scheduler stopped');
  }
  if (discordReportTask) {
    discordReportTask.stop();
    discordReportTask = null;
    logger.info('Discord report scheduler stopped');
  }
}

// Mark weekly report as pushed (called from Google Sheets push endpoint)
export function markWeeklyReportPushed(): void {
  weeklyReportPushed = true;
  logger.info('Weekly report marked as pushed - hourly reminders will stop');
}

// Check if weekly report has been pushed
export function isWeeklyReportPushed(): boolean {
  return weeklyReportPushed;
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
