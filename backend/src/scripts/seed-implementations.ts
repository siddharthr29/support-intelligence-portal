import { getPrismaClient } from '../persistence/prisma-client';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

interface ImplementationRow {
  sl_no: string;
  organisation_name: string;
  sector: string;
  project_name: string;
  for_type: string;
  website: string;
  state: string;
}

async function seedImplementations() {
  const prisma = getPrismaClient();
  
  try {
    console.log('Reading CSV file...');
    const csvPath = path.join(__dirname, '../../../all_impl.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('Parsing CSV...');
    const result = Papa.parse<ImplementationRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    console.log(`Found ${result.data.length} implementations`);
    
    // Clear existing data
    console.log('Clearing existing implementations...');
    await prisma.$executeRaw`TRUNCATE TABLE implementations RESTART IDENTITY CASCADE`;
    
    // Insert new data
    console.log('Inserting implementations...');
    for (const row of result.data) {
      if (!row.organisation_name || !row.sector || !row.project_name) {
        console.warn('Skipping row with missing data:', row);
        continue;
      }
      
      await prisma.implementation.create({
        data: {
          slNo: parseInt(row.sl_no) || 0,
          organisationName: row.organisation_name.trim(),
          sector: row.sector.trim(),
          projectName: row.project_name.trim(),
          forType: row.for_type?.trim() || 'Self',
          website: row.website?.trim() || null,
          state: row.state?.trim() || 'Unknown',
        },
      });
    }
    
    const count = await prisma.implementation.count();
    console.log(`✅ Successfully seeded ${count} implementations`);
    
  } catch (error) {
    console.error('❌ Error seeding implementations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedImplementations();
