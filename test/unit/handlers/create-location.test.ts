import type { APIGatewayProxyEvent } from 'aws-lambda';
import { createLocationHandler } from '../../../src/handlers/create-location';
import { GeocodeNotFoundError, GeocoderUnavailableError } from '../../../src/domain/errors';

const input = {
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
};

const event = (body: unknown) =>
  ({ body: typeof body === 'string' ? body : JSON.stringify(body) }) as APIGatewayProxyEvent;

describe('createLocationHandler', () => {
  const create = jest.fn();
  const handler = createLocationHandler({ create, get: jest.fn(), update: jest.fn(), list: jest.fn() });

  beforeEach(() => create.mockReset());

  describe('given a valid body', () => {
    it('returns 201 with the created location', async () => {
      const created = { ...input, locationId: '123', latitude: 53.79, longitude: -1.54 };
      create.mockResolvedValue(created);

      const response = await handler(event(input));

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual(created);
    });

    it('returns a Location header pointing to the new location', async () => {
      create.mockResolvedValue({ ...input, locationId: '123', latitude: 53.79, longitude: -1.54 });

      const response = await handler(event(input));

      expect(response.headers?.Location).toBe('/locations/123');
    });
  });

  describe('given invalid JSON', () => {
    it('returns 400', async () => {
      const response = await handler(event('{ not json'));

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('given a missing city', () => {
    it('returns 400 with the field error', async () => {
      const { city, ...withoutCity } = input;

      const response = await handler(event(withoutCity));

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error.details).toEqual([{ field: 'city', message: 'City is required' }]);
    });
  });

  describe.each([
    ['the location cannot be geocoded', new GeocodeNotFoundError(), 422],
    ['the geocoder is unavailable', new GeocoderUnavailableError(), 502],
    ['an unexpected error happens', new Error('boom'), 500],
  ])('given %s', (_label, error, status) => {
    it(`returns ${status}`, async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      create.mockRejectedValue(error);

      const response = await handler(event(input));

      expect(response.statusCode).toBe(status);
    });
  });
});
