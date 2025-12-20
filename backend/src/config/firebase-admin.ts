import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
export function initializeFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0] as admin.app.App;
      logger.info('Firebase Admin already initialized');
      return firebaseApp;
    }

    // Normalize private key - support both base64 and direct format
    let normalizedPrivateKey: string | undefined;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Try base64 format first (preferred for Render)
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        normalizedPrivateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
        logger.info('Using base64-encoded private key');
      } catch (error) {
        logger.error('Failed to decode base64 private key', { error });
      }
    }
    
    // Fall back to direct format
    if (!normalizedPrivateKey && rawPrivateKey) {
      normalizedPrivateKey = rawPrivateKey
        ?.replace(/\\n/g, '\n')  // Convert escaped newlines to actual newlines
        ?.replace(/^"(.*)"$/, '$1')  // Strip wrapping quotes if present
        ?.trim();
      logger.info('Using direct private key format');
    }

    // Log environment variables (without sensitive data)
    logger.info('Initializing Firebase Admin SDK with environment variables', {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!rawPrivateKey,
      hasPrivateKeyBase64: !!process.env.FIREBASE_PRIVATE_KEY_BASE64,
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      rawPrivateKeyLength: rawPrivateKey?.length,
      normalizedPrivateKeyLength: normalizedPrivateKey?.length,
      privateKeyPrefix: normalizedPrivateKey?.substring(0, 30) + '...',
      privateKeyHasBeginMarker: normalizedPrivateKey?.includes('BEGIN PRIVATE KEY'),
      privateKeyHasEndMarker: normalizedPrivateKey?.includes('END PRIVATE KEY'),
    });

    // Initialize with service account credentials
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizedPrivateKey,
    };

    // Validate required environment variables
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      const missing = [];
      if (!serviceAccount.projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!serviceAccount.clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!serviceAccount.privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      
      logger.error('Missing Firebase Admin credentials', { missing });
      throw new Error(`Missing Firebase Admin credentials: ${missing.join(', ')}`);
    }

    // Verify private key format
    if (!serviceAccount.privateKey.includes('BEGIN PRIVATE KEY')) {
      logger.error('Invalid private key format - missing BEGIN PRIVATE KEY marker');
      throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });

    logger.info('✅ Firebase Admin SDK initialized successfully', {
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
    });

    return firebaseApp;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Admin SDK', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
    });
    throw error;
  }
}

/**
 * Reload Firebase Admin SDK with new credentials
 * Deletes existing app and reinitializes with updated environment variables
 */
export async function reloadFirebaseAdmin(): Promise<void> {
  try {
    // Delete existing Firebase app if it exists
    if (firebaseApp) {
      await firebaseApp.delete();
      firebaseApp = null;
      logger.info('Existing Firebase Admin app deleted');
    }

    // Delete all Firebase apps
    const apps = admin.apps;
    for (const app of apps) {
      if (app) {
        await app.delete();
      }
    }

    // Reinitialize with new credentials from environment
    initializeFirebaseAdmin();
    
    logger.info('Firebase Admin SDK reloaded successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to reload Firebase Admin SDK');
    throw error;
  }
}

/**
 * Get Firebase Admin instance
 */
export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    return initializeFirebaseAdmin();
  }
  return firebaseApp;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): admin.auth.Auth {
  const app = getFirebaseAdmin();
  return admin.auth(app);
}

/**
 * Verify Firebase ID token
 * Supports multi-user concurrent sessions
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const auth = getFirebaseAuth();
    
    // Log token details for debugging (first 20 chars only)
    logger.debug('Attempting to verify token', {
      tokenPrefix: idToken.substring(0, 20) + '...',
      tokenLength: idToken.length,
    });
    
    const decodedToken = await auth.verifyIdToken(idToken, true); // checkRevoked = true
    
    logger.info('✅ Token verified successfully', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      aud: decodedToken.aud,
      iss: decodedToken.iss,
    });
    
    return decodedToken;
  } catch (error) {
    // Log detailed error information
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : { error };
    
    logger.error('❌ Token verification failed', errorDetails);
    throw error;
  }
}

/**
 * Get user by UID
 */
export async function getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
  try {
    const auth = getFirebaseAuth();
    return await auth.getUser(uid);
  } catch (error) {
    logger.error({ error, uid }, 'Failed to get user by UID');
    throw error;
  }
}

/**
 * Revoke refresh tokens for a user (force logout)
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await auth.revokeRefreshTokens(uid);
    logger.info({ uid }, 'User tokens revoked');
  } catch (error) {
    logger.error({ error, uid }, 'Failed to revoke user tokens');
    throw error;
  }
}
