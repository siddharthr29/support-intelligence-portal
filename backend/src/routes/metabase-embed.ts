import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireLeadership } from '../middleware/role-check';
import { logger } from '../utils/logger';
import { getMetabaseEmbedService } from '../services/metabase-embed';

/**
 * Metabase Embed Routes
 * Generates signed embed URLs for Metabase resources
 * 
 * Security:
 * - All routes require authentication + leadership role
 * - JWT secret never exposed to client
 * - Tokens generated server-side only
 * - Short expiration (10 minutes)
 */

export async function registerMetabaseEmbedRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Generate embed URL for Question 816 (All Implementations)
  fastify.get<{
    Querystring: { params?: string };
  }>('/api/metabase/embed/question/816', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    try {
      const embedService = getMetabaseEmbedService();
      
      if (!embedService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          error: 'Metabase embedding not configured',
          message: 'METABASE_SITE_URL and METABASE_SECRET_KEY must be set',
        });
      }

      // Parse params if provided
      let params = {};
      if (request.query.params) {
        try {
          params = JSON.parse(request.query.params);
        } catch (e) {
          logger.warn({ params: request.query.params }, 'Failed to parse embed params');
        }
      }

      const embedUrl = embedService.generateQuestionEmbedUrl(816, params);

      return reply.send({
        success: true,
        data: {
          embedUrl,
          expiresIn: 600, // 10 minutes
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate Metabase embed URL');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate embed URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Generic question embed endpoint
  fastify.get<{
    Params: { questionId: string };
    Querystring: { params?: string };
  }>('/api/metabase/embed/question/:questionId', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    try {
      const questionId = parseInt(request.params.questionId, 10);
      
      if (isNaN(questionId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid question ID',
        });
      }

      const embedService = getMetabaseEmbedService();
      
      if (!embedService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          error: 'Metabase embedding not configured',
        });
      }

      let params = {};
      if (request.query.params) {
        try {
          params = JSON.parse(request.query.params);
        } catch (e) {
          logger.warn({ params: request.query.params }, 'Failed to parse embed params');
        }
      }

      const embedUrl = embedService.generateQuestionEmbedUrl(questionId, params);

      return reply.send({
        success: true,
        data: {
          embedUrl,
          expiresIn: 600,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate Metabase embed URL');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate embed URL',
      });
    }
  });

  // Generic dashboard embed endpoint
  fastify.get<{
    Params: { dashboardId: string };
    Querystring: { params?: string };
  }>('/api/metabase/embed/dashboard/:dashboardId', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    try {
      const dashboardId = parseInt(request.params.dashboardId, 10);
      
      if (isNaN(dashboardId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid dashboard ID',
        });
      }

      const embedService = getMetabaseEmbedService();
      
      if (!embedService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          error: 'Metabase embedding not configured',
        });
      }

      let params = {};
      if (request.query.params) {
        try {
          params = JSON.parse(request.query.params);
        } catch (e) {
          logger.warn({ params: request.query.params }, 'Failed to parse embed params');
        }
      }

      const embedUrl = embedService.generateDashboardEmbedUrl(dashboardId, params);

      return reply.send({
        success: true,
        data: {
          embedUrl,
          expiresIn: 600,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate Metabase embed URL');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate embed URL',
      });
    }
  });

  logger.info('Metabase embed routes registered');
}
