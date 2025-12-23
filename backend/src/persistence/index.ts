export {
  getPrismaClient,
  connectPrisma,
  disconnectPrisma,
} from './prisma-client';

export {
  writeWeeklySnapshot,
  snapshotExists,
  getSnapshot,
  listSnapshots,
} from './snapshot-repository';
export type { SnapshotWriteResult } from './snapshot-repository';

export {
  checkRetention,
  deleteExpiredSnapshots,
  getRetentionAuditLogs,
} from './retention-manager';
export type { ExpiringSnapshot, RetentionCheckResult } from './retention-manager';

export {
  saveEngineerHours,
  getEngineerHours,
} from './engineer-hours-repository';

export {
  recordJobStart,
  recordJobCompletion,
  getRecentJobExecutions,
  getJobExecution,
} from './job-repository';

export {
  getTicketsByDateRange,
  getSnapshotsByDateRange,
  getGroupResolutionsByDateRange,
} from './date-range-repository';
export type { TicketSnapshotRecord } from './date-range-repository';

export {
  writeRftSnapshot,
  rftSnapshotExists,
  getRftSnapshot,
  getLatestRftSnapshot,
  listRftSnapshots,
} from './rft-repository';
export type { RftSnapshotWriteResult } from './rft-repository';

export {
  createNote,
  updateNote,
  deleteNote,
  getNotesBySnapshot,
  getNotesByType,
  getNoteById,
} from './notes-repository';
export type { NoteType, WeeklyNoteInput, WeeklyNoteRecord } from './notes-repository';

export {
  logActivity,
  getActivityLogs,
} from './activity-log-repository';
export type { ActivityLogEntry, ActivityLogInput } from './activity-log-repository';

export {
  getConfig,
  setConfig,
  listConfigs,
  deleteConfig,
} from './system-config-repository';
export type { SystemConfigEntry } from './system-config-repository';

export {
  upsertYtdTickets,
  getAllYtdTickets,
  getYtdTicketsByDateRange,
  getYtdTicketCount,
  getLastSyncTimestamp,
  clearYtdTickets,
} from './ytd-ticket-repository';
export type { YtdTicketRecord } from './ytd-ticket-repository';

export {
  writeSyncPerformanceSnapshot,
  syncPerformanceSnapshotExists,
  getSyncPerformanceSnapshot,
  getLatestSyncPerformanceSnapshot,
  listSyncPerformanceSnapshots,
} from './sync-performance-repository';
export type { SyncPerformanceSnapshotWriteResult } from './sync-performance-repository';
