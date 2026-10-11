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

export class LocationNotFoundError extends DomainError {
  readonly code = 'LOCATION_NOT_FOUND';
  constructor(locationId: string) {
    super(`Location ${locationId} not found`);
    this.name = 'LocationNotFoundError';
  }
}

export class GeocodeNotFoundError extends DomainError {
  readonly code = 'GEOCODE_NOT_FOUND';
  constructor(message = 'No coordinates found for the given location') {
    super(message);
    this.name = 'GeocodeNotFoundError';
  }
}

export class GeocoderUnavailableError extends DomainError {
  readonly code = 'GEOCODER_UNAVAILABLE';
  constructor(message = 'Geocoding service is unavailable', options?: ErrorOptions) {
    super(message, options);
    this.name = 'GeocoderUnavailableError';
  }
}