import { createFreshdeskClient } from '../services/freshdesk';
import { logger } from '../utils/logger';
import { config } from '../config';
import { generateSnapshotId, getWeekBoundaries } from './snapshot-id';
import { computeWeeklyMetrics } from '../analytics';
import { writeWeeklySnapshot, upsertYtdTickets, getConfig, setConfig } from '../persistence';
import type {
  IngestionJobResult,
  JobExecutionContext,
  WeeklySnapshotMetadata,
} from './types';
import type {
  FreshdeskTicket,
  FreshdeskGroup,
  FreshdeskCompany,
} from '../services/freshdesk';

const LAST_SYNC_CONFIG_KEY = 'ytd_last_sync_timestamp';

export interface IngestedData {
  readonly metadata: WeeklySnapshotMetadata;
  readonly tickets: readonly FreshdeskTicket[];
  readonly groups: readonly FreshdeskGroup[];
  readonly companies: readonly FreshdeskCompany[];
}

export async function executeWeeklyIngestion(
  context: JobExecutionContext
): Promise<IngestionJobResult> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  logger.info({ context }, 'Starting weekly ingestion job');

  try {
    const now = new Date();
    const { weekStart, weekEnd } = getWeekBoundaries(now, config.scheduler.timezone);
    const snapshotId = generateSnapshotId(weekEnd);

    logger.info({
      snapshotId,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    }, 'Snapshot boundaries calculated');

    // SINGLE Freshdesk API call: Fetch only tickets updated since last sync
    // This handles both YTD storage AND weekly snapshot in one call
    const data = await ingestFreshdeskDataOnce(snapshotId, weekStart, weekEnd);

    // Compute metrics from ingested data
    const metrics = computeWeeklyMetrics(
      snapshotId,
      weekStart.toISOString(),
      weekEnd.toISOString(),
      data.tickets,
      data.groups,
      data.companies
    );

    // Persist weekly snapshot to database
    const writeResult = await writeWeeklySnapshot(metrics, data.tickets);
    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Failed to write snapshot');
    }

    logger.info({
      snapshotId,
      alreadyExists: writeResult.alreadyExists,
      ticketsStored: data.tickets.length,
    }, 'Snapshot persisted to database');

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const result: IngestionJobResult = {
      success: true,
      snapshotId,
      ticketsIngested: data.tickets.length,
      groupsIngested: data.groups.length,
      companiesIngested: data.companies.length,
      startedAt,
      completedAt,
      durationMs,
    };

    logger.info({ result }, 'Weekly ingestion job completed successfully');

    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ error, context }, 'Weekly ingestion job failed');

    return {
      success: false,
      snapshotId: '',
      ticketsIngested: 0,
      groupsIngested: 0,
      companiesIngested: 0,
      startedAt,
      completedAt,
      durationMs,
      error: errorMessage,
    };
  }
}

/**
 * SINGLE Freshdesk API call for weekly ingestion.
 * Uses INCREMENTAL SYNC: Only fetches tickets updated since last sync.
 * First run: Fetches all YTD tickets.
 * Subsequent runs: Only fetches tickets updated since last Friday 4:30PM.
 * 
 * This function:
 * 1. Fetches tickets from Freshdesk (incremental or full)
 * 2. Stores them in YtdTicket table
 * 3. Returns data for weekly snapshot computation
 */
