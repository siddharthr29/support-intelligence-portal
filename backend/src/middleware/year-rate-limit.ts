import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

// Rate limiting for year switches
const yearSwitchLimits = new Map<string, { count: number; resetTime: number }>();

const MAX_YEAR_SWITCHES = 10; // Max 10 year switches per minute
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Rate limit middleware for year-based API calls
 * Prevents abuse by limiting year switches to 10 per minute per IP
 */
export async function yearRateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = request.ip;
  const now = Date.now();
  
  // Get or create rate limit entry
  let limitEntry = yearSwitchLimits.get(ip);
  
  if (!limitEntry || now > limitEntry.resetTime) {
    // Create new entry or reset expired one
    limitEntry = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    yearSwitchLimits.set(ip, limitEntry);
  }
  
  // Increment count
  limitEntry.count++;
  
  // Check if limit exceeded
  if (limitEntry.count > MAX_YEAR_SWITCHES) {
    logger.warn({ ip, count: limitEntry.count }, 'Year switch rate limit exceeded');
    
    reply.status(429).send({
      success: false,
      error: 'Too many year switches. Please slow down.',
      retryAfter: Math.ceil((limitEntry.resetTime - now) / 1000),
    });
    
    return;
  }
  
  // Clean up old entries periodically
  if (yearSwitchLimits.size > 1000) {
    for (const [key, value] of yearSwitchLimits.entries()) {
      if (now > value.resetTime) {
        yearSwitchLimits.delete(key);
      }
    }
  }
}
