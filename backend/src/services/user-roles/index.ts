import { getAuth } from 'firebase-admin/auth';
import { logger } from '../../utils/logger';

/**
 * User Roles for Leadership Support Intelligence
 * 
 * Roles:
 * - support_engineer: Access to operational support dashboards (existing)
 * - product_manager: Access to product metrics and partner insights
 * - leadership: Access to leadership intelligence and partner risk
 * - founder: Full access to all intelligence including weekly summaries
 */

export type UserRole = 'support_engineer' | 'product_manager' | 'leadership' | 'founder';

export interface UserRoleClaims {
  support_engineer?: boolean;
  product_manager?: boolean;
  leadership?: boolean;
  founder?: boolean;
}

/**
 * Set custom claims for a user
 * This grants role-based access to different parts of the system
 */
export async function setUserRoles(
  uid: string,
  roles: UserRole[]
): Promise<void> {
  try {
    const auth = getAuth();
    
    // Build custom claims object
    const customClaims: UserRoleClaims = {};
    for (const role of roles) {
      customClaims[role] = true;
    }
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, customClaims);
    
    logger.info({
      uid,
      roles,
    }, 'User roles updated successfully');
  } catch (error) {
    logger.error({
      uid,
      roles,
      error,
    }, 'Failed to set user roles');
    throw error;
  }
}

/**
 * Get user roles from custom claims
 */
export async function getUserRoles(uid: string): Promise<UserRole[]> {
  try {
    const auth = getAuth();
    const user = await auth.getUser(uid);
    
    const claims = user.customClaims as UserRoleClaims || {};
    const roles: UserRole[] = [];
    
    if (claims.support_engineer) roles.push('support_engineer');
    if (claims.product_manager) roles.push('product_manager');
    if (claims.leadership) roles.push('leadership');
    if (claims.founder) roles.push('founder');
    
    return roles;
  } catch (error) {
    logger.error({
      uid,
      error,
    }, 'Failed to get user roles');
    throw error;
  }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(uid: string, role: UserRole): Promise<boolean> {
  const roles = await getUserRoles(uid);
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(uid: string, roles: UserRole[]): Promise<boolean> {
  const userRoles = await getUserRoles(uid);
  return roles.some(role => userRoles.includes(role));
}

/**
 * Grant default support_engineer role to new users
 * This maintains backward compatibility with existing system
 */
export async function grantDefaultRole(uid: string): Promise<void> {
  await setUserRoles(uid, ['support_engineer']);
  logger.info({ uid }, 'Granted default support_engineer role to new user');
}
