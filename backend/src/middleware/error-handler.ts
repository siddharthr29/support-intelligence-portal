import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error with context
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      query: request.query,
    },
  }, 'Request error');

  // Don't expose internal errors to client
  const statusCode = (error as any).statusCode || 500;
  const message = statusCode === 500 
    ? 'Internal server error' 
    : error.message;

  return reply.status(statusCode).send({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
}
