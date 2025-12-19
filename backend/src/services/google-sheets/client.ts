import { logger } from '../../utils/logger';
import { getSecureConfig, onConfigChange, clearConfigCache } from '../secure-config';
import { logActivity } from '../../persistence/activity-log-repository';

// Rate limiting for Google Sheets API (free tier: 100 requests per 100 seconds)
const RATE_LIMIT_DELAY_MS = 1100; // ~1 request per second to stay well under limit
let lastRequestTime = 0;

interface SheetAppendResult {
  success: boolean;
  message: string;
  rowsAppended?: number;
}

/**
 * Google Sheets Integration Client
 * 
 * Supports two modes:
 * 1. Google Apps Script Web App URL (simpler, no OAuth needed)
 * 2. Direct Sheets API with service account (more complex)
 * 
 * For simplicity and free tier usage, we recommend the Apps Script approach.
 */
export class GoogleSheetsClient {
  private webAppUrl: string | null = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Always fetch fresh config (getSecureConfig handles caching with TTL)
      this.webAppUrl = await getSecureConfig('GOOGLE_SHEETS_URL') || process.env.GOOGLE_SHEETS_URL || null;
      this.initialized = !!this.webAppUrl;
      
      if (this.initialized) {
        logger.info('Google Sheets client initialized with Web App URL');
      } else {
        logger.warn('Google Sheets not configured - GOOGLE_SHEETS_URL not set');
      }
      
      return this.initialized;
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Google Sheets client');
      return false;
    }
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
  }

  /**
   * Append a row to the Google Sheet via Apps Script Web App.
   * 
   * Supports two formats:
   * 1. 'append' action with headers/rows (from docs)
   * 2. 'appendRow' action with data object (legacy)
   */
  async appendRow(data: Record<string, string | number>): Promise<SheetAppendResult> {
    // Always re-initialize to get fresh config (supports dynamic URL changes)
    await this.initialize();

    if (!this.webAppUrl) {
      return {
        success: false,
        message: 'Google Sheets not configured. Please set GOOGLE_SHEETS_URL in settings.',
      };
    }

    try {
      await this.rateLimitDelay();

      // Send data to 'Weekly Review' sheet
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'append',
          sheetName: 'Weekly Review',
          payload: {
            headers: Object.keys(data),
            rows: [Object.values(data)],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as { success?: boolean; error?: string; message?: string };
      
      if (result.success === false) {
        throw new Error(result.error || 'Unknown error from Google Sheets');
      }

      await logActivity({
        activityType: 'GOOGLE_SHEETS_APPEND',
        description: 'Appended row to Google Sheet',
        metadata: { dataKeys: Object.keys(data) },
      });

      logger.info({ dataKeys: Object.keys(data) }, 'Row appended to Google Sheet');

      return {
        success: true,
        message: result.message || 'Row appended successfully',
        rowsAppended: 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await logActivity({
        activityType: 'GOOGLE_SHEETS_ERROR',
        description: `Failed to append row: ${errorMessage}`,
        metadata: { error: errorMessage },
      });

      logger.error({ error }, 'Failed to append row to Google Sheet');

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Append the weekly report data to Google Sheet.
   * Format: Column A = Date, Column B = Full report text (matching existing format)
   */
  async appendWeeklyReport(reportData: {
    weekEndDate: string;
    totalOpenRfts: number;
    capacityHours: string;
    ticketsCreated: number;
    urgent: number;
    high: number;
    topCompany: string;
    ticketsResolved: number;
    seResolved: number;
    psResolved: number;
    timePerTicket: string;
    seUnresolved: number;
    sePending: number;
    seOpen: number;
    psUnresolved: number;
    psOpen: number;
    psPending: number;
  }): Promise<SheetAppendResult> {
    // Format date as DD-MM-YYYY
    const weekEndDateObj = new Date(reportData.weekEndDate);
    const formattedDate = `${weekEndDateObj.getDate()}-${weekEndDateObj.getMonth() + 1}-${weekEndDateObj.getFullYear()}`;
    
    // Build the report text in the same format as existing entries
    const reportText = `Total open RFTs: ${reportData.totalOpenRfts}K(18k needs to be closed by product)
Capacity allocated hours : ${reportData.capacityHours}

Tickets created : ${reportData.ticketsCreated} (Time Period : ${formattedDate})
Urgent : ${reportData.urgent}
High : ${reportData.high}
Customer showed us most love: ${reportData.topCompany}

Tickets resolved : ${reportData.ticketsResolved}
Support engineers group: ${reportData.seResolved}
Product support group : ${reportData.psResolved}
Time taken per ticket support engineer group : ${reportData.timePerTicket}

Note: Check Tags are marked on the tickets

Total Unresolved on support engineers group : ${reportData.seUnresolved}
Pending : ${reportData.sePending}
Open : ${reportData.seOpen}

Total Unresolved on product support group : ${reportData.psUnresolved}
Marked release : 0
Open : ${reportData.psOpen}
Pending : ${reportData.psPending}`;

    return this.appendRow({
      'Week ending on': formattedDate,
      'Notes and statistics': reportText,
    });
  }
}

// Singleton instance
let clientInstance: GoogleSheetsClient | null = null;

export function getGoogleSheetsClient(): GoogleSheetsClient {
  if (!clientInstance) {
    clientInstance = new GoogleSheetsClient();
  }
  return clientInstance;
}

/**
 * Google Apps Script template for the web app.
 * Deploy this as a web app in Google Apps Script and use the URL.
 * 
 * ```javascript
 * function doPost(e) {
 *   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *   var data = JSON.parse(e.postData.contents);
 *   
 *   if (data.action === 'appendRow') {
 *     var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 *     var row = headers.map(function(header) {
 *       return data.data[header] || '';
 *     });
 *     sheet.appendRow(row);
 *     return ContentService.createTextOutput(JSON.stringify({success: true}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   return ContentService.createTextOutput(JSON.stringify({error: 'Unknown action'}))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 * 
 * function doGet(e) {
 *   return ContentService.createTextOutput('Google Sheets API is running')
 *     .setMimeType(ContentService.MimeType.TEXT);
 * }
 * ```
 */
