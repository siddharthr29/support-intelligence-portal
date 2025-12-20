#!/usr/bin/env ts-node
/**
 * Script to verify user's custom claims in Firebase
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
  const email = args[0] || 'leader@avni.org';

  try {
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('User Record from Firebase:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('UID:', user.uid);
    console.log('Email:', user.email);
    console.log('Email Verified:', user.emailVerified);
    console.log('');
    console.log('Custom Claims:', JSON.stringify(user.customClaims, null, 2));
    console.log('');
    console.log('Tokens Valid After:', user.tokensValidAfterTime);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Force refresh by revoking and immediately checking
    console.log('Revoking all refresh tokens to force new token generation...');
    await auth.revokeRefreshTokens(user.uid);
    
    const updatedUser = await auth.getUser(user.uid);
    console.log('');
    console.log('After token revocation:');
    console.log('Tokens Valid After:', updatedUser.tokensValidAfterTime);
    console.log('');
    console.log('✅ User must now login to get a NEW token with custom claims');
    console.log('⚠️  The new token will include:', JSON.stringify(user.customClaims, null, 2));
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