async function ingestFreshdeskDataOnce(
  snapshotId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<IngestedData> {
  const client = createFreshdeskClient();
  const syncStartTime = new Date();
  
  // Check for last sync timestamp
  const lastSyncValue = await getConfig(LAST_SYNC_CONFIG_KEY);
  const lastSyncTimestamp = lastSyncValue ? new Date(lastSyncValue) : null;
  
  let tickets: readonly FreshdeskTicket[];
  let isIncremental = false;
  
  if (lastSyncTimestamp) {
    // INCREMENTAL SYNC: Only fetch tickets updated since last sync
    logger.info({ 
      snapshotId,
      lastSync: lastSyncTimestamp.toISOString(),
      currentTime: syncStartTime.toISOString(),
    }, 'Performing INCREMENTAL sync - fetching tickets updated since last sync');
    
    tickets = await client.getTicketsUpdatedSince(lastSyncTimestamp);
    isIncremental = true;
    
    logger.info({ snapshotId, ticketCount: tickets.length }, 'Incremental tickets fetched from Freshdesk');
  } else {
    // FULL SYNC: First time - fetch all YTD tickets
    logger.info({ snapshotId }, 'Performing FULL YTD sync - no previous sync found');
    tickets = await client.getAllYtdTickets();
    
    logger.info({ snapshotId, ticketCount: tickets.length }, 'Full YTD tickets fetched from Freshdesk');
  }
  
  // Store tickets in YtdTicket table
  logger.info({ snapshotId, ticketCount: tickets.length, isIncremental }, 'Storing tickets in database');
  const upsertResult = await upsertYtdTickets(tickets);
  
  if (!upsertResult.success) {
    logger.error({ error: upsertResult.error }, 'Failed to store tickets');
    throw new Error(upsertResult.error || 'Failed to store tickets');
  }
  
  // Save current sync timestamp for next incremental sync
  await setConfig(LAST_SYNC_CONFIG_KEY, syncStartTime.toISOString());
  
  logger.info({ 
    snapshotId,
    ticketCount: upsertResult.upsertedCount, 
    isIncremental,
    nextSyncFrom: syncStartTime.toISOString(),
  }, 'Tickets stored successfully');

  // Groups and companies - fetch from cache or Freshdesk (only on first run or if cache empty)
  let groups: FreshdeskGroup[] = [];
  let companies: FreshdeskCompany[] = [];

  // Only fetch groups/companies if this is a full sync (first time)
  // Otherwise, use cached data from database
  if (!isIncremental) {
    try {
      logger.info({ snapshotId }, 'Fetching groups from Freshdesk (first sync)');
      groups = [...await client.getGroups()];
    } catch (error) {
      logger.warn({ snapshotId, error }, 'Failed to fetch groups, continuing without');
    }

    try {
      logger.info({ snapshotId }, 'Fetching companies from Freshdesk (first sync)');
      companies = [...await client.getAllCompanies()];
    } catch (error) {
      logger.warn({ snapshotId, error }, 'Failed to fetch companies, continuing without');
    }

    // Cache companies and groups in database for fast lookup
    await cacheCompaniesAndGroups(companies, groups);
  } else {
    // Use cached groups/companies from database
    logger.info({ snapshotId }, 'Using cached groups/companies from database (incremental sync)');
    const cached = await getCachedCompaniesAndGroups();
    groups = cached.groups;
    companies = cached.companies;
  }

  const metadata: WeeklySnapshotMetadata = {
    snapshotId,
    weekStartDate: weekStart.toISOString(),
    weekEndDate: weekEnd.toISOString(),
    createdAt: new Date().toISOString(),
    timezone: config.scheduler.timezone,
    version: 1,
  };

  logger.info({
    snapshotId,
    ticketCount: tickets.length,
    groupCount: groups.length,
    companyCount: companies.length,
    isIncremental,
  }, 'Freshdesk data ingestion complete (SINGLE API CALL)');

  return {
    metadata,
    tickets,
    groups,
    companies,
  };
}

/**
 * Get cached companies and groups from database
 */
async function getCachedCompaniesAndGroups(): Promise<{ companies: FreshdeskCompany[]; groups: FreshdeskGroup[] }> {
  const { getPrismaClient } = await import('../persistence/prisma-client');
  const prisma = getPrismaClient();

  try {
    const cachedCompanies = await prisma.companyCache.findMany();
    const cachedGroups = await prisma.groupCache.findMany();

    const companies: FreshdeskCompany[] = cachedCompanies.map(c => ({
      id: Number(c.freshdeskCompanyId),
      name: c.name,
      description: '',
      created_at: '',
      updated_at: '',
      custom_fields: {},
    }));

    const groups: FreshdeskGroup[] = cachedGroups.map(g => ({
      id: Number(g.freshdeskGroupId),
      name: g.name,
      description: '',
      created_at: '',
      updated_at: '',
    }));

    return { companies, groups };
  } catch (error) {
    logger.warn({ error }, 'Failed to get cached companies/groups');
    return { companies: [], groups: [] };
  }
}

async function cacheCompaniesAndGroups(
  companies: readonly FreshdeskCompany[],
  groups: readonly FreshdeskGroup[]
): Promise<void> {
  const { getPrismaClient } = await import('../persistence/prisma-client');
  const prisma = getPrismaClient();

  try {
    // Cache companies
    if (companies.length > 0) {
      logger.info({ count: companies.length }, 'Caching companies to database');
      for (const company of companies) {
        await prisma.companyCache.upsert({
          where: { freshdeskCompanyId: BigInt(company.id) },
          create: {
            freshdeskCompanyId: BigInt(company.id),
            name: company.name,
          },
          update: {
            name: company.name,
          },
        });
      }
      logger.info({ count: companies.length }, 'Companies cached successfully');
    }

    // Cache groups
    if (groups.length > 0) {
      logger.info({ count: groups.length }, 'Caching groups to database');
      for (const group of groups) {
        await prisma.groupCache.upsert({
          where: { freshdeskGroupId: BigInt(group.id) },
          create: {
            freshdeskGroupId: BigInt(group.id),
            name: group.name,
          },
          update: {
            name: group.name,
          },
        });
      }
      logger.info({ count: groups.length }, 'Groups cached successfully');
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to cache companies/groups, continuing');
  }
}

export function createJobContext(isRetry: boolean = false, retryCount: number = 0): JobExecutionContext {
  const now = new Date();

  return {
    jobId: `job_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`,
    scheduledAt: now.toISOString(),
    executedAt: now.toISOString(),
    isRetry,
    retryCount,
  };
}
