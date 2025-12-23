import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getSecureConfig, onConfigChange, clearConfigCache } from '../secure-config';
import type {
  RftWeeklyMetrics,
  RftOrganisationMetrics,
  RftWeeklyTotals,
  MetabaseQueryResponse,
  SyncPerformanceMetrics,
  SyncPerformanceOrganisationMetrics,
  SyncPerformanceTotals,
} from './types';

const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (Metabase default)

/**
 * Metabase Session Manager
 * 
 * SECURITY: Uses secure config manager for credentials.
 * Credentials are never logged or exposed.
 * 
 * IMPORTANT: Metabase API keys do NOT work for data-fetching endpoints like
 * /api/card/:id/query. These endpoints require session-based authentication
 * via /api/session. Metabase intentionally returns 404 to obscure endpoint
 * existence when using API keys on unsupported endpoints.
 * 
 * This class manages session tokens with automatic refresh.
 */
class MetabaseSessionManager {
  private sessionToken: string | null = null;
  private sessionExpiresAt: number = 0;
  private loginPromise: Promise<string> | null = null;

  constructor() {
    // SECURITY: Register for config changes to invalidate session on credential update
    onConfigChange('METABASE_USERNAME', () => this.invalidateSession());
    onConfigChange('METABASE_PASSWORD', () => this.invalidateSession());
  }

  invalidateSession(): void {
    this.sessionToken = null;
    this.sessionExpiresAt = 0;
    logger.info('Metabase session invalidated due to credential change');
  }

  async getSessionToken(): Promise<string> {
    // Return cached token if still valid (with 1 hour buffer)
    if (this.sessionToken && Date.now() < this.sessionExpiresAt - 60 * 60 * 1000) {
      return this.sessionToken;
    }

    // Prevent concurrent login attempts
    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = this.login();
    try {
      const token = await this.loginPromise;
      return token;
    } finally {
      this.loginPromise = null;
    }
  }

  private async login(): Promise<string> {
    // SECURITY: Get credentials from secure config (encrypted at rest)
    const metabaseUrl = await getSecureConfig('METABASE_URL') || config.metabase.url;
    const username = await getSecureConfig('METABASE_USERNAME', true) || config.metabase.username;
    const password = await getSecureConfig('METABASE_PASSWORD', true) || config.metabase.password;

    const url = `${metabaseUrl}/api/session`;
    
    logger.info('Authenticating with Metabase via session login');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Metabase session login failed');
      throw new Error(`Metabase login failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { id: string };
    this.sessionToken = data.id;
    this.sessionExpiresAt = Date.now() + SESSION_TTL_MS;

    logger.info('Metabase session established successfully');
    return this.sessionToken;
  }
}

// Singleton session manager
const sessionManager = new MetabaseSessionManager();

export class MetabaseReadOnlyClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.metabase.url;
    logger.info({ url: this.baseUrl }, 'MetabaseReadOnlyClient initialized (session-based auth)');
  }

  /**
   * Execute authenticated request using session token.
   * API keys are NOT used because Metabase returns 404 for data endpoints
   * when using API key authentication.
   */
  private async executeRequest<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: object): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.rateLimitDelay();

        const sessionToken = await sessionManager.getSessionToken();

        const response = await fetch(url, {
          method,
          headers: {
            'X-Metabase-Session': sessionToken,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle session expiration
        if (response.status === 401) {
          logger.warn('Metabase session expired, re-authenticating');
          sessionManager.invalidateSession();
          if (attempt < MAX_RETRIES) {
            continue;
          }
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
          logger.warn({ retryAfter, attempt }, 'Metabase rate limited, waiting');
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Metabase API error: ${response.status} - ${errorText}`);
        }

