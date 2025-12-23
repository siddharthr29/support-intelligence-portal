import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireLeadership } from '../middleware/role-check';
import { logger } from '../utils/logger';

interface GoogleSheetsRow {
  sl_no: string;
  organisation_name: string;
  sector: string;
  project_name: string;
  for_type: string;
  website: string;
  state: string;
}

interface Implementation {
  id: number;
  slNo: number;
  organisationName: string;
  sector: string;
  projectName: string;
  forType: string;
  website: string | null;
  state: string;
}

/**
 * Fetch data from Google Sheets using the public CSV export URL
 * Sheet ID: 1SQkrkD1JQihp4nRsojl1YDUrVdMr2bS9--voyOkpU9A
 * GID: 57503310
 */
async function fetchGoogleSheetsData(): Promise<Implementation[]> {
  const SHEET_ID = '1SQkrkD1JQihp4nRsojl1YDUrVdMr2bS9--voyOkpU9A';
  const GID = '57503310';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  try {
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets data: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      logger.warn('Google Sheets returned no data rows');
      return [];
    }

    // Skip header row
    const dataLines = lines.slice(1);
    
    const implementations: Implementation[] = [];
    
    for (const line of dataLines) {
      // Simple CSV parsing (handles basic cases)
      const values = parseCSVLine(line);
      
      if (values.length < 7) {
        logger.warn({ line }, 'Skipping invalid CSV line');
        continue;
      }

      const [slNo, organisationName, sector, projectName, forType, website, state] = values;
      
      // Skip empty rows
      if (!organisationName || !organisationName.trim()) {
        continue;
      }

      implementations.push({
        id: parseInt(slNo) || implementations.length + 1,
        slNo: parseInt(slNo) || implementations.length + 1,
        organisationName: organisationName ? organisationName.trim() : '',
        sector: sector ? sector.trim() : '',
        projectName: projectName ? projectName.trim() : '',
        forType: forType && forType.trim() ? forType.trim() : 'Self',
        website: website && website.trim() ? website.trim() : null,
        state: state ? state.trim() : '',
      });
    }

    logger.info({ count: implementations.length }, 'Fetched implementations from Google Sheets');
    return implementations;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Google Sheets data');
    throw error;
  }
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export async function registerGoogleSheetsImplementationsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all implementations from Google Sheets
  fastify.get('/api/google-sheets/implementations', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    try {
      const implementations = await fetchGoogleSheetsData();

      return reply.send({
        success: true,
        data: {
          implementations,
          count: implementations.length,
          source: 'google_sheets',
          lastFetched: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch implementations from Google Sheets');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve implementations from Google Sheets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('Google Sheets implementations routes registered');
}
