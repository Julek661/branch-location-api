import type { APIGatewayProxyResult } from 'aws-lambda';
import { DomainError, ValidationError } from '../domain/errors';

const statusByCode: Record<string, number> = {
  VALIDATION_ERROR: 400,
  GEOCODE_NOT_FOUND: 422,
  GEOCODER_UNAVAILABLE: 502,
};

export const toJson = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

export const toErrorResponse = (err: unknown): APIGatewayProxyResult => {
  if (err instanceof DomainError) {
    const details = err instanceof ValidationError ? err.details : undefined;
    return toJson(statusByCode[err.code] ?? 500, { error: { code: err.code, message: err.message, details } });
  }

  console.error(err);
  return toJson(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
