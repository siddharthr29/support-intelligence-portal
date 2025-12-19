import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTicketsByDateRange } from '../persistence/date-range-repository';
import { getLatestRftSnapshot } from '../persistence/rft-repository';
import { getSecureConfig } from '../services/secure-config';
import { logger } from '../utils/logger';
import { startOfWeek, endOfWeek, startOfYear, subDays } from 'date-fns';

// Rate limiting
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(endpoint);
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(endpoint, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

// Pre-defined questions
const QUICK_QUESTIONS = [
  {
    id: 'total_tickets_ytd',
    question: 'How many tickets have we received this year?',
    category: 'overview',
  },
  {
    id: 'tickets_this_week',
    question: 'How many tickets were created this week?',
    category: 'overview',
  },
  {
    id: 'unresolved_tickets',
    question: 'How many tickets are currently unresolved?',
    category: 'status',
  },
  {
    id: 'top_company',
    question: 'Which company has the most tickets?',
    category: 'companies',
  },
  {
    id: 'urgent_tickets',
    question: 'How many urgent/high priority tickets are open?',
    category: 'priority',
  },
  {
    id: 'rft_status',
    question: 'What is the current RFT (Rule Failure Telemetry) status?',
    category: 'rft',
  },
  {
    id: 'resolution_rate',
    question: 'What is our ticket resolution rate?',
    category: 'performance',
  },
];

interface QuickAnswerQuery {
  questionId: string;
}

export async function registerQuickAnswersRoutes(fastify: FastifyInstance): Promise<void> {
  // Get available questions
  fastify.get('/api/quick-answers/questions', async (_request, reply) => {
    return reply.send({
      success: true,
      data: QUICK_QUESTIONS,
    });
  });

  // Get answer for a specific question
  fastify.get<{ Querystring: QuickAnswerQuery }>(
    '/api/quick-answers/answer',
    async (request: FastifyRequest<{ Querystring: QuickAnswerQuery }>, reply: FastifyReply) => {
      if (!checkRateLimit('quick-answers')) {
        return reply.status(429).send({
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        });
      }

      const { questionId } = request.query;

      if (!questionId) {
        return reply.status(400).send({
          success: false,
          error: 'questionId is required',
        });
      }

      try {
        const answer = await getAnswerForQuestion(questionId);
        return reply.send({
          success: true,
          data: answer,
        });
      } catch (error) {
        logger.error({ error, questionId }, 'Failed to get quick answer');
        throw error;
      }
    }
  );
}

async function getAnswerForQuestion(questionId: string): Promise<{
  question: string;
  answer: string;
  details?: Record<string, unknown>;
  timestamp: string;
}> {
  const now = new Date();
  const yearStart = startOfYear(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  switch (questionId) {
    case 'total_tickets_ytd': {
      const tickets = await getTicketsByDateRange({
        startDate: yearStart,
        endDate: now,
        startDateISO: yearStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      return {
        question: 'How many tickets have we received this year?',
        answer: `We have received **${tickets.length} tickets** since January 1st, ${now.getFullYear()}.`,
        details: { totalTickets: tickets.length, period: 'YTD' },
        timestamp: now.toISOString(),
      };
    }

    case 'tickets_this_week': {
      const tickets = await getTicketsByDateRange({
        startDate: weekStart,
        endDate: now,
        startDateISO: weekStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      const created = tickets.filter(t => new Date(t.createdAt) >= weekStart).length;
      return {
        question: 'How many tickets were created this week?',
        answer: `**${created} tickets** were created this week (since Monday).`,
        details: { ticketsCreated: created, weekStart: weekStart.toISOString() },
        timestamp: now.toISOString(),
      };
    }

    case 'unresolved_tickets': {
      const tickets = await getTicketsByDateRange({
        startDate: yearStart,
        endDate: now,
        startDateISO: yearStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      const open = tickets.filter(t => t.status === 2).length;
      const pending = tickets.filter(t => t.status === 3).length;
      const unresolved = open + pending;
      return {
        question: 'How many tickets are currently unresolved?',
        answer: `There are **${unresolved} unresolved tickets** (${open} open, ${pending} pending).`,
        details: { unresolved, open, pending },
        timestamp: now.toISOString(),
      };
    }

    case 'top_company': {
      const tickets = await getTicketsByDateRange({
        startDate: yearStart,
        endDate: now,
        startDateISO: yearStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      const companyMap = new Map<number, number>();
      for (const t of tickets) {
        if (t.companyId) {
          companyMap.set(t.companyId, (companyMap.get(t.companyId) || 0) + 1);
        }
      }
      const sorted = Array.from(companyMap.entries()).sort((a, b) => b[1] - a[1]);
      const topCompanyId = sorted[0]?.[0];
      const topCount = sorted[0]?.[1] || 0;
      
      // Try to get company name
      let companyName = `Company ID ${topCompanyId}`;
      if (topCompanyId) {
        const freshdeskDomain = await getSecureConfig('FRESHDESK_DOMAIN') || process.env.FRESHDESK_DOMAIN;
        const apiKey = await getSecureConfig('FRESHDESK_API_KEY', true) || process.env.FRESHDESK_API_KEY;
        if (freshdeskDomain && apiKey) {
          try {
            const res = await fetch(`https://${freshdeskDomain}/api/v2/companies/${topCompanyId}`, {
              headers: { 'Authorization': `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}` },
            });
            if (res.ok) {
              const data = await res.json() as { name: string };
              companyName = data.name;
            }
          } catch { /* ignore */ }
        }
      }
      
      return {
        question: 'Which company has the most tickets?',
        answer: `**${companyName}** has the most tickets with **${topCount} tickets** this year.`,
        details: { companyId: topCompanyId, companyName, ticketCount: topCount },
        timestamp: now.toISOString(),
      };
    }

    case 'urgent_tickets': {
      const tickets = await getTicketsByDateRange({
        startDate: yearStart,
        endDate: now,
        startDateISO: yearStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      const openTickets = tickets.filter(t => t.status === 2 || t.status === 3);
      const urgent = openTickets.filter(t => t.priority === 4).length;
      const high = openTickets.filter(t => t.priority === 3).length;
      return {
        question: 'How many urgent/high priority tickets are open?',
        answer: `There are **${urgent} urgent** and **${high} high priority** tickets currently open.`,
        details: { urgent, high, total: urgent + high },
        timestamp: now.toISOString(),
      };
    }

    case 'rft_status': {
      const rftSnapshot = await getLatestRftSnapshot();
      if (!rftSnapshot) {
        return {
          question: 'What is the current RFT status?',
          answer: 'No RFT data available. Please refresh RFT metrics from the RFT Metrics page.',
          timestamp: now.toISOString(),
        };
      }
      return {
        question: 'What is the current RFT status?',
        answer: `**${rftSnapshot.totalOpenRfts.toLocaleString()} total open RFTs**. New this week: ${rftSnapshot.totalNewlyReported.toLocaleString()}, Closures: ${rftSnapshot.totalClosuresThisWeek.toLocaleString()}.`,
        details: {
          totalOpenRfts: rftSnapshot.totalOpenRfts,
          newThisWeek: rftSnapshot.totalNewlyReported,
          closures: rftSnapshot.totalClosuresThisWeek,
          fetchedAt: rftSnapshot.fetchedAt,
        },
        timestamp: now.toISOString(),
      };
    }

    case 'resolution_rate': {
      const tickets = await getTicketsByDateRange({
        startDate: yearStart,
        endDate: now,
        startDateISO: yearStart.toISOString(),
        endDateISO: now.toISOString(),
      });
      const resolved = tickets.filter(t => t.status === 4).length;
      const closed = tickets.filter(t => t.status === 5).length;
      const total = tickets.length;
      const rate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0;
      return {
        question: 'What is our ticket resolution rate?',
        answer: `Our resolution rate is **${rate}%** (${resolved + closed} resolved/closed out of ${total} tickets).`,
        details: { resolved, closed, total, rate },
        timestamp: now.toISOString(),
      };
    }

    default:
      return {
        question: 'Unknown question',
        answer: 'Sorry, I don\'t have an answer for that question.',
        timestamp: now.toISOString(),
      };
  }
}
