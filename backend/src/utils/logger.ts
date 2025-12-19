import pino from 'pino';

const REDACTED_PATHS = [
  'freshdeskApiKey',
  'apiKey',
  'password',
  'secret',
  'token',
  'authorization',
  'Authorization',
  'req.headers.authorization',
  'res.headers.authorization',
  '*.apiKey',
  '*.password',
  '*.secret',
  '*.token',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
  base: {
    service: 'freshdesk-analytics',
    mode: 'READ-ONLY',
  },
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export function logJobStart(jobId: string, jobType: string): void {
  logger.info({ jobId, jobType, event: 'job_start' }, `Job started: ${jobType}`);
}

export function logJobComplete(
  jobId: string,
  jobType: string,
  durationMs: number,
  success: boolean
): void {
  logger.info(
    { jobId, jobType, durationMs, success, event: 'job_complete' },
    `Job completed: ${jobType}`
  );
}

export function logJobError(jobId: string, jobType: string, error: unknown): void {
  logger.error(
    { jobId, jobType, error, event: 'job_error' },
    `Job failed: ${jobType}`
  );
}

export function logApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number
): void {
  logger.info(
    { endpoint, method, statusCode, durationMs, event: 'api_call' },
    `API call: ${method} ${endpoint}`
  );
}

export function logRetentionAction(
  snapshotId: string,
  action: 'notify' | 'delete',
  details?: string
): void {
  logger.info(
    { snapshotId, action, details, event: 'retention_action' },
    `Retention action: ${action} for ${snapshotId}`
  );
}
