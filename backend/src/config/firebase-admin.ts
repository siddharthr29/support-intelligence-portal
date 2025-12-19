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

    // Initialize with service account credentials
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Validate required environment variables
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Missing Firebase Admin credentials in environment variables');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    logger.info('Firebase Admin SDK initialized successfully', {
      projectId: serviceAccount.projectId,
    });

    return firebaseApp;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Firebase Admin SDK');
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
      await app.delete();
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
    const decodedToken = await auth.verifyIdToken(idToken, true); // checkRevoked = true
    
    logger.debug('Token verified successfully', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
    
    return decodedToken;
  } catch (error) {
    logger.warn({ error }, 'Token verification failed');
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
