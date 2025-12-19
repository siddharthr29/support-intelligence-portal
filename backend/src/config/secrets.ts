import { config } from './environment';
import { logger } from '../utils/logger';

export interface SecretsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateSecrets(): SecretsValidationResult {
  const errors: string[] = [];

  if (!config.freshdesk.domain) {
    errors.push('FRESHDESK_DOMAIN is required');
  }

  if (!config.freshdesk.apiKey) {
    errors.push('FRESHDESK_API_KEY is required');
  }

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.firebase.apiKey) {
    errors.push('FIREBASE_API_KEY is required');
  }

  if (!config.firebase.authDomain) {
    errors.push('FIREBASE_AUTH_DOMAIN is required');
  }

  if (!config.firebase.projectId) {
    errors.push('FIREBASE_PROJECT_ID is required');
  }

  const valid = errors.length === 0;

  if (valid) {
    logger.info('All required secrets validated successfully');
    logger.info({
      freshdeskDomain: config.freshdesk.domain,
      firebaseProjectId: config.firebase.projectId,
      schedulerTimezone: config.scheduler.timezone,
    }, 'Configuration loaded (secrets redacted)');
  } else {
    logger.error({ errors }, 'Secret validation failed');
  }

  return { valid, errors };
}

export function getFreshdeskApiKey(): string {
  return config.freshdesk.apiKey;
}

export function getFreshdeskDomain(): string {
  return config.freshdesk.domain;
}
