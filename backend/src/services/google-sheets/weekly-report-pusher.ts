import { logger } from '../../utils/logger';
import { getEngineerHours } from '../../persistence/engineer-hours-repository';
import { markWeeklyReportAsPushed } from '../../persistence/weekly-report-push-repository';
import { config } from '../../config';

/**
 * Push weekly report to Google Sheets
 * This is called by both manual push (admin) and auto-push (scheduler)
 * 
 * @param snapshotId - The snapshot ID (e.g., "snapshot_20251219")
 * @param pushedBy - Who triggered the push: 'admin' or 'auto-scheduler'
 */
export async function pushWeeklyReportToGoogleSheets(
  snapshotId: string,
  pushedBy: 'admin' | 'auto-scheduler'
): Promise<void> {
  logger.info({ snapshotId, pushedBy }, 'Pushing weekly report to Google Sheets');
  
  // Get engineer hours
  const engineerHours = await getEngineerHours(snapshotId);
  
  if (engineerHours.length === 0) {
    throw new Error('Cannot push report: No engineer hours filled');
  }
  
  // TODO: Implement actual Google Sheets push logic here
  // This will be integrated with existing push-weekly-report endpoint
  
  // Mark as pushed in database
  await markWeeklyReportAsPushed(snapshotId, pushedBy);
  
  logger.info({ snapshotId, pushedBy }, 'Weekly report pushed successfully');
}
