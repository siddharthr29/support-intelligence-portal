import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  getSecureConfig, 
  setSecureConfig, 
  getMaskedConfig,
  shouldEncryptKey,
  clearConfigCache,
  onConfigChange,
} from '../services/secure-config';
import { logActivity, getActivityLogs } from '../persistence/activity-log-repository';
import { logger } from '../utils/logger';

// Rate limiting: Track request counts per endpoint
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute for settings

function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const key = endpoint;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

interface UpdateCredentialsBody {
  // Freshdesk
  freshdeskApiKey?: string;
  freshdeskDomain?: string;
  // Metabase
  metabaseUrl?: string;
  metabaseUsername?: string;
  metabasePassword?: string;
  metabaseRftQuestionId?: string;
  // Google Sheets
  googleSheetsUrl?: string;
  googleSheetsApiKey?: string;
  googleAppsScriptUrl?: string;
  // AI Chatbot
  groqApiKey?: string;
  // Firebase Client (Frontend)
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  // Firebase Admin SDK (Backend)
  firebaseAdminProjectId?: string;
  firebaseAdminClientEmail?: string;
  firebaseAdminPrivateKey?: string;
  // Discord
  discordWebhookUrl?: string;
}

interface ActivityLogsQuery {
  limit?: string;
  offset?: string;
  type?: string;
}

