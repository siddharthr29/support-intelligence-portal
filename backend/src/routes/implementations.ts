import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { requireLeadership } from '../middleware/role-check';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../persistence/prisma-client';
import { validateImplementationData, sanitizeString } from '../middleware/request-validator';

export async function registerImplementationsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get all implementations
  fastify.get('/api/implementations', {
    preHandler: [authMiddleware, requireLeadership],
  }, async (request, reply) => {
    const prisma = getPrismaClient();

    try {
      const implementations = await prisma.implementation.findMany({
        orderBy: { slNo: 'asc' },
        select: {
          id: true,
          slNo: true,
          organisationName: true,
          sector: true,
          projectName: true,
          forType: true,
          website: true,
          state: true,
        },
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
      // Validate input data
      const validation = validateImplementationData(request.body);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        });
      }

      const { organisationName, sector, projectName, forType, website, state } = request.body;

      // Sanitize inputs
      const sanitizedData = {
        organisationName: sanitizeString(organisationName),
        sector: sanitizeString(sector),
        projectName: sanitizeString(projectName),
        forType: sanitizeString(forType || 'Self'),
        website: website ? sanitizeString(website) : null,
        state: sanitizeString(state),
      };

      // Get next sl_no
      const maxSlNo = await prisma.implementation.findFirst({
        orderBy: { slNo: 'desc' },
        select: { slNo: true },
      });

      const nextSlNo = (maxSlNo?.slNo || 0) + 1;

      const implementation = await prisma.implementation.create({
        data: {
          slNo: nextSlNo,
          ...sanitizedData,
        },
        select: {
          id: true,
          slNo: true,
          organisationName: true,
          sector: true,
          projectName: true,
          forType: true,
          website: true,
          state: true,
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
      
      if (isNaN(id)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid implementation ID',
        });
      }

      // Validate input data
      const validation = validateImplementationData(request.body);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        });
      }

      const { organisationName, sector, projectName, forType, website, state } = request.body;

      // Sanitize inputs
      const sanitizedData = {
        organisationName: sanitizeString(organisationName),
        sector: sanitizeString(sector),
        projectName: sanitizeString(projectName),
        forType: sanitizeString(forType),
        website: website ? sanitizeString(website) : null,
        state: sanitizeString(state),
      };

      const implementation = await prisma.implementation.update({
        where: { id },
        data: sanitizedData,
        select: {
          id: true,
          slNo: true,
          organisationName: true,
          sector: true,
          projectName: true,
          forType: true,
          website: true,
          state: true,
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
      
      if (isNaN(id)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid implementation ID',
        });
      }

      // Check if exists before deleting
      const exists = await prisma.implementation.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!exists) {
        return reply.status(404).send({
          success: false,
          error: 'Implementation not found',
        });
      }

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
