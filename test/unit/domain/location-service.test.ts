import { createLocationService } from '../../../src/domain/location-service';
import { GeocodeNotFoundError } from '../../../src/domain/errors';

const input = {
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
};

describe('createLocationService', () => {
  const repository = { create: jest.fn(), get: jest.fn() };
  const geocode = jest.fn();
  const service = createLocationService({ repository, geocode });

  beforeEach(() => {
    repository.create.mockReset();
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
});
