import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireLeadership } from '../middleware/role-check';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../persistence/prisma-client';

export async function registerImplementationsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all implementations
  fastify.get('/api/implementations', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const implementations = await prisma.implementation.findMany({
        orderBy: { slNo: 'asc' },
      });

      return reply.send({
        success: true,
        data: {
          implementations,
          count: implementations.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch implementations');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve implementations',
      });
    }
  });

  // Create new implementation
  fastify.post<{
    Body: {
      organisationName: string;
      sector: string;
      projectName: string;
      forType: string;
      website?: string;
      state: string;
    };
  }>('/api/implementations', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const { organisationName, sector, projectName, forType, website, state } = request.body;

      // Get next sl_no
      const maxSlNo = await prisma.implementation.findFirst({
        orderBy: { slNo: 'desc' },
        select: { slNo: true },
      });

      const nextSlNo = (maxSlNo?.slNo || 0) + 1;

      const implementation = await prisma.implementation.create({
        data: {
          slNo: nextSlNo,
          organisationName,
          sector,
          projectName,
          forType: forType || 'Self',
          website: website || null,
          state,
        },
      });

      logger.info({ id: implementation.id }, 'Implementation created');

      return reply.send({
        success: true,
        data: { implementation },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create implementation');
      return reply.status(500).send({
        success: false,
        error: 'Failed to create implementation',
      });
    }
  });

  // Update implementation
  fastify.put<{
    Params: { id: string };
    Body: {
      organisationName: string;
      sector: string;
      projectName: string;
      forType: string;
      website?: string;
      state: string;
    };
  }>('/api/implementations/:id', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const id = parseInt(request.params.id);
      const { organisationName, sector, projectName, forType, website, state } = request.body;

      const implementation = await prisma.implementation.update({
        where: { id },
        data: {
          organisationName,
          sector,
          projectName,
          forType,
          website: website || null,
          state,
        },
      });

      logger.info({ id }, 'Implementation updated');

      return reply.send({
        success: true,
        data: { implementation },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update implementation');
      return reply.status(500).send({
        success: false,
        error: 'Failed to update implementation',
      });
    }
  });

  // Delete implementation
  fastify.delete<{
    Params: { id: string };
  }>('/api/implementations/:id', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const id = parseInt(request.params.id);

      await prisma.implementation.delete({
        where: { id },
      });

      logger.info({ id }, 'Implementation deleted');

      return reply.send({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete implementation');
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete implementation',
      });
    }
  });

  logger.info('Implementations routes registered');
}
