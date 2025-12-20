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

  // Custom claims are at root level of decoded token
  const user = request.user as any;
  const hasAccess = user.leadership === true || user.founder === true;

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

  // Custom claims are at root level of decoded token
  const user = request.user as any;
  const hasAccess = user.founder === true;

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

  // Custom claims are at root level of decoded token
  const user = request.user as any;
  const hasAccess = user.product_manager === true || 
                    user.leadership === true || 
                    user.founder === true;

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

  // Custom claims are at root level of decoded token
  const user = request.user as any;
  
  return roles.some(role => user[role] === true);
}

/**
 * Get user's roles from request
 */
export function getUserRoles(request: FastifyRequest): UserRole[] {
  if (!request.user) return [];

  // Custom claims are at root level of decoded token
  const user = request.user as any;
  const roles: UserRole[] = [];

  if (user.support_engineer) roles.push('support_engineer');
  if (user.product_manager) roles.push('product_manager');
  if (user.leadership) roles.push('leadership');
  if (user.founder) roles.push('founder');

  return roles;
}
