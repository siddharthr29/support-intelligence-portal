import { getFreshdeskApiKey, getFreshdeskDomain } from '../../config';
import { getSecureConfig } from '../secure-config';
import { logger } from '../../utils/logger';
import type {
  FreshdeskTicket,
  FreshdeskConversation,
  FreshdeskGroup,
  FreshdeskCompany,
  FreshdeskTicketField,
  FreshdeskPaginatedResponse,
} from './types';

// Rate limiting configuration for Freshdesk API
// Freshdesk allows ~50 requests/minute for most plans
const RATE_LIMIT_DELAY_MS = 200; // 200ms between requests = ~5 req/sec (safe margin)
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const PAGE_SIZE = 100;
const YTD_FETCH_DELAY_MS = 500; // Slower for bulk YTD fetching to avoid rate limits

export class FreshdeskReadOnlyClient {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    // Initial setup from env vars (will be refreshed dynamically)
    const domain = getFreshdeskDomain();
    const apiKey = getFreshdeskApiKey();

    this.baseUrl = `https://${domain}/api/v2`;
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;

    logger.info({ domain }, 'FreshdeskReadOnlyClient initialized');
  }

  /**
   * Refresh credentials from secure config (supports dynamic updates from settings)
   */
  private async refreshCredentials(): Promise<void> {
    const domain = await getSecureConfig('FRESHDESK_DOMAIN') || getFreshdeskDomain();
    const apiKey = await getSecureConfig('FRESHDESK_API_KEY', true) || getFreshdeskApiKey();

    this.baseUrl = `https://${domain}/api/v2`;
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;
  }

  private async executeGet<T>(endpoint: string): Promise<T> {
    // Refresh credentials before each request to support dynamic config changes
    await this.refreshCredentials();
    
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.rateLimitDelay();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          logger.warn({ retryAfter, attempt }, 'Rate limited, waiting before retry');
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Freshdesk API error: ${response.status} - ${errorText}`);
        }

        return await response.json() as T;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error({ error, endpoint, attempt }, 'Freshdesk API request failed after max retries');
          throw error;
        }
        logger.warn({ error, endpoint, attempt }, 'Freshdesk API request failed, retrying');
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

  async getTickets(page: number = 1): Promise<FreshdeskPaginatedResponse<FreshdeskTicket>> {
    const endpoint = `/tickets?per_page=${PAGE_SIZE}&page=${page}&include=description`;
    const data = await this.executeGet<FreshdeskTicket[]>(endpoint);

    return {
      data,
      hasMore: data.length === PAGE_SIZE,
      nextPage: data.length === PAGE_SIZE ? page + 1 : null,
    };
  }

  async getTicketsByDateRange(
    updatedSince: Date,
    page: number = 1
  ): Promise<FreshdeskPaginatedResponse<FreshdeskTicket>> {
    const dateStr = updatedSince.toISOString();
    const endpoint = `/tickets?per_page=${PAGE_SIZE}&page=${page}&updated_since=${dateStr}&include=description`;
    const data = await this.executeGet<FreshdeskTicket[]>(endpoint);

    return {
      data,
      hasMore: data.length === PAGE_SIZE,
      nextPage: data.length === PAGE_SIZE ? page + 1 : null,
    };
  }

  async getAllTicketsByDateRange(updatedSince: Date): Promise<readonly FreshdeskTicket[]> {
    const allTickets: FreshdeskTicket[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getTicketsByDateRange(updatedSince, page);
      allTickets.push(...response.data);
      hasMore = response.hasMore;
      page = response.nextPage || page + 1;

      logger.info({ page: page - 1, ticketsFetched: response.data.length, totalSoFar: allTickets.length }, 'Fetched tickets page');
    }

    return allTickets;
  }

  async getTicketConversations(ticketId: number): Promise<readonly FreshdeskConversation[]> {
    const endpoint = `/tickets/${ticketId}/conversations`;
    return await this.executeGet<FreshdeskConversation[]>(endpoint);
  }

  async getGroups(): Promise<readonly FreshdeskGroup[]> {
    const endpoint = '/groups';
    return await this.executeGet<FreshdeskGroup[]>(endpoint);
  }

  async getCompanies(page: number = 1): Promise<FreshdeskPaginatedResponse<FreshdeskCompany>> {
    const endpoint = `/companies?per_page=${PAGE_SIZE}&page=${page}`;
    const data = await this.executeGet<FreshdeskCompany[]>(endpoint);

    return {
      data,
      hasMore: data.length === PAGE_SIZE,
      nextPage: data.length === PAGE_SIZE ? page + 1 : null,
    };
  }

  async getAllCompanies(): Promise<readonly FreshdeskCompany[]> {
    const allCompanies: FreshdeskCompany[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getCompanies(page);
      allCompanies.push(...response.data);
      hasMore = response.hasMore;
      page = response.nextPage || page + 1;
    }

    return allCompanies;
  }

  async getTicketFields(): Promise<readonly FreshdeskTicketField[]> {
    const endpoint = '/ticket_fields';
    return await this.executeGet<FreshdeskTicketField[]>(endpoint);
  }

  /**
   * Fetch ALL tickets from the start of the current year (YTD).
   * Uses slower rate limiting to prevent API throttling.
   */
  async getAllYtdTickets(): Promise<readonly FreshdeskTicket[]> {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
    const allTickets: FreshdeskTicket[] = [];
    let page = 1;
    let hasMore = true;

    logger.info({ startOfYear: startOfYear.toISOString() }, 'Starting YTD ticket fetch from Freshdesk');

    while (hasMore) {
      // Use slower delay for bulk fetching
      await this.delay(YTD_FETCH_DELAY_MS);
      
      const response = await this.getTicketsByDateRange(startOfYear, page);
      allTickets.push(...response.data);
      hasMore = response.hasMore;
      page = response.nextPage || page + 1;

      logger.info({ 
        page: page - 1, 
        ticketsFetched: response.data.length, 
        totalSoFar: allTickets.length,
        hasMore 
      }, 'YTD fetch progress');
    }

    logger.info({ totalTickets: allTickets.length }, 'YTD ticket fetch complete');
    return allTickets;
  }

  /**
   * Fetch tickets updated since a specific date (INCREMENTAL SYNC).
   * Used for weekly updates - only fetches new/updated tickets since last sync.
   */
  async getTicketsUpdatedSince(since: Date): Promise<readonly FreshdeskTicket[]> {
    const allTickets: FreshdeskTicket[] = [];
    let page = 1;
    let hasMore = true;

    logger.info({ since: since.toISOString() }, 'Starting incremental ticket fetch from Freshdesk');

    while (hasMore) {
      // Use slower delay for bulk fetching
      await this.delay(YTD_FETCH_DELAY_MS);
      
      const response = await this.getTicketsByDateRange(since, page);
      allTickets.push(...response.data);
      hasMore = response.hasMore;
      page = response.nextPage || page + 1;

      logger.info({ 
        page: page - 1, 
        ticketsFetched: response.data.length, 
        totalSoFar: allTickets.length,
        hasMore 
      }, 'Incremental fetch progress');
    }

    logger.info({ totalTickets: allTickets.length, since: since.toISOString() }, 'Incremental ticket fetch complete');
    return allTickets;
  }
}

export function createFreshdeskClient(): FreshdeskReadOnlyClient {
  return new FreshdeskReadOnlyClient();
}
