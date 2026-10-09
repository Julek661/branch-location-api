export type FieldError = { field: string; message: string };

export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  constructor(public readonly details: FieldError[]) {
    super('Request validation failed');
    this.name = 'ValidationError';
  }
}