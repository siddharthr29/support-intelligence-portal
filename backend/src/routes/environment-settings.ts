import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireFounder } from '../middleware/role-check';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../persistence/prisma-client';

/**
 * Environment Settings Routes
 * Allows founders to view and update environment variables
 * 
 * Security:
 * - Only accessible by founder role
 * - Sensitive values are masked in responses
 * - All changes are logged
 */

export async function registerEnvironmentSettingsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get current environment settings (masked)
  fastify.get('/api/settings/environment', {
    preHandler: [authMiddleware, requireFounder],
  }, async (request, reply) => {
    try {
      // Return current environment variables (masked)
      const settings = {
        FRESHDESK_DOMAIN: process.env.FRESHDESK_DOMAIN || '',
        FRESHDESK_API_KEY: maskSecret(process.env.FRESHDESK_API_KEY),
        METABASE_URL: process.env.METABASE_URL || process.env.METABASE_SITE_URL || '',
        METABASE_USERNAME: process.env.METABASE_USERNAME || '',
        METABASE_PASSWORD: maskSecret(process.env.METABASE_PASSWORD),
        METABASE_SECRET_KEY: maskSecret(process.env.METABASE_SECRET_KEY),
        CONFIG_ENCRYPTION_KEY: maskSecret(process.env.CONFIG_ENCRYPTION_KEY),
        DISCORD_WEBHOOK_URL: maskSecret(process.env.DISCORD_WEBHOOK_URL),
        DATABASE_URL: maskDatabaseUrl(process.env.DATABASE_URL),
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
        FIREBASE_PRIVATE_KEY_BASE64: maskSecret(process.env.FIREBASE_PRIVATE_KEY_BASE64),
      };

      return reply.send({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch environment settings');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve environment settings',
      });
    }
  });

  // Update environment settings
  fastify.post<{
    Body: Record<string, string>;
  }>('/api/settings/environment', {
    preHandler: [authMiddleware, requireFounder],
  }, async (request, reply) => {
    try {
      const updates = request.body;
      const user = (request as any).user;

      // Validate that only allowed keys are being updated
      const allowedKeys = [
        'FRESHDESK_DOMAIN',
        'FRESHDESK_API_KEY',
        'METABASE_URL',
        'METABASE_USERNAME',
        'METABASE_PASSWORD',
        'METABASE_SECRET_KEY',
        'CONFIG_ENCRYPTION_KEY',
        'DISCORD_WEBHOOK_URL',
        'DATABASE_URL',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY_BASE64',
      ];

      const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));
      if (invalidKeys.length > 0) {
        return reply.status(400).send({
          success: false,
          error: `Invalid keys: ${invalidKeys.join(', ')}`,
        });
      }

      // Store settings in database for persistence
      const prisma = getPrismaClient();
      
      for (const [key, value] of Object.entries(updates)) {
        if (value && value.trim() !== '') {
          await prisma.systemConfig.upsert({
            where: { key },
            update: { 
              value,
              updatedAt: new Date(),
            },
            create: {
              key,
              value,
            },
          });

          logger.info({ 
            key, 
            updatedBy: user.email,
            masked: key.includes('KEY') || key.includes('PASSWORD') || key.includes('SECRET')
          }, 'Environment variable updated');
        }
      }

      return reply.send({
        success: true,
        message: 'Environment settings updated. Restart backend to apply changes.',
        data: {
          updated: Object.keys(updates).length,
          requiresRestart: true,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update environment settings');
      return reply.status(500).send({
        success: false,
        error: 'Failed to update environment settings',
      });
    }
  });

  logger.info('Environment settings routes registered');
}

// Helper functions
function maskSecret(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return maskSecret(url);
  }
}
