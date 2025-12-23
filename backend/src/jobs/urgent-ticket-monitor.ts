import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createFreshdeskClient } from '../services/freshdesk';
import { getSecureConfig } from '../services/secure-config';

let monitorTask: cron.ScheduledTask | null = null;
const notifiedTickets = new Set<number>();

interface UrgentTicket {
  id: number;
  subject: string;
  description_text: string;
  priority: number;
  status: number;
  type: string;
  created_at: string;
  updated_at: string;
  requester: {
    name: string;
    email: string;
  };
  group_id: number | null;
  responder_id: number | null;
}

async function sendUrgentTicketNotification(ticket: UrgentTicket): Promise<boolean> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured, skipping urgent ticket notification');
    return false;
  }

  const ticketUrl = `https://avni.freshdesk.com/a/tickets/${ticket.id}`;
  
  const PRIORITY_NAMES: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Urgent',
  };

  const STATUS_NAMES: Record<number, string> = {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed',
  };

  const priorityName = PRIORITY_NAMES[ticket.priority] || 'Unknown';
  const statusName = STATUS_NAMES[ticket.status] || 'Unknown';

  const embed = {
    title: '🚨 URGENT TICKET ALERT',
    description: ticket.subject,
    color: 0xFF0000,
    fields: [
      {
        name: '🎫 Ticket ID',
        value: `#${ticket.id}`,
        inline: true,
      },
      {
        name: '⚡ Priority',
        value: priorityName,
        inline: true,
      },
      {
        name: '📊 Status',
        value: statusName,
        inline: true,
      },
      {
        name: '👤 Requester',
        value: ticket.requester?.name || 'Unknown',
        inline: true,
      },
      {
        name: '🕐 Created',
        value: new Date(ticket.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        inline: true,
      },
      {
        name: '🔗 Link',
        value: `[View Ticket](${ticketUrl})`,
        inline: false,
      },
    ],
    footer: {
      text: 'Freshdesk Urgent Ticket Monitor',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: '@here',
        username: 'Freshdesk Alert Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2965/2965226.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Discord urgent ticket notification failed');
      return false;
    }

    logger.info({ ticketId: ticket.id, priority: priorityName }, 'Discord urgent ticket notification sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, ticketId: ticket.id }, 'Failed to send Discord urgent ticket notification');
    return false;
  }
}

async function checkForUrgentTickets(): Promise<void> {
  try {
    const client = createFreshdeskClient();
    
    // Fetch tickets created in the last 24 hours with urgent priority
    // We rely on notifiedTickets Set to prevent duplicates, not the time window
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    logger.info('Checking for urgent tickets...');
    
    // Use Freshdesk search API with proper query format
    // Query: priority:4 AND created_at:>YYYY-MM-DD
    // Using created_at instead of updated_at to catch new urgent tickets
    const query = encodeURIComponent(`priority:4 AND created_at:>'${oneDayAgo}'`);
    const response = await fetch(
      `https://${config.freshdesk.domain}/api/v2/search/tickets?query="${query}"`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.freshdesk.apiKey}:X`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Failed to fetch urgent tickets from Freshdesk');
      return;
    }

    const data = await response.json() as { total: number; results: UrgentTicket[] };
    const tickets = data.results || [];
    
    logger.info({ ticketCount: tickets.length }, 'Fetched urgent tickets from Freshdesk');

    // Process each urgent ticket
    for (const ticket of tickets) {
      // Skip if already notified
      if (notifiedTickets.has(ticket.id)) {
        continue;
      }

      // Skip if ticket is closed or resolved
      if (ticket.status === 4 || ticket.status === 5) {
        continue;
      }

      // Send Discord notification
      const sent = await sendUrgentTicketNotification(ticket);
      
      if (sent) {
        // Mark as notified
        notifiedTickets.add(ticket.id);
        logger.info({ ticketId: ticket.id }, 'Urgent ticket notification sent and tracked');
      }
    }

    // Clean up old notified tickets (keep last 1000)
    if (notifiedTickets.size > 1000) {
      const ticketsArray = Array.from(notifiedTickets);
      const toRemove = ticketsArray.slice(0, ticketsArray.length - 1000);
      toRemove.forEach(id => notifiedTickets.delete(id));
      logger.info({ removed: toRemove.length }, 'Cleaned up old notified tickets');
    }

  } catch (error) {
    logger.error({ error }, 'Failed to check for urgent tickets');
  }
}

export function startUrgentTicketMonitor(): void {
  const timezone = config.scheduler.timezone;

  // Run every 2 minutes
  const cronExpression = '*/2 * * * *';

  logger.info({
    cronExpression,
    timezone,
    description: 'Every 2 minutes - Check for urgent tickets',
  }, 'Starting urgent ticket monitor');

  monitorTask = cron.schedule(
    cronExpression,
    async () => {
      await checkForUrgentTickets();
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Urgent ticket monitor started successfully');
  
  // Run immediately on startup
  checkForUrgentTickets().catch(error => {
    logger.error({ error }, 'Failed to run initial urgent ticket check');
  });
}

export function stopUrgentTicketMonitor(): void {
  if (monitorTask) {
    monitorTask.stop();
    monitorTask = null;
    logger.info('Urgent ticket monitor stopped');
  }
}

export function isUrgentTicketMonitorRunning(): boolean {
  return monitorTask !== null;
}

export function clearNotifiedTickets(): void {
  notifiedTickets.clear();
  logger.info('Cleared notified tickets cache');
}
