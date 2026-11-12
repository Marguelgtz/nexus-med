// Consistent API error handling.
//
// Domain code throws ApiError subclasses (or their specialized forms); the
// app-level onError handler converts them to the shared error envelope
// (see @nexus-med/contracts). Unexpected errors never leak internals or
// clinical content to the client.

import type { Context } from 'hono';
import type { ErrorEnvelopeCode } from '@nexus-med/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorEnvelopeCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Datos inválidos', fieldErrors?: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', message, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class UnauthenticatedError extends ApiError {
  constructor() {
    super(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar.');
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitedError extends ApiError {
  constructor() {
    super(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Intenta de nuevo más tarde.');
    this.name = 'RateLimitedError';
  }
}

export function onErrorHandler(error: Error, c: Context): Response {
  if (error instanceof ApiError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
      error.status as 400 | 401 | 403 | 404 | 409 | 429 | 500,
    );
  }

  // Log enough to debug, never request bodies (clinical content).
  console.error(`[api] unhandled error ${c.req.method} ${c.req.path}`, error);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Error inesperado del servidor' } },
    500,
  );
}

export function onNotFound(c: Context): Response {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `No existe la ruta ${c.req.method} ${c.req.path}`,
      },
    },
    404,
  );
}
