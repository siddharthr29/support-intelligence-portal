import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '../services/user-roles';
import { logger } from '../utils/logger';

/**
 * Role-Based Access Control Middleware
 * 
 * These middlewares check Firebase custom claims to enforce role-based access.
 * They must be used AFTER authMiddleware to ensure request.user is populated.
 */

/**
 * Require leadership role (leadership or founder)
 * Used for: Partner risk dashboards, leadership intelligence
 */
export async function requireLeadership(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    logger.warn({ path: request.url }, 'Leadership access denied - no user');
    reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    throw new Error('AUTH_REQUIRED');
  }

  const claims = request.user.customClaims as Record<string, boolean> || {};
  const hasAccess = claims.leadership === true || claims.founder === true;

  if (!hasAccess) {
    logger.warn({
      path: request.url,
      uid: request.user.uid,
      email: request.user.email,
    }, 'Leadership access denied - insufficient permissions');
    
    reply.status(403).send({
      success: false,
      error: 'Leadership access required. Please contact your administrator.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
    throw new Error('INSUFFICIENT_PERMISSIONS');
  }

  logger.debug({
    path: request.url,
    uid: request.user.uid,
    email: request.user.email,
  }, 'Leadership access granted');
}

/**
 * Require founder role
 * Used for: Weekly summaries, 3-year historical data, sensitive metrics
 */
export async function requireFounder(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    logger.warn({ path: request.url }, 'Founder access denied - no user');
    reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    throw new Error('AUTH_REQUIRED');
  }

  const claims = request.user.customClaims as Record<string, boolean> || {};
  const hasAccess = claims.founder === true;

  if (!hasAccess) {
    logger.warn({
      path: request.url,
      uid: request.user.uid,
      email: request.user.email,
    }, 'Founder access denied - insufficient permissions');
    
    reply.status(403).send({
      success: false,
      error: 'Founder access required.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
    throw new Error('INSUFFICIENT_PERMISSIONS');
  }

  logger.debug({
    path: request.url,
    uid: request.user.uid,
    email: request.user.email,
  }, 'Founder access granted');
}

/**
 * Require product manager role (product_manager, leadership, or founder)
 * Used for: Product metrics, partner insights
 */
export async function requireProductManager(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    logger.warn({ path: request.url }, 'Product manager access denied - no user');
    reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    throw new Error('AUTH_REQUIRED');
  }

  const claims = request.user.customClaims as Record<string, boolean> || {};
  const hasAccess = claims.product_manager === true || 
                    claims.leadership === true || 
                    claims.founder === true;

  if (!hasAccess) {
    logger.warn({
      path: request.url,
      uid: request.user.uid,
      email: request.user.email,
    }, 'Product manager access denied - insufficient permissions');
    
    reply.status(403).send({
      success: false,
      error: 'Product manager access required.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
    throw new Error('INSUFFICIENT_PERMISSIONS');
  }

  logger.debug({
    path: request.url,
    uid: request.user.uid,
    email: request.user.email,
  }, 'Product manager access granted');
}

/**
 * Check if user has any of the specified roles
 * Returns true/false without blocking the request
 */
export function hasAnyRole(
  request: FastifyRequest,
  roles: UserRole[]
): boolean {
  if (!request.user) return false;

  const claims = request.user.customClaims as Record<string, boolean> || {};
  
  return roles.some(role => claims[role] === true);
}

/**
 * Get user's roles from request
 */
export function getUserRoles(request: FastifyRequest): UserRole[] {
  if (!request.user) return [];

  const claims = request.user.customClaims as Record<string, boolean> || {};
  const roles: UserRole[] = [];

  if (claims.support_engineer) roles.push('support_engineer');
  if (claims.product_manager) roles.push('product_manager');
  if (claims.leadership) roles.push('leadership');
  if (claims.founder) roles.push('founder');

  return roles;
}
