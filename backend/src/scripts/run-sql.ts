import { getPrismaClient } from '../persistence/prisma-client';
import * as fs from 'fs';
import * as path from 'path';

async function runSQL() {
  const prisma = getPrismaClient();
  
  try {
    console.log('Creating implementations table...');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS implementations (
          id SERIAL PRIMARY KEY,
          sl_no INTEGER UNIQUE NOT NULL,
          organisation_name TEXT NOT NULL,
          sector TEXT NOT NULL,
          project_name TEXT NOT NULL,
          for_type TEXT NOT NULL,
          website TEXT,
          state TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_implementations_state ON implementations(state)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_implementations_sector ON implementations(sector)`);
    
    console.log('✅ Table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runSQL();
