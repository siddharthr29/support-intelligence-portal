import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../persistence/prisma-client';
import { logger } from '../utils/logger';

// In-memory cache for company names (loaded from database)
let companyCache: Map<number, string> = new Map();
let cacheLastUpdated: Date | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function refreshCompanyCache(): Promise<void> {
  const prisma = getPrismaClient();
  
  try {
    logger.info('Loading company data from CompanyCache table');
    
    // Load from CompanyCache table (populated by Friday sync)
    const companies = await prisma.companyCache.findMany();
    
    companyCache = new Map();
    for (const company of companies) {
      companyCache.set(Number(company.freshdeskCompanyId), company.name);
    }
    cacheLastUpdated = new Date();
    
    logger.info({ companyCount: companyCache.size }, 'Company cache loaded from database');
  } catch (error) {
    logger.error({ error }, 'Failed to load company cache from database');
    // Don't throw - use empty cache
  }
}

export function getCompanyName(companyId: number): string {
  return companyCache.get(companyId) || `Company ${companyId}`;
}

export function getCompanyNames(companyIds: number[]): Map<number, string> {
  const result = new Map<number, string>();
  for (const id of companyIds) {
    result.set(id, getCompanyName(id));
  }
  return result;
}

export async function ensureCompanyCacheLoaded(): Promise<void> {
  const now = new Date();
  if (!cacheLastUpdated || (now.getTime() - cacheLastUpdated.getTime()) > CACHE_TTL_MS) {
    await refreshCompanyCache();
  }
}

export async function registerCompaniesRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all companies (cached)
  fastify.get('/api/companies', async (_request, reply) => {
    await ensureCompanyCacheLoaded();
    
    const companies = Array.from(companyCache.entries()).map(([id, name]) => ({
      id,
      name,
    }));
    
    return reply.send({
      success: true,
      data: companies,
      cacheLastUpdated: cacheLastUpdated?.toISOString(),
    });
  });

  // Refresh company cache
  fastify.post('/api/companies/refresh', async (_request, reply) => {
    await refreshCompanyCache();
    
    return reply.send({
      success: true,
      message: 'Company cache refreshed',
      companyCount: companyCache.size,
    });
  });

  // Lookup specific company names
  fastify.post<{ Body: { companyIds: number[] } }>(
    '/api/companies/lookup',
    async (request, reply) => {
      await ensureCompanyCacheLoaded();
      
      const { companyIds } = request.body;
      const names = getCompanyNames(companyIds);
      
      const result: Record<number, string> = {};
      for (const [id, name] of names) {
        result[id] = name;
      }
      
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // Get all company names as a map (id -> name)
  fastify.get('/api/companies/all', async (_request, reply) => {
    await ensureCompanyCacheLoaded();
    
    const result: Record<number, string> = {};
    for (const [id, name] of companyCache) {
      result[id] = name;
    }
    
    return reply.send({
      success: true,
      data: result,
    });
  });
}