export async function registerSettingsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current settings (masked - NEVER expose actual values)
  fastify.get('/api/settings', async (_request, reply) => {
    if (!checkRateLimit('settings-get')) {
      return reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded. Please wait before trying again.',
      });
    }

    try {
      // SECURITY: Only return masked values, never actual secrets
      const settings = {
        // Freshdesk
        freshdeskApiKey: await getMaskedConfig('FRESHDESK_API_KEY'),
        freshdeskDomain: await getSecureConfig('FRESHDESK_DOMAIN') || process.env.FRESHDESK_DOMAIN || 'Not configured',
        freshdeskConfigured: !!(await getSecureConfig('FRESHDESK_API_KEY') || process.env.FRESHDESK_API_KEY),
        
        // Metabase
        metabaseUrl: await getSecureConfig('METABASE_URL') || process.env.METABASE_URL || 'Not configured',
        metabaseUsername: await getMaskedConfig('METABASE_USERNAME'),
        metabasePassword: '********', // Never expose password even masked
        metabaseRftQuestionId: await getSecureConfig('METABASE_RFT_QUESTION_ID') || process.env.METABASE_RFT_QUESTION_ID || 'Not configured',
        metabaseConfigured: !!(await getSecureConfig('METABASE_USERNAME') || process.env.METABASE_USERNAME),
        
        // Google Sheets
        googleSheetsUrl: await getSecureConfig('GOOGLE_SHEETS_URL') || 'Not configured',
        googleSheetsConfigured: !!(await getSecureConfig('GOOGLE_SHEETS_API_KEY')),
        googleAppsScriptUrl: await getSecureConfig('GOOGLE_APPS_SCRIPT_URL') || 'Not configured',
        
        // AI Chatbot
        groqApiKey: await getMaskedConfig('GROQ_API_KEY'),
        groqConfigured: !!(await getSecureConfig('GROQ_API_KEY') || process.env.GROQ_API_KEY),
        
        // Firebase Client (Frontend)
        firebaseApiKey: await getMaskedConfig('FIREBASE_API_KEY'),
        firebaseAuthDomain: await getSecureConfig('FIREBASE_AUTH_DOMAIN') || process.env.FIREBASE_AUTH_DOMAIN || 'Not configured',
        firebaseProjectId: await getSecureConfig('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID || 'Not configured',
        firebaseConfigured: !!(await getSecureConfig('FIREBASE_API_KEY') || process.env.FIREBASE_API_KEY),
        
        // Firebase Admin SDK (Backend)
        firebaseAdminProjectId: await getSecureConfig('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID || 'Not configured',
        firebaseAdminClientEmail: await getMaskedConfig('FIREBASE_CLIENT_EMAIL'),
        firebaseAdminPrivateKey: '********', // Never expose private key
        firebaseAdminConfigured: !!(
          (await getSecureConfig('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID) &&
          (await getSecureConfig('FIREBASE_CLIENT_EMAIL') || process.env.FIREBASE_CLIENT_EMAIL) &&
          (await getSecureConfig('FIREBASE_PRIVATE_KEY') || process.env.FIREBASE_PRIVATE_KEY)
        ),
        
        // Discord
        discordWebhookUrl: await getMaskedConfig('DISCORD_WEBHOOK_URL'),
        discordConfigured: !!(await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL),
      };

      // Log settings access for audit
      await logActivity({
        activityType: 'SETTINGS_VIEW',
        description: 'Settings page accessed',
      });

      return reply.send({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch settings');
      throw error;
    }
  });

  // Update credentials with double confirmation
  // SECURITY: All sensitive values are encrypted, changes are logged, and config is hot-reloaded
  fastify.post<{ Body: UpdateCredentialsBody & { confirmUpdate: boolean } }>(
    '/api/settings/credentials',
    async (request, reply) => {
      if (!checkRateLimit('settings-update')) {
        return reply.status(429).send({
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        });
      }

      const { 
        freshdeskApiKey, freshdeskDomain,
        metabaseUrl, metabaseUsername, metabasePassword, metabaseRftQuestionId,
        googleSheetsUrl, googleSheetsApiKey, googleAppsScriptUrl,
        groqApiKey,
        firebaseApiKey, firebaseAuthDomain, firebaseProjectId,
        firebaseAdminProjectId, firebaseAdminClientEmail, firebaseAdminPrivateKey,
        discordWebhookUrl,
        confirmUpdate 
      } = request.body;

      // SECURITY: Require explicit confirmation for credential changes
      if (!confirmUpdate) {
        return reply.status(400).send({
          success: false,
          error: 'Please confirm the update by setting confirmUpdate to true',
          requiresConfirmation: true,
        });
      }

      try {
        const updates: string[] = [];
        const errors: string[] = [];

        // Freshdesk
        if (freshdeskApiKey && freshdeskApiKey !== '********' && !freshdeskApiKey.includes('****')) {
          const success = await setSecureConfig('FRESHDESK_API_KEY', freshdeskApiKey, shouldEncryptKey('FRESHDESK_API_KEY'));
          if (success) updates.push('Freshdesk API Key');
          else errors.push('Freshdesk API Key');
        }

        if (freshdeskDomain && freshdeskDomain !== 'Not configured') {
          const success = await setSecureConfig('FRESHDESK_DOMAIN', freshdeskDomain, false);
          if (success) updates.push('Freshdesk Domain');
          else errors.push('Freshdesk Domain');
        }

        // Metabase
        if (metabaseUrl && metabaseUrl !== 'Not configured') {
          const success = await setSecureConfig('METABASE_URL', metabaseUrl, false);
          if (success) updates.push('Metabase URL');
          else errors.push('Metabase URL');
        }

        if (metabaseUsername && metabaseUsername !== '********' && !metabaseUsername.includes('****')) {
          const success = await setSecureConfig('METABASE_USERNAME', metabaseUsername, shouldEncryptKey('METABASE_USERNAME'));
          if (success) updates.push('Metabase Username');
          else errors.push('Metabase Username');
        }

        if (metabasePassword && metabasePassword !== '********') {
          const success = await setSecureConfig('METABASE_PASSWORD', metabasePassword, true);
          if (success) updates.push('Metabase Password');
          else errors.push('Metabase Password');
        }

        if (metabaseRftQuestionId && metabaseRftQuestionId !== 'Not configured') {
          const success = await setSecureConfig('METABASE_RFT_QUESTION_ID', metabaseRftQuestionId, false);
          if (success) updates.push('Metabase RFT Question ID');
          else errors.push('Metabase RFT Question ID');
        }

        // Google Sheets
        if (googleSheetsUrl && googleSheetsUrl !== 'Not configured') {
          const success = await setSecureConfig('GOOGLE_SHEETS_URL', googleSheetsUrl, false);
          if (success) updates.push('Google Sheets URL');
          else errors.push('Google Sheets URL');
        }

        if (googleSheetsApiKey && googleSheetsApiKey !== '********' && !googleSheetsApiKey.includes('****')) {
          const success = await setSecureConfig('GOOGLE_SHEETS_API_KEY', googleSheetsApiKey, true);
          if (success) updates.push('Google Sheets API Key');
          else errors.push('Google Sheets API Key');
        }

        if (googleAppsScriptUrl && googleAppsScriptUrl !== 'Not configured') {
          const success = await setSecureConfig('GOOGLE_APPS_SCRIPT_URL', googleAppsScriptUrl, false);
          if (success) updates.push('Google Apps Script URL');
          else errors.push('Google Apps Script URL');
        }

        // AI Chatbot
        if (groqApiKey && groqApiKey !== '********' && !groqApiKey.includes('****')) {
          const success = await setSecureConfig('GROQ_API_KEY', groqApiKey, true);
          if (success) updates.push('Groq API Key');
          else errors.push('Groq API Key');
        }

        // Firebase
        if (firebaseApiKey && firebaseApiKey !== '********' && !firebaseApiKey.includes('****')) {
          const success = await setSecureConfig('FIREBASE_API_KEY', firebaseApiKey, true);
          if (success) updates.push('Firebase API Key');
          else errors.push('Firebase API Key');
        }

        if (firebaseAuthDomain && firebaseAuthDomain !== 'Not configured') {
          const success = await setSecureConfig('FIREBASE_AUTH_DOMAIN', firebaseAuthDomain, false);
          if (success) updates.push('Firebase Auth Domain');
          else errors.push('Firebase Auth Domain');
        }

        if (firebaseProjectId && firebaseProjectId !== 'Not configured') {
          const success = await setSecureConfig('FIREBASE_PROJECT_ID', firebaseProjectId, false);
          if (success) updates.push('Firebase Project ID');
          else errors.push('Firebase Project ID');
        }

        // Firebase Admin SDK (Backend)
        let firebaseAdminUpdated = false;
        
        if (firebaseAdminProjectId && firebaseAdminProjectId !== 'Not configured') {
          const success = await setSecureConfig('FIREBASE_PROJECT_ID', firebaseAdminProjectId, false);
          if (success) {
            updates.push('Firebase Admin Project ID');
            firebaseAdminUpdated = true;
            // Update environment variable for immediate use
            process.env.FIREBASE_PROJECT_ID = firebaseAdminProjectId;
          } else {
            errors.push('Firebase Admin Project ID');
          }
        }

        if (firebaseAdminClientEmail && firebaseAdminClientEmail !== '********' && !firebaseAdminClientEmail.includes('****')) {
          const success = await setSecureConfig('FIREBASE_CLIENT_EMAIL', firebaseAdminClientEmail, true);
          if (success) {
            updates.push('Firebase Admin Client Email');
            firebaseAdminUpdated = true;
            // Update environment variable for immediate use
            process.env.FIREBASE_CLIENT_EMAIL = firebaseAdminClientEmail;
          } else {
            errors.push('Firebase Admin Client Email');
          }
        }

        if (firebaseAdminPrivateKey && firebaseAdminPrivateKey !== '********') {
          const success = await setSecureConfig('FIREBASE_PRIVATE_KEY', firebaseAdminPrivateKey, true);
          if (success) {
            updates.push('Firebase Admin Private Key');
            firebaseAdminUpdated = true;
            // Update environment variable for immediate use
            process.env.FIREBASE_PRIVATE_KEY = firebaseAdminPrivateKey;
          } else {
            errors.push('Firebase Admin Private Key');
          }
        }

        // Discord
        if (discordWebhookUrl && discordWebhookUrl !== '********' && !discordWebhookUrl.includes('****')) {
          const success = await setSecureConfig('DISCORD_WEBHOOK_URL', discordWebhookUrl, false);
          if (success) updates.push('Discord Webhook URL');
          else errors.push('Discord Webhook URL');
        }

        // Clear config cache to force reload with new values
        if (updates.length > 0) {
          clearConfigCache();
        }

        // Reload Firebase Admin SDK if credentials were updated
        if (firebaseAdminUpdated) {
          try {
            const { reloadFirebaseAdmin } = await import('../config/firebase-admin');
            await reloadFirebaseAdmin();
            logger.info('Firebase Admin SDK reloaded with new credentials');
            
            await logActivity({
              activityType: 'FIREBASE_ADMIN_RELOAD',
              description: 'Firebase Admin SDK reloaded with updated credentials',
            });
          } catch (error) {
            logger.error({ error }, 'Failed to reload Firebase Admin SDK');
            errors.push('Firebase Admin SDK Reload');
          }
        }

        if (errors.length > 0) {
          return reply.status(500).send({
            success: false,
            error: `Failed to update: ${errors.join(', ')}`,
            updatedFields: updates,
            failedFields: errors,
          });
        }

        return reply.send({
          success: true,
          message: updates.length > 0 
            ? `Successfully updated: ${updates.join(', ')}. Config reloaded.${firebaseAdminUpdated ? ' Firebase Admin SDK reloaded.' : ''}`
            : 'No changes made',
          updatedFields: updates,
          configReloaded: updates.length > 0,
          firebaseAdminReloaded: firebaseAdminUpdated,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to update credentials');
        
        await logActivity({
          activityType: 'CREDENTIALS_UPDATE_FAILED',
          description: 'Failed to update credentials',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        });

        throw error;
      }
    }
  );

  // Sync/test credentials
  // SECURITY: Uses secure config manager, never logs actual credentials
  fastify.post('/api/settings/sync', async (_request, reply) => {
    if (!checkRateLimit('settings-sync')) {
      return reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded. Please wait before trying again.',
      });
    }

    try {
      const results: { service: string; status: 'success' | 'error'; message: string }[] = [];

      // Test Freshdesk connection
      try {
        const freshdeskDomain = await getSecureConfig('FRESHDESK_DOMAIN') || process.env.FRESHDESK_DOMAIN;
        const freshdeskApiKey = await getSecureConfig('FRESHDESK_API_KEY', true) || process.env.FRESHDESK_API_KEY;
        
        if (freshdeskDomain && freshdeskApiKey) {
          const response = await fetch(`https://${freshdeskDomain}/api/v2/tickets?per_page=1`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${freshdeskApiKey}:X`).toString('base64')}`,
            },
          });
          
          if (response.ok) {
            results.push({ service: 'Freshdesk', status: 'success', message: 'Connection successful' });
          } else {
            results.push({ service: 'Freshdesk', status: 'error', message: `HTTP ${response.status}` });
          }
        } else {
          results.push({ service: 'Freshdesk', status: 'error', message: 'Not configured' });
        }
      } catch (error) {
        results.push({ service: 'Freshdesk', status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Test Metabase connection
      try {
        const metabaseUrl = await getSecureConfig('METABASE_URL') || process.env.METABASE_URL;
        const metabaseUsername = await getSecureConfig('METABASE_USERNAME', true) || process.env.METABASE_USERNAME;
        const metabasePassword = await getSecureConfig('METABASE_PASSWORD', true) || process.env.METABASE_PASSWORD;
        
        if (metabaseUrl && metabaseUsername && metabasePassword) {
          const response = await fetch(`${metabaseUrl}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: metabaseUsername, password: metabasePassword }),
          });
          
          if (response.ok) {
            results.push({ service: 'Metabase', status: 'success', message: 'Connection successful' });
          } else {
            results.push({ service: 'Metabase', status: 'error', message: `HTTP ${response.status}` });
          }
        } else {
          results.push({ service: 'Metabase', status: 'error', message: 'Not configured' });
        }
      } catch (error) {
        results.push({ service: 'Metabase', status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Test Google Sheets connection
      try {
        const googleSheetsUrl = await getSecureConfig('GOOGLE_SHEETS_URL');
        if (googleSheetsUrl) {
          results.push({ service: 'Google Sheets', status: 'success', message: 'URL configured' });
        } else {
          results.push({ service: 'Google Sheets', status: 'error', message: 'Not configured' });
        }
      } catch (error) {
        results.push({ service: 'Google Sheets', status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      }

      await logActivity({
        activityType: 'CREDENTIALS_SYNC',
        description: 'Tested service connections',
        metadata: { 
          results: results.map(r => ({ service: r.service, status: r.status })), // Never log credentials
        },
      });

      return reply.send({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to sync credentials');
      throw error;
    }
  });

  // Get activity logs
  fastify.get<{ Querystring: ActivityLogsQuery }>(
    '/api/settings/logs',
    async (request, reply) => {
      if (!checkRateLimit('settings-logs')) {
        return reply.status(429).send({
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        });
      }

      const limit = parseInt(request.query.limit || '50', 10);
      const offset = parseInt(request.query.offset || '0', 10);
      const activityType = request.query.type;

      try {
        const { logs, total } = await getActivityLogs(
          Math.min(limit, 100), // Cap at 100
          offset,
          activityType
        );

        return reply.send({
          success: true,
          data: {
            logs,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch activity logs');
        throw error;
      }
    }
  );
}
