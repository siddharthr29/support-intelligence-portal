/**
 * Discord Webhook Service
 * Sends weekly report notifications to Discord
 */

import { logger } from '../../utils/logger';
import { getSecureConfig } from '../secure-config';

export interface WeeklyReportData {
  weekEnd: string;
  totalOpenRfts: string;
  rftClosuresThisWeek: number;
  ticketsCreated: number;
  ticketsResolved: number;
  urgentTickets: number;
  highTickets: number;
  topCompany: string;
  seResolved: number;
  psResolved: number;
  seUnresolved: number;
  seOpen: number;
  sePending: number;
  psUnresolved: number;
  psOpen: number;
  psPending: number;
  markedReleaseCount: number;
  capacityHours?: number;
  dashboardUrl?: string;
}

/**
 * Send weekly report to Discord via webhook
 */
export async function sendDiscordNotification(data: WeeklyReportData): Promise<boolean> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured, skipping notification');
    return false;
  }

  const message = formatDiscordMessage(data);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Discord webhook failed');
      return false;
    }

    logger.info('Discord notification sent successfully');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to send Discord notification');
    return false;
  }
}

/**
 * Format the weekly report as a Discord embed message
 */
function formatDiscordMessage(data: WeeklyReportData) {
  const rftClosuresText = `(${data.rftClosuresThisWeek.toLocaleString()} closed this week)`;
  
  return {
    username: 'Support Intelligence Bot',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
    embeds: [
      {
        title: '📊 Weekly Support Report',
        description: `**Week ending on:** ${data.weekEnd}`,
        color: 0x419372, // Avni green
        fields: [
          {
            name: '📈 RFTs',
            value: `**Total Open:** ${data.totalOpenRfts} ${rftClosuresText}`,
            inline: false,
          },
          {
            name: '🎫 Tickets Created',
            value: `**Total:** ${data.ticketsCreated}\n🔴 Urgent: ${data.urgentTickets} | 🟠 High: ${data.highTickets}`,
            inline: true,
          },
          {
            name: '✅ Tickets Resolved',
            value: `**Total:** ${data.ticketsResolved}\nSE: ${data.seResolved} | PS: ${data.psResolved}`,
            inline: true,
          },
          {
            name: '💼 Top Customer',
            value: data.topCompany || 'N/A',
            inline: true,
          },
          {
            name: '📋 Unresolved - Support Engineers',
            value: `**Total:** ${data.seUnresolved}\nOpen: ${data.seOpen} | Pending: ${data.sePending}`,
            inline: true,
          },
          {
            name: '📋 Unresolved - Product Support',
            value: `**Total:** ${data.psUnresolved}\nOpen: ${data.psOpen} | Pending: ${data.psPending}\nMarked Release: ${data.markedReleaseCount}`,
            inline: true,
          },
        ],
        footer: {
          text: 'Support Intelligence Dashboard',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Test Discord webhook connection
 */
export async function testDiscordWebhook(): Promise<{ success: boolean; message: string }> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return { success: false, message: 'Discord webhook URL not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Support Intelligence Bot',
        content: '✅ **Test Message** - Discord integration is working!',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Webhook failed: ${response.status} - ${errorText}` };
    }

    return { success: true, message: 'Test message sent successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send reminder to add engineer hours (Friday 2pm IST)
 */
export async function sendDiscordReminder(): Promise<boolean> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured, skipping reminder');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Support Intelligence Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
        embeds: [
          {
            title: '⏰ Reminder: Add Engineer Hours',
            description: 'Weekly report will be generated at **5:00 PM IST**.\n\nPlease add support engineer hours before then!',
            color: 0xFFA500, // Orange
            fields: [
              {
                name: '📝 Action Required',
                value: 'Go to **Weekly Report** → Click **Enter Support Hours** → Add hours for each engineer',
                inline: false,
              },
            ],
            footer: {
              text: 'Support Intelligence Dashboard',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Discord reminder failed');
      return false;
    }

    logger.info('Discord reminder sent successfully');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to send Discord reminder');
    return false;
  }
}

/**
 * Send automated weekly report notification (Friday 5pm IST)
 * Checks if engineer hours have been added - if not, sends reminder instead
 */
export async function sendDiscordWeeklyReport(): Promise<boolean> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured, skipping weekly report notification');
    return false;
  }

  // Check if engineer hours have been added for current week
  const hasEngineerHours = await checkEngineerHoursAdded();
  
  let embed;
  if (hasEngineerHours) {
    embed = {
      title: '📊 Weekly Report Ready',
      description: 'The weekly support data has been synced!\n\nPlease review and push the report to Google Sheets.',
      color: 0x419372, // Avni green
      fields: [
        {
          name: '📝 Next Steps',
          value: '1. Go to **Weekly Report** page\n2. Review the statistics\n3. Click **Push to Sheet** to save & notify',
          inline: false,
        },
      ],
      footer: {
        text: 'Support Intelligence Dashboard',
      },
      timestamp: new Date().toISOString(),
    };
  } else {
    // No engineer hours added - send urgent reminder
    embed = {
      title: '🚨 URGENT: Engineer Hours Missing!',
      description: 'Weekly report is ready but **engineer hours have NOT been added**.\n\n⚠️ Report cannot be pushed to Google Sheet without engineer hours!',
      color: 0xFF0000, // Red
      fields: [
        {
          name: '📝 Action Required NOW',
          value: '1. Go to **Weekly Report** page\n2. Click **Enter Support Hours**\n3. Add hours for each engineer\n4. Then click **Push to Sheet**',
          inline: false,
        },
      ],
      footer: {
        text: 'Support Intelligence Dashboard',
      },
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Support Intelligence Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Discord weekly report notification failed');
      return false;
    }

    logger.info({ hasEngineerHours }, 'Discord weekly report notification sent successfully');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to send Discord weekly report notification');
    return false;
  }
}

/**
 * Check if engineer hours have been added for the current week
 */
async function checkEngineerHoursAdded(): Promise<boolean> {
  try {
    const { getPrismaClient } = await import('../../persistence/prisma-client');
    const prisma = getPrismaClient();
    
    // Get current week boundaries (Friday to Friday in IST)
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    
    // Find the most recent Friday 5pm IST
    const dayOfWeek = istNow.getDay();
    const daysFromFriday = (dayOfWeek + 2) % 7; // Days since last Friday
    const lastFriday = new Date(istNow);
    lastFriday.setDate(istNow.getDate() - daysFromFriday);
    lastFriday.setHours(17, 0, 0, 0);
    
    const weekStart = new Date(lastFriday);
    weekStart.setDate(lastFriday.getDate() - 7);
    
    // Check if any engineer hours exist for this week
    const engineerHours = await prisma.engineerHours.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lte: lastFriday,
        },
      },
    });
    
    logger.info({ 
      weekStart: weekStart.toISOString(), 
      weekEnd: lastFriday.toISOString(),
      hoursCount: engineerHours.length 
    }, 'Checked engineer hours for current week');
    
    return engineerHours.length > 0;
  } catch (error) {
    logger.error({ error }, 'Failed to check engineer hours');
    return false; // Assume not added if error
  }
}
