import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

// Simple API key authentication for internal tool
// In production, this should be replaced with proper OAuth/Firebase Auth
const VALID_API_KEYS = new Set([
  process.env.INTERNAL_API_KEY || 'support-dashboard-internal-key',
]);

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/health',
  '/api/monthly-report/public/', // Public share links
];

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const path = request.url;
  
  // Allow public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return;
  }

  // Check for API key in header
  const apiKey = request.headers['x-api-key'] as string;
  
  // Check for Bearer token (for future Firebase Auth integration)
  const authHeader = request.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  // Validate API key
  if (apiKey && VALID_API_KEYS.has(apiKey)) {
    return;
  }

  // For development, allow requests without auth if no API key is configured
  if (process.env.NODE_ENV !== 'production' && !process.env.INTERNAL_API_KEY) {
    return;
  }

  // If we have a bearer token, validate it (placeholder for Firebase Auth)
  if (bearerToken) {
    // TODO: Validate Firebase token here
    // For now, just log and allow
    logger.debug({ path }, 'Bearer token provided, validation not implemented');
    return;
  }

  // Unauthorized
  logger.warn({ path, hasApiKey: !!apiKey, hasBearerToken: !!bearerToken }, 'Unauthorized request');
  
  return reply.status(401).send({
    success: false,
    error: 'Unauthorized. Please provide a valid API key or authentication token.',
  });
}

// Decorator to check if user is admin (for future use)
export function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void {
  // For now, all authenticated users are admins
  // In future, check user role from Firebase token
  done();
}
