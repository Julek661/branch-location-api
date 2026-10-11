import type { APIGatewayProxyEvent } from 'aws-lambda';
import { getLocationHandler } from '../../../src/handlers/get-location';
import { LocationNotFoundError } from '../../../src/domain/errors';

const locationId = 'cdde1a1f-0422-489c-82b3-8c572a6fb9d8';

const event = (id?: string) =>
  ({ pathParameters: id === undefined ? null : { id } }) as unknown as APIGatewayProxyEvent;

describe('getLocationHandler', () => {
  const get = jest.fn();
  const handler = getLocationHandler({ create: jest.fn(), get });

  beforeEach(() => get.mockReset());
  describe('given an existing location ID', () => {
    it('returns 200 with the location', async () => {
      const location = { locationId, locationName: 'Leeds Branch', city: 'Leeds', country: 'UK' };
      get.mockResolvedValue(location);

      const response = await handler(event(locationId));

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(location);
      expect(get).toHaveBeenCalledWith(locationId);
    });
  });

  describe.each([
    ['an ID that is not a UUID', 'not-a-uuid'],
    ['no ID', undefined],
  ])('given %s', (_label, id) => {
    it('returns 400 without calling the service', async () => {
      const response = await handler(event(id));

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error.code).toBe('VALIDATION_ERROR');
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('given a location ID that does not exist', () => {
    it('returns 404', async () => {
      get.mockRejectedValue(new LocationNotFoundError(locationId));

      const response = await handler(event(locationId));

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error.code).toBe('LOCATION_NOT_FOUND');
    });
  });
});
