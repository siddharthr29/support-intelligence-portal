import cron from 'node-cron';
import { getPrismaClient } from '../persistence/prisma-client';
import { logger } from '../utils/logger';
import { writeAuditLog } from '../services/audit-log';
import { getYearsToDelete, getYearsToKeep, getTicketCountByYear } from '../services/year-manager';
import { sendDiscordAlert } from '../services/discord';

let yearlyCleanupTask: cron.ScheduledTask | null = null;

/**
 * Start the yearly cleanup scheduler
 * Runs on January 1st at 00:00 IST every year
 */
export function startYearlyCleanupScheduler(): void {
  // Cron: 0 0 1 1 * (minute hour day month dayOfWeek)
  // Runs at 00:00 on January 1st
  const cronExpression = '0 0 1 1 *';
  const timezone = 'Asia/Kolkata';

  logger.info({
    cronExpression,
    timezone,
    description: 'January 1st 00:00 IST - Yearly data cleanup',
  }, 'Starting yearly cleanup scheduler');

  yearlyCleanupTask = cron.schedule(
    cronExpression,
    async () => {
      await executeYearlyCleanup();
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Yearly cleanup scheduler started successfully');
}

/**
 * Stop the yearly cleanup scheduler
 */
export function stopYearlyCleanupScheduler(): void {
  if (yearlyCleanupTask) {
    yearlyCleanupTask.stop();
    yearlyCleanupTask = null;
    logger.info('Yearly cleanup scheduler stopped');
  }
}

/**
 * Execute yearly data cleanup
 * Deletes tickets older than 2 years (keeps current + previous year only)
 */
export async function executeYearlyCleanup(): Promise<{
  success: boolean;
  yearsDeleted: number[];
  ticketsDeleted: number;
  error?: string;
}> {
  const startTime = Date.now();
  const currentYear = new Date().getFullYear();
  
  logger.info({ currentYear }, 'Starting yearly data cleanup');

  try {
    const prisma = getPrismaClient();
    
    // Get years to keep and delete
    const yearsToKeep = getYearsToKeep();
    const yearsToDelete = await getYearsToDelete();
    
    if (yearsToDelete.length === 0) {
      logger.info({ yearsToKeep }, 'No years to delete - all data is current');
      
      await writeAuditLog({
        action: 'yearly_cleanup_skipped',
        details: {
          currentYear,
          yearsToKeep,
          reason: 'No old data to delete',
        },
      });
      
      return {
        success: true,
        yearsDeleted: [],
        ticketsDeleted: 0,
      };
    }
    
    logger.info({
      yearsToKeep,
      yearsToDelete,
    }, 'Years identified for cleanup');
    
    // Count tickets before deletion
    let totalTicketsToDelete = 0;
    for (const year of yearsToDelete) {
      const count = await getTicketCountByYear(year);
      totalTicketsToDelete += count;
      logger.info({ year, count }, 'Tickets to delete for year');
    }
    
    // Delete tickets for old years
    const deleteResult = await prisma.ytdTicket.deleteMany({
      where: {
        year: {
          in: yearsToDelete,
        },
      },
    });
    
    const durationMs = Date.now() - startTime;
    
    logger.info({
      yearsDeleted: yearsToDelete,
      ticketsDeleted: deleteResult.count,
      durationMs,
    }, 'Yearly cleanup completed successfully');
    
    // Write audit log
    await writeAuditLog({
      action: 'yearly_cleanup_success',
      details: {
        currentYear,
        yearsToKeep,
        yearsDeleted: yearsToDelete,
        ticketsDeleted: deleteResult.count,
        durationMs,
      },
    });
    
    // Send Discord notification
    try {
      await sendDiscordAlert(
        `🗑️ **Yearly Data Cleanup Completed**\n\n` +
        `**Current Year:** ${currentYear}\n` +
        `**Years Kept:** ${yearsToKeep.join(', ')}\n` +
        `**Years Deleted:** ${yearsToDelete.join(', ')}\n` +
        `**Tickets Deleted:** ${deleteResult.count.toLocaleString()}\n` +
        `**Duration:** ${(durationMs / 1000).toFixed(2)}s`
      );
    } catch (discordError) {
      logger.warn({ discordError }, 'Failed to send Discord notification');
    }
    
    return {
      success: true,
      yearsDeleted: yearsToDelete,
      ticketsDeleted: deleteResult.count,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;
    
    logger.error({
      error: errorMessage,
      currentYear,
      durationMs,
    }, 'Yearly cleanup failed');
    
    // Write audit log for failure
    await writeAuditLog({
      action: 'yearly_cleanup_failed',
      details: {
        currentYear,
        error: errorMessage,
        durationMs,
      },
    });
    
    // Send Discord alert
    try {
      await sendDiscordAlert(
        `❌ **Yearly Data Cleanup Failed**\n\n` +
        `**Error:** ${errorMessage}\n` +
        `**Year:** ${currentYear}\n` +
        `Please check logs and retry manually.`
      );
    } catch (discordError) {
      logger.warn({ discordError }, 'Failed to send Discord alert');
    }
    
    return {
      success: false,
      yearsDeleted: [],
      ticketsDeleted: 0,
      error: errorMessage,
    };
  }
}

/**
 * Manual trigger for yearly cleanup (admin only)
 * Useful for testing or manual cleanup
 */
export async function triggerManualCleanup(): Promise<{
  success: boolean;
  yearsDeleted: number[];
  ticketsDeleted: number;
  error?: string;
}> {
  logger.info('Manual yearly cleanup triggered');
  
  await writeAuditLog({
    action: 'yearly_cleanup_manual_trigger',
    details: {
      triggeredAt: new Date().toISOString(),
    },
  });
  
  return await executeYearlyCleanup();
}

/**
 * Dry run - shows what would be deleted without actually deleting
 */
export async function dryRunYearlyCleanup(): Promise<{
  yearsToKeep: number[];
  yearsToDelete: number[];
  ticketsToDelete: number;
  estimatedStorageFreedMB: number;
}> {
  const yearsToKeep = getYearsToKeep();
  const yearsToDelete = await getYearsToDelete();
  
  let ticketsToDelete = 0;
  for (const year of yearsToDelete) {
    const count = await getTicketCountByYear(year);
    ticketsToDelete += count;
  }
  
  const estimatedStorageFreedMB = (ticketsToDelete * 500) / (1024 * 1024);
  
  logger.info({
    yearsToKeep,
    yearsToDelete,
    ticketsToDelete,
    estimatedStorageFreedMB: estimatedStorageFreedMB.toFixed(2),
  }, 'Dry run completed');
  
  return {
    yearsToKeep,
    yearsToDelete,
    ticketsToDelete,
    estimatedStorageFreedMB: parseFloat(estimatedStorageFreedMB.toFixed(2)),
  };
}
