import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config, validateSecrets } from './config';
import { logger, isAppError, toErrorMessage } from './utils';
import {
  startWeeklyScheduler,
  stopWeeklyScheduler,
  isSchedulerRunning,
  isIngestionJobRunning,
  startMonthlyReportScheduler,
} from './jobs';
import { startYearlyCleanupScheduler, stopYearlyCleanupScheduler } from './jobs/yearly-cleanup';
import { startDailyRftRefresh, stopDailyRftRefresh } from './jobs/daily-rft-refresh';
import { startUrgentTicketMonitor, stopUrgentTicketMonitor } from './jobs/urgent-ticket-monitor';
import { connectPrisma, disconnectPrisma } from './persistence';
import { registerRoutes } from './routes';
import { logError } from './services/error-log-service';
import { initializeFirebaseAdmin } from './config/firebase-admin';

const fastify = Fastify({
  logger: true,
  // Performance: Increase connection timeout
  connectionTimeout: 30000,
  // Performance: Keep-alive for connection reuse
  keepAliveTimeout: 72000,
  // Security: Limit body size to prevent DoS
  bodyLimit: 1048576, // 1MB
  // Performance: Disable request ID generation if not needed
  disableRequestLogging: process.env.NODE_ENV === 'production',
});

async function bootstrap(): Promise<void> {
  try {
    const secretsResult = validateSecrets();
    if (!secretsResult.valid) {
      logger.error({ errors: secretsResult.errors }, 'Configuration validation failed');
      process.exit(1);
    }

    await connectPrisma();
    logger.info('Database connected');

    // Initialize Firebase Admin SDK for authentication
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        initializeFirebaseAdmin();
        logger.info('Firebase Admin SDK initialized for authentication');
      } catch (error) {
        logger.warn({ error }, 'Firebase Admin initialization failed - authentication disabled');
      }
    } else {
      logger.warn('Firebase credentials not configured - authentication disabled in development');
    }

    // CORS configuration - MUST BE REGISTERED FIRST before helmet
    const getAllowedOrigins = (): string[] | boolean => {
      if (process.env.NODE_ENV !== 'production') {
        return true; // Allow all in development
      }
      
      const origins: string[] = [];
      
      // Primary frontend URL
      if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
      }
      
      // Additional allowed origins (comma-separated)
      if (process.env.ALLOWED_ORIGINS) {
        origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
      }
      
      // Default Vercel preview URLs pattern
      if (process.env.VERCEL_URL) {
        origins.push(`https://${process.env.VERCEL_URL}`);
      }
      
      return origins.length > 0 ? origins : ['http://localhost:3001'];
    };

    await fastify.register(cors, {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Content-Length', 'Content-Type'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // PERFORMANCE: Enable compression for all responses
    await fastify.register(compress, {
      global: true,
      encodings: ['gzip', 'deflate'],
      threshold: 1024, // Only compress responses > 1KB
    });

    // SECURITY: Helmet for security headers (disabled CSP for API server)
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // API server doesn't need CSP
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false, // Disable to allow CORS
    });

    // SECURITY: Global rate limiting
    await fastify.register(rateLimit, {
      max: 100, // 100 requests per minute
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        success: false,
        error: 'Too many requests. Please slow down.',
        statusCode: 429,
      }),
    });

    // SECURITY: Add security headers to all responses
    fastify.addHook('onSend', async (_request, reply, payload) => {
      // Prevent clickjacking
      reply.header('X-Frame-Options', 'DENY');
      // Prevent MIME type sniffing
      reply.header('X-Content-Type-Options', 'nosniff');
      // Enable XSS filter
      reply.header('X-XSS-Protection', '1; mode=block');
      // Strict transport security (HTTPS only in production)
      if (process.env.NODE_ENV === 'production') {
        reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      // Prevent caching of sensitive data
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      
      return payload;
    });

    // SECURITY: Firebase Authentication middleware will be applied per-route
    // NOT globally to allow public endpoints like /health and /

    // SECURITY: Input sanitization hook
    fastify.addHook('preHandler', async (request) => {
      // Sanitize query parameters
      if (request.query && typeof request.query === 'object') {
        for (const key of Object.keys(request.query as Record<string, unknown>)) {
          const value = (request.query as Record<string, unknown>)[key];
          if (typeof value === 'string') {
            // Remove potential XSS vectors
            (request.query as Record<string, unknown>)[key] = value
              .replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '');
          }
        }
      }
    });

    fastify.setErrorHandler(async (error, request, reply) => {
      // Log error to database for monitoring
      const errorSource = request.url || 'unknown';
      const errorMessage = isAppError(error) ? error.message : toErrorMessage(error);
      const statusCode = isAppError(error) ? error.statusCode : 500;
      
      // Store error in database (async, don't await)
      logError(errorMessage, errorSource, statusCode, {
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      }).catch((e: unknown) => logger.error(e, 'Failed to log error'));

      if (isAppError(error)) {
        logger.error({
          error: error.message,
          statusCode: error.statusCode,
          context: error.context,
        }, 'Application error');

        return reply.status(error.statusCode).send({
          error: error.name,
          message: error.message,
          statusCode: error.statusCode,
        });
      }

      logger.error({ error: toErrorMessage(error) }, 'Unhandled error');

      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
    });

    // Root endpoint - completely public for Render health checks
    fastify.get('/', async () => {
      return {
        status: 'ok',
        service: 'Freshdesk Weekly Support Intelligence Platform',
        version: '1.0.0',
      };
    });

    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        system: 'Freshdesk Weekly Support Intelligence Platform',
        mode: 'READ-ONLY',
        scheduler: {
          running: isSchedulerRunning(),
          jobInProgress: isIngestionJobRunning(),
        },
      };
    });

    await registerRoutes(fastify);
    logger.info('API routes registered');

    startWeeklyScheduler();
    startYearlyCleanupScheduler();
    startMonthlyReportScheduler();

    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server listening at ${address}`);
    logger.info('System Mode: READ-ONLY Analytics Platform');
    logger.info({
      schedulerTimezone: config.scheduler.timezone,
      schedulerDay: 'Friday',
      schedulerTime: '16:30',
    }, 'Weekly scheduler configured');

  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down...');

  stopWeeklyScheduler();
  stopYearlyCleanupScheduler();
  stopDailyRftRefresh();
  stopUrgentTicketMonitor();
  await fastify.close();
  await disconnectPrisma();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();
