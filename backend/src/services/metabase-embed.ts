import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * Metabase Signed Embedding Service
 * Generates secure JWT tokens for embedding Metabase dashboards/questions
 * 
 * Security:
 * - JWT secret never exposed to client
 * - Tokens generated server-side only
 * - Short expiration (10 minutes)
 */

interface MetabaseEmbedParams {
  resource: { question?: number; dashboard?: number };
  params?: Record<string, any>;
  exp?: number;
}

export class MetabaseEmbedService {
  private readonly siteUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.siteUrl = process.env.METABASE_SITE_URL || process.env.METABASE_URL || '';
    this.secretKey = process.env.METABASE_SECRET_KEY || '';

    if (!this.siteUrl) {
      logger.warn('METABASE_SITE_URL not configured');
    }
    if (!this.secretKey) {
      logger.warn('METABASE_SECRET_KEY not configured');
    }
  }

  /**
   * Generate signed embed URL for a Metabase question
   */
  generateQuestionEmbedUrl(questionId: number, params?: Record<string, any>): string {
    if (!this.siteUrl || !this.secretKey) {
      throw new Error('Metabase embedding not configured');
    }

    const payload: MetabaseEmbedParams = {
      resource: { question: questionId },
      params: params || {},
      exp: Math.round(Date.now() / 1000) + (10 * 60), // 10 minutes
    };

    const token = jwt.sign(payload, this.secretKey);
    const iframeUrl = `${this.siteUrl}/embed/question/${token}#bordered=true&titled=true`;

    logger.info({ questionId, hasParams: !!params }, 'Generated Metabase embed URL');

    return iframeUrl;
  }

  /**
   * Generate signed embed URL for a Metabase dashboard
   */
  generateDashboardEmbedUrl(dashboardId: number, params?: Record<string, any>): string {
    if (!this.siteUrl || !this.secretKey) {
      throw new Error('Metabase embedding not configured');
    }

    const payload: MetabaseEmbedParams = {
      resource: { dashboard: dashboardId },
      params: params || {},
      exp: Math.round(Date.now() / 1000) + (10 * 60), // 10 minutes
    };

    const token = jwt.sign(payload, this.secretKey);
    const iframeUrl = `${this.siteUrl}/embed/dashboard/${token}#bordered=true&titled=true`;

    logger.info({ dashboardId, hasParams: !!params }, 'Generated Metabase dashboard embed URL');

    return iframeUrl;
  }

  /**
   * Check if Metabase embedding is configured
   */
  isConfigured(): boolean {
    return !!(this.siteUrl && this.secretKey);
  }
}

// Singleton instance
let embedService: MetabaseEmbedService | null = null;

export function getMetabaseEmbedService(): MetabaseEmbedService {
  if (!embedService) {
    embedService = new MetabaseEmbedService();
  }
  return embedService;
}
