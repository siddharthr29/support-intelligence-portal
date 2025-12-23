import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { getSecureConfig } from '../services/secure-config';

/**
 * Freshdesk Webhook Handler
 * Receives ticket create/update events from Freshdesk and sends Discord notifications for urgent tickets
 * 
 * Freshdesk Webhooks are FREE and do NOT count against API rate limits
 * They are push-based notifications, not pull-based API calls
 */

interface FreshdeskTicketPayload {
  ticket_id: number;
  ticket_subject: string;
  ticket_description?: string;
  ticket_priority: number; // 1=Low, 2=Medium, 3=High, 4=Urgent
  ticket_status: number; // 2=Open, 3=Pending, 4=Resolved, 5=Closed
  ticket_type?: string;
  ticket_created_at?: string;
  ticket_updated_at?: string;
  requester_name?: string;
  requester_email?: string;
  group_name?: string;
  agent_name?: string;
}

interface FreshdeskWebhookPayload {
  freshdesk_webhook: {
    ticket_id: number;
    ticket_subject: string;
    ticket_description: string;
    ticket_priority: number;
    ticket_status: number;
    ticket_type: string;
    ticket_created_at: string;
    ticket_updated_at: string;
    ticket_requester_name: string;
    ticket_requester_email: string;
    ticket_group_name: string;
    ticket_agent_name: string;
  };
}

const PRIORITY_URGENT = 4;
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

async function sendUrgentTicketNotification(ticket: FreshdeskTicketPayload): Promise<boolean> {
  const webhookUrl = await getSecureConfig('DISCORD_WEBHOOK_URL') || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured, skipping urgent ticket notification');
    return false;
  }

  const ticketUrl = `https://avni.freshdesk.com/a/tickets/${ticket.ticket_id}`;
  const priorityName = PRIORITY_NAMES[ticket.ticket_priority] || 'Unknown';
  const statusName = STATUS_NAMES[ticket.ticket_status] || 'Unknown';

  const embed = {
    title: '🚨 URGENT TICKET ALERT',
    description: ticket.ticket_subject,
    color: 0xFF0000, // Red
    fields: [
      {
        name: '🎫 Ticket ID',
        value: `#${ticket.ticket_id}`,
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
        value: ticket.requester_name || 'Unknown',
        inline: true,
      },
      {
        name: '👥 Group',
        value: ticket.group_name || 'Unassigned',
        inline: true,
      },
      {
        name: '🔗 Link',
        value: `[View Ticket](${ticketUrl})`,
        inline: false,
      },
    ],
    footer: {
      text: 'Freshdesk Urgent Ticket Notification',
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

    logger.info({ ticketId: ticket.ticket_id, priority: priorityName }, 'Discord urgent ticket notification sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, ticketId: ticket.ticket_id }, 'Failed to send Discord urgent ticket notification');
    return false;
  }
}

export async function registerFreshdeskWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Freshdesk Webhook Endpoint
   * 
   * Configure in Freshdesk Admin:
   * 1. Go to Admin → Workflows → Automations
   * 2. Create new automation rule
   * 3. Trigger: Ticket is created OR Ticket is updated
   * 4. Condition: Priority is Urgent
   * 5. Action: Trigger webhook → POST to this endpoint
   * 
   * Webhook URL: https://support-intelligence-portal.onrender.com/api/freshdesk/webhook
   */
  fastify.post('/api/freshdesk/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = request.body as FreshdeskWebhookPayload;
      
      logger.info({ 
        ticketId: payload.freshdesk_webhook?.ticket_id,
        priority: payload.freshdesk_webhook?.ticket_priority,
      }, 'Received Freshdesk webhook');

      // Extract ticket data from webhook payload
      const ticket: FreshdeskTicketPayload = {
        ticket_id: payload.freshdesk_webhook.ticket_id,
        ticket_subject: payload.freshdesk_webhook.ticket_subject,
        ticket_description: payload.freshdesk_webhook.ticket_description,
        ticket_priority: payload.freshdesk_webhook.ticket_priority,
        ticket_status: payload.freshdesk_webhook.ticket_status,
        ticket_type: payload.freshdesk_webhook.ticket_type,
        ticket_created_at: payload.freshdesk_webhook.ticket_created_at,
        ticket_updated_at: payload.freshdesk_webhook.ticket_updated_at,
        requester_name: payload.freshdesk_webhook.ticket_requester_name,
        requester_email: payload.freshdesk_webhook.ticket_requester_email,
        group_name: payload.freshdesk_webhook.ticket_group_name,
        agent_name: payload.freshdesk_webhook.ticket_agent_name,
      };

      // Only send notification for URGENT priority tickets
      if (ticket.ticket_priority === PRIORITY_URGENT) {
        await sendUrgentTicketNotification(ticket);
      } else {
        logger.info({ 
          ticketId: ticket.ticket_id, 
          priority: PRIORITY_NAMES[ticket.ticket_priority] 
        }, 'Skipping Discord notification - not urgent priority');
      }

      // Always return 200 OK to Freshdesk to acknowledge receipt
      return reply.status(200).send({
        success: true,
        message: 'Webhook received',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to process Freshdesk webhook');
      
      // Still return 200 to Freshdesk to prevent retries
      return reply.status(200).send({
        success: false,
        error: 'Failed to process webhook',
      });
    }
  });

  // Health check endpoint for webhook
  fastify.get('/api/freshdesk/webhook/health', async (_request, reply) => {
    return reply.send({
      success: true,
      message: 'Freshdesk webhook endpoint is healthy',
      timestamp: new Date().toISOString(),
    });
  });
}
