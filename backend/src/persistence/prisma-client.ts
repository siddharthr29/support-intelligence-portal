import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let prismaClient: PrismaClient | null = null;
let isConnecting = false;

// Get database URL with connection pool settings
function getDatabaseUrlWithPooling(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Add connection pool settings if not already present
  if (baseUrl && !baseUrl.includes('connection_limit')) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    // Increase pool settings for better handling of concurrent requests
    // pool_timeout=30 = wait 30 seconds for a connection before failing
    // connection_limit=10 = max 10 connections
    return `${baseUrl}${separator}connection_limit=10&pool_timeout=30`;
  }
  
  return baseUrl;
}

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      datasources: {
        db: {
          url: getDatabaseUrlWithPooling(),
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaClient as any).$on('error', (e: unknown) => {
      logger.error({ error: e }, 'Prisma error');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaClient as any).$on('warn', (e: unknown) => {
      logger.warn({ warning: e }, 'Prisma warning');
    });
  }

  return prismaClient;
}

// Ensure connection is established
export async function ensureConnection(): Promise<PrismaClient> {
  const client = getPrismaClient();
  if (!isConnecting) {
    isConnecting = true;
    try {
      await client.$connect();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to database');
      isConnecting = false;
      throw error;
    }
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
    logger.info('Prisma client disconnected');
  }
}

export async function connectPrisma(): Promise<void> {
  const client = getPrismaClient();
  await client.$connect();
  logger.info('Prisma client connected');
}
