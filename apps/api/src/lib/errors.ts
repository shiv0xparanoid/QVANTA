export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'PAYMENT_REQUIRED'
  | 'usage_limit_exceeded'
  | 'shots_exceed_tier_limit';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details?: unknown): AppError {
    return new AppError('UNAUTHORIZED', message, 401, details);
  }

  static forbidden(message = 'Forbidden', details?: unknown): AppError {
    return new AppError('FORBIDDEN', message, 403, details);
  }

  static notFound(message = 'Not found', details?: unknown): AppError {
    return new AppError('NOT_FOUND', message, 404, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError('CONFLICT', message, 409, details);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 422, details);
  }

  static internal(message = 'Internal server error', details?: unknown): AppError {
    return new AppError('INTERNAL_ERROR', message, 500, details);
  }

  static paymentRequired(message = 'Payment required', code: ErrorCode = 'PAYMENT_REQUIRED', details?: unknown): AppError {
    return new AppError(code, message, 402, details);
  }
}
