import { randomUUID } from 'node:crypto';
import type { Geocoder } from '../services/geocoder';
import type { LocationRepository } from '../repositories/location-repository';
import type { Location } from './types';
import type { LocationInput } from './validation';

export type LocationService = {
  create: (input: LocationInput) => Promise<Location>;
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
});
