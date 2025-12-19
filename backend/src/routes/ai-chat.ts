import type { FastifyInstance, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import { getSecureConfig } from '../services/secure-config';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get Groq API key dynamically (from database or env)
async function getGroqApiKey(): Promise<string | null> {
  // First try database (user-configured)
  const dbKey = await getSecureConfig('GROQ_API_KEY');
  if (dbKey) return dbKey;
  
  // Fallback to environment variable
  return process.env.GROQ_API_KEY || null;
}

// Rate limiting: Track requests per IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP
const MAX_DAILY_REQUESTS = 100; // 100 requests per day total

// Daily usage tracking
let dailyRequestCount = 0;
let dailyResetAt = Date.now() + 24 * 60 * 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number; reason?: string } {
  const now = Date.now();
  
  // Reset daily counter if needed
  if (now > dailyResetAt) {
    dailyRequestCount = 0;
    dailyResetAt = now + 24 * 60 * 60 * 1000;
  }
  
  // Check daily limit
  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    const retryAfter = Math.ceil((dailyResetAt - now) / 1000);
    return { allowed: false, retryAfter, reason: 'Daily limit reached. Try again tomorrow.' };
  }
  
  // Check per-IP rate limit
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    dailyRequestCount++;
    return { allowed: true };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter, reason: `Rate limited. Wait ${retryAfter}s.` };
  }
  
  entry.count++;
  dailyRequestCount++;
  return { allowed: true };
}

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for the Avni Support Intelligence Dashboard. Your role is to help analyze support ticket data and provide insights.

You have access to the following context about the support system:
- Tickets are tracked with priorities: Urgent, High, Medium, Low
- Tickets have statuses: Open, Pending, Resolved, Closed
- Support is provided by two groups: Support Engineers and Product Support
- The dashboard tracks metrics like tickets created, resolved, resolution rate, etc.

When answering questions:
1. Be concise and data-driven
2. Provide actionable insights when possible
3. If you don't have specific data, say so clearly
4. Focus on support operations and ticket management
5. Keep responses brief (under 200 words unless detailed analysis is requested)

You are helpful, professional, and focused on improving support operations.`;

interface ChatRequest {
  message: string;
  model?: string;
  context?: {
    ticketsCreated?: number;
    ticketsResolved?: number;
    urgentTickets?: number;
    highTickets?: number;
    openTickets?: number;
    pendingTickets?: number;
    resolutionRate?: number;
    dateRange?: string;
  };
}

// Available free models on Groq
const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export async function registerAiChatRoutes(fastify: FastifyInstance): Promise<void> {
  // AI Chat endpoint
  fastify.post('/api/ai/chat', async (request: FastifyRequest<{ Body: ChatRequest }>, reply) => {
    const ip = request.ip || 'unknown';
    
    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return reply.status(429).send({
        success: false,
        error: rateCheck.reason,
        retryAfter: rateCheck.retryAfter,
      });
    }
    
    const groqApiKey = await getGroqApiKey();
    if (!groqApiKey) {
      return reply.status(500).send({
        success: false,
        error: 'AI service not configured. Please add Groq API key in Settings.',
      });
    }
    
    const { message, context, model } = request.body;
    
    // Validate and select model
    const selectedModel = model && AVAILABLE_MODELS.includes(model) ? model : DEFAULT_MODEL;
    
    if (!message || typeof message !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'Message is required',
      });
    }
    
    // Limit message length to prevent abuse
    if (message.length > 500) {
      return reply.status(400).send({
        success: false,
        error: 'Message too long (max 500 characters)',
      });
    }
    
    try {
      // Build context string
      let contextStr = '';
      if (context) {
        const parts = [];
        if (context.dateRange) parts.push(`Date Range: ${context.dateRange}`);
        if (context.ticketsCreated !== undefined) parts.push(`Tickets Created: ${context.ticketsCreated}`);
        if (context.ticketsResolved !== undefined) parts.push(`Tickets Resolved: ${context.ticketsResolved}`);
        if (context.urgentTickets !== undefined) parts.push(`Urgent: ${context.urgentTickets}`);
        if (context.highTickets !== undefined) parts.push(`High: ${context.highTickets}`);
        if (context.openTickets !== undefined) parts.push(`Open: ${context.openTickets}`);
        if (context.pendingTickets !== undefined) parts.push(`Pending: ${context.pendingTickets}`);
        if (context.resolutionRate !== undefined) parts.push(`Resolution Rate: ${context.resolutionRate}%`);
        
        if (parts.length > 0) {
          contextStr = `\n\nCurrent Dashboard Data:\n${parts.join('\n')}`;
        }
      }
      
      const userMessage = message + contextStr;
      
      logger.info({ ip, messageLength: message.length }, 'AI chat request');
      
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Groq API error');
        return reply.status(500).send({
          success: false,
          error: 'AI service temporarily unavailable',
        });
      }
      
      const data = await response.json() as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';
      
      return reply.send({
        success: true,
        data: {
          response: aiResponse,
          usage: {
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'AI chat error');
      return reply.status(500).send({
        success: false,
        error: 'Failed to process AI request',
      });
    }
  });
  
  // Get rate limit status
  fastify.get('/api/ai/status', async (request, reply) => {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    
    const remainingDaily = Math.max(0, MAX_DAILY_REQUESTS - dailyRequestCount);
    const remainingPerMinute = entry && now < entry.resetAt 
      ? Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count)
      : MAX_REQUESTS_PER_WINDOW;
    
    return reply.send({
      success: true,
      data: {
        remainingDaily,
        remainingPerMinute,
        maxDaily: MAX_DAILY_REQUESTS,
        maxPerMinute: MAX_REQUESTS_PER_WINDOW,
      },
    });
  });
}
