import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getGoogleSheetsClient } from '../services/google-sheets';
import { sendDiscordNotification, testDiscordWebhook, type WeeklyReportData } from '../services/discord';
import { logActivity } from '../persistence/activity-log-repository';
import { markWeeklyReportAsPushed, isWeeklyReportPushed, getWeeklyReportPushStatus } from '../persistence/weekly-report-push-repository';
import { logger } from '../utils/logger';

// Rate limiting for Google Sheets endpoints
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(endpoint);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(endpoint, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

interface AppendReportBody {
  weekEndDate: string;
  totalOpenRfts: number;
  capacityHours: string;
  ticketsCreated: number;
  urgent: number;
  high: number;
  topCompany: string;
  ticketsResolved: number;
  seResolved: number;
  psResolved: number;
  timePerTicket: string;
  seUnresolved: number;
  sePending: number;
  seOpen: number;
  psUnresolved: number;
  psOpen: number;
  psPending: number;
}

export async function registerGoogleSheetsRoutes(fastify: FastifyInstance): Promise<void> {
  // Append weekly report to Google Sheet
  fastify.post<{ Body: AppendReportBody }>(
    '/api/google-sheets/append-report',
    async (request: FastifyRequest<{ Body: AppendReportBody }>, reply: FastifyReply) => {
      if (!checkRateLimit('google-sheets-append')) {
        return reply.status(429).send({
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        });
      }

      try {
        const client = getGoogleSheetsClient();
        const result = await client.appendWeeklyReport(request.body);

        if (!result.success) {
          return reply.status(400).send({
            success: false,
            error: result.message,
          });
        }

        return reply.send({
          success: true,
          message: result.message,
          rowsAppended: result.rowsAppended,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to append report to Google Sheets');
        
        await logActivity({
          activityType: 'GOOGLE_SHEETS_ERROR',
          description: 'Failed to append weekly report',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        });

        throw error;
      }
    }
  );

  // Push weekly report to Google Sheet (simplified endpoint for frontend)
  // ONLY allows current week to be pushed
  // Also sends Discord notification after successful push
  fastify.post<{ Body: {
    snapshotId: string;
    weekEndDate: string;
    ticketsCreated: number;
    ticketsResolved: number;
    urgent: number;
    high: number;
    engineerHours: { name: string; hours: number }[];
    totalHours: number;
    // Additional fields for Discord notification
    totalOpenRfts?: string;
    rftClosuresThisWeek?: number;
    topCompany?: string;
    seResolved?: number;
    psResolved?: number;
    seUnresolved?: number;
    seOpen?: number;
    sePending?: number;
    psUnresolved?: number;
    psOpen?: number;
    psPending?: number;
    markedReleaseCount?: number;
  } }>(
    '/api/google-sheets/push-weekly-report',
    async (request, reply) => {
      if (!checkRateLimit('google-sheets-push')) {
        return reply.status(429).send({
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        });
      }

      const { 
        snapshotId, weekEndDate, ticketsCreated, ticketsResolved, urgent, high, engineerHours, totalHours,
        totalOpenRfts, rftClosuresThisWeek, topCompany, seResolved, psResolved,
        seUnresolved, seOpen, sePending, psUnresolved, psOpen, psPending, markedReleaseCount
      } = request.body;

      // Validate: Only allow current week to be pushed
      const reportDate = new Date(weekEndDate);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (reportDate < oneWeekAgo) {
        return reply.status(400).send({
          success: false,
          error: 'Only current week report can be pushed to Google Sheet. Historical reports cannot be pushed.',
        });
      }

      // }

      try {
        const client = getGoogleSheetsClient();
        const initialized = await client.initialize();

        if (!initialized) {
          return reply.status(400).send({
            success: false,
            error: 'Google Sheets not configured. Please set GOOGLE_SHEETS_URL in settings.',
          });
        }

        // HARDCODED STATS FOR DEC 26 WEEK (temporary override)
        const isDec26Week = weekEndDate.includes('2025-12-26') || weekEndDate.includes('26-12-2025');
        if (isDec26Week) {
          logger.info('Using hardcoded stats for Dec 26 week');
          
          const hardcodedReportData: AppendReportBody = {
            weekEndDate: '2025-12-26T17:00:00.000Z',
            totalOpenRfts: 50879,
            capacityHours: '78 (Siddharth: 38hrs, Taqi: 40hrs)',
            ticketsCreated: 12,
            urgent: 4,
            high: 5,
            topCompany: 'JSSCP',
            ticketsResolved: 24,
            seResolved: 21,
            psResolved: 3,
            timePerTicket: '3.7 hrs',
            seUnresolved: 31,
            sePending: 21,
            seOpen: 10,
            psUnresolved: 12,
            psOpen: 3,
            psPending: 9,
          };
          
          const result = await client.appendWeeklyReport(hardcodedReportData);
          
          if (!result.success) {
            return reply.status(400).send({
              success: false,
              error: result.message,
            });
          }

          await logActivity({
            activityType: 'GOOGLE_SHEETS_PUSH',
            description: `Weekly report pushed for ${snapshotId} (HARDCODED DEC 26 STATS)`,
            metadata: { snapshotId, hardcoded: true },
          });

          logger.info({ snapshotId }, 'Weekly report pushed to Google Sheet (HARDCODED)');

          // Mark report as pushed in database
          await markWeeklyReportAsPushed(snapshotId, 'admin');

          // Send Discord notification with hardcoded stats
          let discordSent = false;
          try {
            const discordData: WeeklyReportData = {
              weekEnd: '2025-12-26T17:00:00.000Z',
              totalOpenRfts: '50,879',
              rftClosuresThisWeek: 0,
              ticketsCreated: 12,
              ticketsResolved: 24,
              urgentTickets: 4,
              highTickets: 5,
              topCompany: 'JSSCP',
              seResolved: 21,
              psResolved: 3,
              seUnresolved: 31,
              seOpen: 10,
              sePending: 21,
              psUnresolved: 12,
              psOpen: 3,
              psPending: 9,
              markedReleaseCount: 0,
              capacityHours: 78,
            };
            
            discordSent = await sendDiscordNotification(discordData);
            if (discordSent) {
              logger.info('Discord notification sent with hardcoded stats');
            }
          } catch (discordError) {
            logger.error({ error: discordError }, 'Failed to send Discord notification (non-blocking)');
          }

          return reply.send({
            success: true,
            message: 'Report pushed to Google Sheet successfully (HARDCODED STATS)',
            rowsAppended: result.rowsAppended,
            discordNotificationSent: discordSent,
            weeklyReportPushed: true,
          });
        }

        const capacityHours = engineerHours.map(e => `${e.name}: ${e.hours}hrs`).join(', ');
        // Time per ticket: Total Hours / SE Resolved (Support Engineers group only)
        const seResolvedCount = seResolved || 0;
        const timePerTicket = seResolvedCount > 0 ? (totalHours / seResolvedCount).toFixed(1) : 'N/A';

        const reportData: AppendReportBody = {
          weekEndDate: weekEndDate || new Date().toISOString(),
          totalOpenRfts: parseInt(String(totalOpenRfts || '0').replace(/[^0-9]/g, '')) || 0,
          capacityHours: `${totalHours} (${capacityHours})`,
          ticketsCreated,
          urgent,
          high,
          topCompany: topCompany || '-',
          ticketsResolved,
          seResolved: seResolved || 0,
          psResolved: psResolved || 0,
          timePerTicket: `${timePerTicket} hrs`,
          seUnresolved: seUnresolved || 0,
          sePending: sePending || 0,
          seOpen: seOpen || 0,
          psUnresolved: psUnresolved || 0,
          psOpen: psOpen || 0,
          psPending: psPending || 0,
        };

        const result = await client.appendWeeklyReport(reportData);

        if (!result.success) {
          return reply.status(400).send({
            success: false,
            error: result.message,
          });
        }

        await logActivity({
          activityType: 'GOOGLE_SHEETS_PUSH',
          description: `Weekly report pushed for ${snapshotId}`,
          metadata: { snapshotId, totalHours, ticketsResolved },
        });

        logger.info({ snapshotId, totalHours }, 'Weekly report pushed to Google Sheet');

        // Mark report as pushed in database (prevents duplicate pushes and locks entry)
        await markWeeklyReportAsPushed(snapshotId, 'admin');

        // Send Discord notification after successful Google Sheets push
        let discordSent = false;
        try {
          const discordData: WeeklyReportData = {
            weekEnd: weekEndDate,
            totalOpenRfts: totalOpenRfts || 'N/A',
            rftClosuresThisWeek: rftClosuresThisWeek || 0,
            ticketsCreated,
            ticketsResolved,
            urgentTickets: urgent,
            highTickets: high,
            topCompany: topCompany || 'N/A',
            seResolved: seResolved || 0,
            psResolved: psResolved || 0,
            seUnresolved: seUnresolved || 0,
            seOpen: seOpen || 0,
            sePending: sePending || 0,
            psUnresolved: psUnresolved || 0,
            psOpen: psOpen || 0,
            psPending: psPending || 0,
            markedReleaseCount: markedReleaseCount || 0,
            capacityHours: totalHours,
          };
          
          discordSent = await sendDiscordNotification(discordData);
          if (discordSent) {
            logger.info('Discord notification sent after Google Sheets push');
          }
        } catch (discordError) {
          logger.error({ error: discordError }, 'Failed to send Discord notification (non-blocking)');
        }

        return reply.send({
          success: true,
          message: 'Report pushed to Google Sheet successfully',
          rowsAppended: result.rowsAppended,
          discordNotificationSent: discordSent,
          weeklyReportPushed: true,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to push weekly report to Google Sheets');
        throw error;
      }

  // Test Discord webhook connection
  fastify.post('/api/discord/test', async (_request, reply) => {
    if (!checkRateLimit('discord-test')) {
      return reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded. Please wait before trying again.',
      });
    }

    const result = await testDiscordWebhook();
    return reply.send({
      success: result.success,
      message: result.message,
    });
  });

  // Test Google Sheets connection
  fastify.get('/api/google-sheets/test', async (_request, reply) => {
    if (!checkRateLimit('google-sheets-test')) {
      return reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded. Please wait before trying again.',
      });
    }

    try {
      const client = getGoogleSheetsClient();
      const initialized = await client.initialize();

      return reply.send({
        success: true,
        data: {
          configured: initialized,
          message: initialized 
            ? 'Google Sheets is configured and ready' 
            : 'Google Sheets URL not configured. Set GOOGLE_sheets_URL in settings.',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to test Google Sheets connection');
      throw error;
    }
  });

  // Check if weekly report has been pushed
  fastify.get<{ Querystring: { snapshotId: string } }>(
    '/api/weekly-report/push-status',
    async (request, reply) => {
      const { snapshotId } = request.query;

      if (!snapshotId) {
        return reply.status(400).send({
          success: false,
          error: 'snapshotId is required',
        });
      }

      try {
        const status = await getWeeklyReportPushStatus(snapshotId);

        return reply.send({
          success: true,
          data: {
            isPushed: status !== null,
            pushedAt: status?.pushedAt || null,
            pushedBy: status?.pushedBy || null,
          },
        });
      } catch (error) {
        logger.error({ error, snapshotId }, 'Failed to check push status');
        throw error;
      }
    }
  );
}
