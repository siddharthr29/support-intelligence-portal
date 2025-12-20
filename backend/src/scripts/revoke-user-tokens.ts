#!/usr/bin/env ts-node
/**
 * Script to revoke all refresh tokens for a user
 * This forces them to get a new token with updated custom claims
 * 
 * Usage:
 *   npm run revoke-tokens -- <email>
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with credentials
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: npm run revoke-tokens -- <email>');
    console.error('');
    console.error('Example:');
    console.error('  npm run revoke-tokens -- leader@avni.org');
    process.exit(1);
  }

  const email = args[0];

  try {
    const auth = getAuth();
    
    // Get user by email
    const user = await auth.getUserByEmail(email);
    
    console.log('Found user:', {
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims,
    });

    // Revoke all refresh tokens
    await auth.revokeRefreshTokens(user.uid);
    
    console.log('');
    console.log('✅ All refresh tokens revoked!');
    console.log('');
    console.log('⚠️  Important:');
    console.log('  - User is now logged out from ALL devices');
    console.log('  - User must login again to get new token with updated roles');
    console.log('  - New token will include custom claims');
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error('❌ User not found with email:', email);
    } else {
      console.error('❌ Failed to revoke tokens:', error.message);
    }
    process.exit(1);
  }
}

main();
