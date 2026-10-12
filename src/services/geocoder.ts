import { GeocodeNotFoundError, GeocoderUnavailableError } from '../domain/errors';
import type { Coordinates } from '../domain/types';
import type { LocationInput } from '../domain/validation';

export type Geocoder = (input: LocationInput) => Promise<Coordinates>;

export interface NominatimGeocoderConfig {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
}

export const buildSearchParams = (input: LocationInput): URLSearchParams =>
  new URLSearchParams({
    city: input.city,
    country: input.country,
    ...(input.state ? { state: input.state } : {}),
    format: 'json',
    limit: '1',
  });

export const parseCoordinates = (results: unknown): Coordinates => {
  if (!Array.isArray(results)) {
    throw new GeocoderUnavailableError('Geocoding service returned an unexpected response');
  }
  if (!results.length) {
    throw new GeocodeNotFoundError();
  }

  const latitude = Number(results[0]?.lat);
  const longitude = Number(results[0]?.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new GeocoderUnavailableError('Geocoding service returned invalid coordinates');
  }

  return { latitude, longitude };
};

export const createNominatimGeocoder =
  ({ baseUrl, userAgent, timeoutMs }: NominatimGeocoderConfig, fetchFn: typeof fetch): Geocoder =>
  async (input) => {
    let response: Response;

    try {
      response = await fetchFn(`${baseUrl}?${buildSearchParams(input)}`, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new GeocoderUnavailableError('Geocoding request failed', { cause: err });
    }

    if (!response.ok) {
      throw new GeocoderUnavailableError(`Geocoding service responded with status ${response.status}`);
    }

    const results = await response.json().catch((err: unknown) => {
      throw new GeocoderUnavailableError('Geocoding service returned invalid JSON', { cause: err });
    });

    return parseCoordinates(results);
  };
