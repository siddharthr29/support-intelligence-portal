export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class FreshdeskApiError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 502, true, context);
    this.name = 'FreshdeskApiError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, true, context);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, true, context);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, false, context);
    this.name = 'ConfigurationError';
  }
}

export class JobExecutionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, true, context);
    this.name = 'JobExecutionError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