        return await response.json() as T;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error({ error, endpoint, attempt }, 'Metabase API request failed after max retries');
          throw error;
        }
        logger.warn({ error, endpoint, attempt }, 'Metabase API request failed, retrying');
        await this.delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error('Unexpected: exceeded max retries without throwing');
  }

  private async rateLimitDelay(): Promise<void> {
    await this.delay(RATE_LIMIT_DELAY_MS);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getRftWeeklyMetrics(questionId?: number): Promise<RftWeeklyMetrics> {
    const qId = questionId || config.metabase.rftQuestionId;
    
    // Using session-based auth, we can directly call the card query endpoint
    const endpoint = `/api/card/${qId}/query/json`;

    logger.info({ questionId: qId, endpoint }, 'Fetching RFT weekly metrics from Metabase');

    const rawData = await this.executeRequest<(string | number)[][]>(endpoint, 'POST');
    return this.parseRftMetrics(rawData, qId);
  }

  private parseRftMetrics(
    rawRows: (string | number)[][],
    questionId: number
  ): RftWeeklyMetrics {
    const byOrganisation: RftOrganisationMetrics[] = [];

    // Metabase returns data with columns:
    // organization | newly_reported_current_week | closures_this_week | closed_rfts_so_far | total_open_rfts
    // First row is "Total" which contains the aggregate values we need

    let totals: RftWeeklyTotals = {
      newlyReportedCurrentWeek: 0,
      closuresThisWeek: 0,
      closedRftsSoFar: 0,
      totalOpenRfts: 0,
    };

    logger.info({ rawRowCount: rawRows.length, firstRow: rawRows[0] }, 'Parsing RFT metrics from Metabase');

    // Helper to parse numbers that may have commas (e.g., "1,935" -> 1935)
    const parseNumber = (val: string | number | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return val;
      // Remove commas and parse
      const cleaned = String(val).replace(/,/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    };

    for (const row of rawRows) {
      // Handle both array format and object format from Metabase
      let organisation: string;
      let newlyReportedCurrentWeek: number;
      let closuresThisWeek: number;
      let closedRftsSoFar: number;
      let openRfts: number;

      if (Array.isArray(row)) {
        organisation = String(row[0] || '').trim();
        newlyReportedCurrentWeek = parseNumber(row[1]);
        closuresThisWeek = parseNumber(row[2]);
        closedRftsSoFar = parseNumber(row[3]);
        openRfts = parseNumber(row[4]);
      } else {
        // Object format with named keys
        const obj = row as Record<string, string | number>;
        organisation = String(obj['organization'] || obj['organisation'] || '').trim();
        newlyReportedCurrentWeek = parseNumber(obj['newly_reported_current_week']);
        closuresThisWeek = parseNumber(obj['closures_this_week']);
        closedRftsSoFar = parseNumber(obj['closed_rfts_so_far']);
        openRfts = parseNumber(obj['total_open_rfts']);
      }

      // First row "Total" contains the aggregate totals we need
      if (organisation.toLowerCase() === 'total') {
        totals = {
          newlyReportedCurrentWeek,
          closuresThisWeek,
          closedRftsSoFar,
          totalOpenRfts: openRfts,
        };
        logger.info({ totals }, 'Found Total row in RFT data');
      } else if (organisation) {
        // Other rows are individual organizations
        byOrganisation.push({
          organisation,
          newlyReportedCurrentWeek,
          closuresThisWeek,
          closedRftsSoFar,
          totalOpenRfts: openRfts,
        });
      }
    }

    logger.info({
      questionId,
      organisationCount: byOrganisation.length,
      totalOpenRfts: totals.totalOpenRfts,
    }, 'RFT metrics parsed successfully');

    return {
      fetchedAt: new Date().toISOString(),
      questionId,
      totals,
      byOrganisation,
    };
  }

  async getSyncPerformanceMetrics(questionId?: number): Promise<SyncPerformanceMetrics> {
    const qId = questionId || config.metabase.syncPerformanceQuestionId;
    
    const endpoint = `/api/card/${qId}/query/json`;

    logger.info({ questionId: qId, endpoint }, 'Fetching sync performance metrics from Metabase');

    const rawData = await this.executeRequest<(string | number)[][]>(endpoint, 'POST');
    return this.parseSyncPerformanceMetrics(rawData, qId);
  }

  private parseSyncPerformanceMetrics(
    rawRows: (string | number)[][],
    questionId: number
  ): SyncPerformanceMetrics {
    const byOrganisation: SyncPerformanceOrganisationMetrics[] = [];

    logger.info({ 
      rawRowCount: rawRows.length, 
      firstRow: rawRows[0],
      firstRowLength: rawRows[0]?.length,
      sampleRows: rawRows.slice(0, 3)
    }, 'Parsing sync performance metrics from Metabase');

    const parseNumber = (val: string | number | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/,/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const parseFloat = (val: string | number | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/,/g, '').replace(/%/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    };

    for (const row of rawRows) {
      let sNo: number;
      let organisationName: string;
      let totalSyncs: number;
      let successfulSyncs: number;
      let incompleteSyncs: number;
      let successRate: number;
      let usabilityScore: number;
      let rank: number;

      if (Array.isArray(row) && row.length >= 8) {
        // Array format
        sNo = parseNumber(row[0]);
        organisationName = String(row[1] || '').trim();
        totalSyncs = parseNumber(row[2]);
        successfulSyncs = parseNumber(row[3]);
        incompleteSyncs = parseNumber(row[4]);
        successRate = parseFloat(row[5]);
        usabilityScore = parseFloat(row[6]);
        rank = parseNumber(row[7]);
      } else if (typeof row === 'object' && !Array.isArray(row)) {
        // Object format from Metabase
        const obj = row as Record<string, string | number>;
        sNo = parseNumber(obj['S.No']);
        organisationName = String(obj['Organization Name'] || '').trim();
        totalSyncs = parseNumber(obj['Total Syncs']);
        successfulSyncs = parseNumber(obj['Successful Syncs']);
        incompleteSyncs = parseNumber(obj['Incomplete Syncs']);
        successRate = parseFloat(obj['Success Rate (%)']);
        usabilityScore = parseFloat(obj['Usability Score (%)']);
        rank = parseNumber(obj['Rank']);
      } else {
        continue;
      }

      if (organisationName) {
        byOrganisation.push({
          sNo,
          organisationName,
          totalSyncs,
          successfulSyncs,
          incompleteSyncs,
          successRate,
          usabilityScore,
          rank,
        });
      }
    }

    const totalOrganisations = byOrganisation.length;
    const avgSuccessRate = totalOrganisations > 0
      ? byOrganisation.reduce((sum, org) => sum + org.successRate, 0) / totalOrganisations
      : 0;
    const avgUsabilityScore = totalOrganisations > 0
      ? byOrganisation.reduce((sum, org) => sum + org.usabilityScore, 0) / totalOrganisations
      : 0;

    const totals: SyncPerformanceTotals = {
      totalOrganisations,
      avgSuccessRate,
      avgUsabilityScore,
    };

    logger.info({
      questionId,
      organisationCount: byOrganisation.length,
      avgUsabilityScore: avgUsabilityScore.toFixed(2),
    }, 'Sync performance metrics parsed successfully');

    return {
      fetchedAt: new Date().toISOString(),
      questionId,
      totals,
      byOrganisation,
    };
  }
}

export function createMetabaseClient(): MetabaseReadOnlyClient {
  return new MetabaseReadOnlyClient();
}
