import dotenv from 'dotenv';

dotenv.config();

export interface FreshdeskConfig {
  readonly domain: string;
  readonly apiKey: string;
}

export interface DatabaseConfig {
  readonly url: string;
}

export interface FirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
}

export interface SchedulerConfig {
  readonly timezone: string;
  readonly weeklyJobDay: number;
  readonly weeklyJobHour: number;
  readonly weeklyJobMinute: number;
}

export interface MetabaseConfig {
  readonly url: string;
  readonly username: string;
  readonly password: string;
  readonly rftQuestionId: number;
}

export interface EnvironmentConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: string;
  readonly freshdesk: FreshdeskConfig;
  readonly database: DatabaseConfig;
  readonly firebase: FirebaseConfig;
  readonly scheduler: SchedulerConfig;
  readonly metabase: MetabaseConfig;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: EnvironmentConfig = {
  port: parseInt(getOptionalEnv('PORT', '3000'), 10),
  host: getOptionalEnv('HOST', '0.0.0.0'),
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),

  freshdesk: {
    domain: getRequiredEnv('FRESHDESK_DOMAIN'),
    apiKey: getRequiredEnv('FRESHDESK_API_KEY'),
  },

  database: {
    url: getRequiredEnv('DATABASE_URL'),
  },

  firebase: {
    apiKey: getRequiredEnv('FIREBASE_API_KEY'),
    authDomain: getRequiredEnv('FIREBASE_AUTH_DOMAIN'),
    projectId: getRequiredEnv('FIREBASE_PROJECT_ID'),
  },

  scheduler: {
    timezone: getOptionalEnv('SCHEDULER_TIMEZONE', 'Asia/Kolkata'),
    weeklyJobDay: 5,
    weeklyJobHour: 16,
    weeklyJobMinute: 30,
  },

  metabase: {
    url: getRequiredEnv('METABASE_URL'),
    username: getRequiredEnv('METABASE_USERNAME'),
    password: getRequiredEnv('METABASE_PASSWORD'),
    rftQuestionId: parseInt(getOptionalEnv('METABASE_RFT_QUESTION_ID', '4848'), 10),
  },
} as const;
