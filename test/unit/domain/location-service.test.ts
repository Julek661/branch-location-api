import { createLocationService } from '../../../src/domain/location-service';
import { GeocodeNotFoundError, LocationNotFoundError } from '../../../src/domain/errors';

const input = {
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
};

describe('createLocationService', () => {
  const repository = { create: jest.fn(), get: jest.fn(), update: jest.fn(), list: jest.fn() };
  const geocode = jest.fn();
  const service = createLocationService({ repository, geocode });

  beforeEach(() => {
    repository.create.mockReset();
    repository.get.mockReset();
    repository.update.mockReset();
    repository.list.mockReset();
    geocode.mockReset();
  });

  describe('create', () => {
    describe('given a valid location', () => {
      it('saves and returns the location with its coordinates', async () => {
        geocode.mockResolvedValue({ latitude: 53.79, longitude: -1.54 });

        const location = await service.create(input);

        expect(location).toEqual({
          ...input,
          locationId: expect.any(String),
          latitude: 53.79,
          longitude: -1.54,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
        expect(repository.create).toHaveBeenCalledWith(location);
      });
    });

    describe('given the geocoder fails', () => {
      it('throws and does not save anything', async () => {
        geocode.mockRejectedValue(new GeocodeNotFoundError());

        await expect(service.create(input)).rejects.toBeInstanceOf(GeocodeNotFoundError);
        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('get', () => {
    const locationId = 'cdde1a1f-0422-489c-82b3-8c572a6fb9d8';

    describe('given the location exists', () => {
      it('returns it', async () => {
        const stored = { ...input, locationId, latitude: 53.79, longitude: -1.54 };
        repository.get.mockResolvedValue(stored);

        await expect(service.get(locationId)).resolves.toEqual(stored);
        expect(repository.get).toHaveBeenCalledWith(locationId);
      });
    });

    describe('given the location does not exist', () => {
      it('throws a LocationNotFoundError', async () => {
        repository.get.mockResolvedValue(null);

        await expect(service.get(locationId)).rejects.toBeInstanceOf(LocationNotFoundError);
      });
    });
  });

  describe('update', () => {
    const locationId = 'cdde1a1f-0422-489c-82b3-8c572a6fb9d8';
    const existing = {
      ...input,
      locationId,
      latitude: 53.79,
      longitude: -1.54,
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    };
    const changes = { locationName: 'York Branch', city: 'York', country: 'UK' };

    describe('given the location exists', () => {
      it('saves the new details with fresh coordinates and keeps createdAt', async () => {
        repository.get.mockResolvedValue(existing);
        geocode.mockResolvedValue({ latitude: 53.96, longitude: -1.08 });

        const location = await service.update(locationId, changes);

        expect(location).toEqual({
          ...changes,
          locationId,
          latitude: 53.96,
          longitude: -1.08,
          createdAt: existing.createdAt,
          updatedAt: expect.any(String),
        });
        expect(location.updatedAt).not.toBe(existing.updatedAt);
        expect(geocode).toHaveBeenCalledWith(changes);
        expect(repository.update).toHaveBeenCalledWith(location);
      });
    });

    describe('given the location does not exist', () => {
      it('throws a LocationNotFoundError without geocoding or saving', async () => {
        repository.get.mockResolvedValue(null);

        await expect(service.update(locationId, changes)).rejects.toBeInstanceOf(LocationNotFoundError);
        expect(geocode).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
      });
    });

    describe('given the geocoder fails', () => {
      it('throws and does not save anything', async () => {
        repository.get.mockResolvedValue(existing);
        geocode.mockRejectedValue(new GeocodeNotFoundError());

        await expect(service.update(locationId, changes)).rejects.toBeInstanceOf(GeocodeNotFoundError);
        expect(repository.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('list', () => {
    describe('given stored locations', () => {
      it('returns them all', async () => {
        const stored = [{ ...input, locationId: '1' }, { ...input, locationId: '2', city: 'York' }];
        repository.list.mockResolvedValue(stored);

        await expect(service.list()).resolves.toEqual(stored);
      });
    });

    describe('given no locations', () => {
      it('returns an empty list', async () => {
        repository.list.mockResolvedValue([]);

        await expect(service.list()).resolves.toEqual([]);
      });
    });
  });
});
