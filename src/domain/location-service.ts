import { randomUUID } from 'node:crypto';
import { LocationNotFoundError } from './errors';
import type { Geocoder } from '../services/geocoder';
import type { LocationRepository } from '../repositories/location-repository';
import type { Location } from './types';
import type { LocationInput } from './validation';

export type LocationService = {
  create: (input: LocationInput) => Promise<Location>;
  get: (locationId: string) => Promise<Location>;
  update: (locationId: string, input: LocationInput) => Promise<Location>;
  list: () => Promise<Location[]>;
};

export const createLocationService = (deps: {
  repository: LocationRepository;
  geocode: Geocoder;
}): LocationService => ({
  create: async (input) => {
    const coordinates = await deps.geocode(input);
    const now = new Date().toISOString();

    const location: Location = {
      locationId: randomUUID(),
      ...input,
      ...coordinates,
      createdAt: now,
      updatedAt: now,
    };

    await deps.repository.create(location);
    return location;
  },

  get: async (locationId) => {
    const location = await deps.repository.get(locationId);

    if (!location) {
      throw new LocationNotFoundError(locationId);
    }

    return location;
  },

  update: async (locationId, input) => {
    const existing = await deps.repository.get(locationId);

    if (!existing) {
      throw new LocationNotFoundError(locationId);
    }

    const coordinates = await deps.geocode(input);

    const location: Location = {
      locationId,
      ...input,
      ...coordinates,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await deps.repository.update(location);
    return location;
  },

  list: () => deps.repository.list(),
});
