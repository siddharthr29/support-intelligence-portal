#!/usr/bin/env ts-node
/**
 * Script to set user roles via Firebase custom claims
 * 
 * Usage:
 *   npm run set-roles -- <email> <role1> [role2] [role3]
 * 
 * Examples:
 *   npm run set-roles -- founder@avni.org founder
 *   npm run set-roles -- leader@avni.org leadership
 *   npm run set-roles -- pm@avni.org product_manager
 *   npm run set-roles -- support@avni.org support_engineer
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { setUserRoles, type UserRole } from '../services/user-roles';
import { logger } from '../utils/logger';

// Initialize Firebase Admin with credentials
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const VALID_ROLES: UserRole[] = ['support_engineer', 'product_manager', 'leadership', 'founder'];

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npm run set-roles -- <email> <role1> [role2] [role3]');
    console.error('');
    console.error('Valid roles:', VALID_ROLES.join(', '));
    console.error('');
    console.error('Examples:');
    console.error('  npm run set-roles -- founder@avni.org founder');
    console.error('  npm run set-roles -- leader@avni.org leadership');
    console.error('  npm run set-roles -- pm@avni.org product_manager leadership');
    process.exit(1);
  }

  const email = args[0];
  const roles = args.slice(1) as UserRole[];

  // Validate roles
  const invalidRoles = roles.filter(role => !VALID_ROLES.includes(role));
  if (invalidRoles.length > 0) {
    console.error('Invalid roles:', invalidRoles.join(', '));
    console.error('Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  try {
    // Get user by email
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    
    console.log('Found user:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    // Set roles
    await setUserRoles(user.uid, roles);
    
    console.log('✅ Roles updated successfully');
    console.log('Roles:', roles.join(', '));
    console.log('');
    console.log('⚠️  User must log out and log back in for changes to take effect');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to set user roles:', error);
    process.exit(1);
  }
}

main();
