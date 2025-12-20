import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../persistence/prisma-client';

interface ShareLink {
  id: string;
  token: string;
  type: 'map' | 'report';
  expiresAt: Date;
  createdAt: Date;
  metadata?: any;
}

export default async function shareLinksRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // Create shareable map link
  fastify.post('/api/share/map', async (request, reply) => {
    try {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store in database
      await prisma.$executeRaw`
        INSERT INTO share_links (token, type, expires_at, created_at)
        VALUES (${token}, 'map', ${expiresAt}, NOW())
      `;

      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/share/map/${token}`;

      logger.info({ token, expiresAt }, 'Map share link created');

      return reply.send({
        success: true,
        shareUrl,
        token,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create share link');
      return reply.status(500).send({
        success: false,
        error: 'Failed to create share link',
      });
    }
  });

  // Verify share link
  fastify.get('/api/share/verify/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      const result = await prisma.$queryRaw<ShareLink[]>`
        SELECT * FROM share_links
        WHERE token = ${token}
        AND expires_at > NOW()
        LIMIT 1
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Share link not found or expired',
        });
      }

      return reply.send({
        success: true,
        link: result[0],
      });
    } catch (error) {
      logger.error({ error, token }, 'Failed to verify share link');
      return reply.status(500).send({
        success: false,
        error: 'Failed to verify share link',
      });
    }
  });

  // Revoke share link
  fastify.delete('/api/share/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      await prisma.$executeRaw`
        DELETE FROM share_links
        WHERE token = ${token}
      `;

      logger.info({ token }, 'Share link revoked');

      return reply.send({
        success: true,
        message: 'Share link revoked',
      });
    } catch (error) {
      logger.error({ error, token }, 'Failed to revoke share link');
      return reply.status(500).send({
        success: false,
        error: 'Failed to revoke share link',
      });
    }
  });

  // Cleanup expired links (called by cron)
  fastify.post('/api/share/cleanup', async (_request, reply) => {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM share_links
        WHERE expires_at < NOW()
      `;

      logger.info({ deletedCount: result }, 'Expired share links cleaned up');

      return reply.send({
        success: true,
        deletedCount: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired links');
      return reply.status(500).send({
        success: false,
        error: 'Failed to cleanup expired links',
      });
    }
  });
}
