export interface WeeklySnapshotMetadata {
  readonly snapshotId: string;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly createdAt: string;
  readonly timezone: string;
  readonly version: number;
}

export interface IngestionJobResult {
  readonly success: boolean;
  readonly snapshotId: string;
  readonly ticketsIngested: number;
  readonly groupsIngested: number;
  readonly companiesIngested: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly error?: string;
}

export interface JobExecutionContext {
  readonly jobId: string;
  readonly scheduledAt: string;
  readonly executedAt: string;
  readonly isRetry: boolean;
  readonly retryCount: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobState {
  readonly jobId: string;
  readonly status: JobStatus;
  readonly snapshotId: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly error: string | null;
}
