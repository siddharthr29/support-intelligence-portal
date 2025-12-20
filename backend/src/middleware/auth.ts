import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { verifyIdToken } from '../config/firebase-admin';
import { logger } from '../utils/logger';

// Extend FastifyRequest to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedIdToken;
  }
}

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/api/health',
  '/api/monthly-report/public/', // Public share links
];

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens and supports multi-user concurrent sessions
 * Each request is validated independently, allowing multiple users to be logged in simultaneously
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const path = request.url;
  
  // Allow public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return;
  }

  // Extract Bearer token from Authorization header
  const authHeader = request.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  // Check if Firebase Admin is configured
  if (!process.env.FIREBASE_PROJECT_ID) {
    logger.error({ path }, 'Firebase Admin not configured - missing FIREBASE_PROJECT_ID');
    return reply.status(500).send({
      success: false,
      error: 'Authentication service not configured',
      code: 'AUTH_SERVICE_UNAVAILABLE',
    });
  }

  // Require token
  if (!idToken) {
    logger.warn({ path }, 'No authentication token provided');
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized. Please provide a valid Firebase authentication token.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  // Verify Firebase ID token
  try {
    const decodedToken = await verifyIdToken(idToken);
    
    // Attach user info to request for downstream handlers
    request.user = decodedToken;
    
    logger.debug({
      path,
      uid: decodedToken.uid,
      email: decodedToken.email,
    }, 'Request authenticated successfully');
    
    return;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.warn({
      path,
      error: errorMessage,
    }, 'Token verification failed');
    
    // Determine error type for better client handling
    let errorCode = 'AUTH_TOKEN_INVALID';
    let statusCode = 401;
    
    if (errorMessage.includes('expired')) {
      errorCode = 'AUTH_TOKEN_EXPIRED';
    } else if (errorMessage.includes('revoked')) {
      errorCode = 'AUTH_TOKEN_REVOKED';
      statusCode = 403;
    }
    
    return reply.status(statusCode).send({
      success: false,
      error: 'Authentication failed. Please log in again.',
      code: errorCode,
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
    });
  }
}

/**
 * Optional authentication middleware
 * Verifies token if present, but allows requests without token
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!idToken) {
    return; // No token, continue as anonymous
  }

  try {
    const decodedToken = await verifyIdToken(idToken);
    request.user = decodedToken;
    
    logger.debug({
      uid: decodedToken.uid,
      email: decodedToken.email,
    }, 'Optional auth: User authenticated');
  } catch (error) {
    // Token invalid, but we allow the request to continue as anonymous
    logger.debug({ error }, 'Optional auth: Token invalid, continuing as anonymous');
  }
}

/**
 * Admin role check middleware
 * Requires user to be authenticated and have admin role
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  // Check for admin claim in custom claims
  const isAdmin = request.user.admin === true || 
                  request.user.role === 'admin' ||
                  request.user.customClaims?.admin === true;

  if (!isAdmin) {
    logger.warn({
      uid: request.user.uid,
      email: request.user.email,
    }, 'Admin access denied');
    
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  logger.debug({
    uid: request.user.uid,
    email: request.user.email,
  }, 'Admin access granted');
}
