import type { APIGatewayProxyEvent } from 'aws-lambda';
import { updateLocationHandler } from '../../../src/handlers/update-location';
import { GeocodeNotFoundError, LocationNotFoundError } from '../../../src/domain/errors';

const locationId = 'cdde1a1f-0422-489c-82b3-8c572a6fb9d8';

const input = {
  locationName: 'York Branch',
  city: 'York',
  state: 'North Yorkshire',
  country: 'UK',
};

const event = (id: string | undefined, body: unknown) =>
  ({
    pathParameters: id === undefined ? null : { id },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

describe('updateLocationHandler', () => {
  const update = jest.fn();
  const handler = updateLocationHandler({ create: jest.fn(), get: jest.fn(), update, list: jest.fn() });

  beforeEach(() => update.mockReset());

  describe('given an existing location ID and a valid body', () => {
    it('returns 200 with the updated location', async () => {
      const updated = { ...input, locationId, latitude: 53.96, longitude: -1.08 };
      update.mockResolvedValue(updated);

      const response = await handler(event(locationId, input));

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(updated);
      expect(update).toHaveBeenCalledWith(locationId, input);
    });
  });

  describe.each([
    ['an ID that is not a UUID', 'not-a-uuid', input],
    ['a missing city', locationId, { ...input, city: undefined }],
    ['invalid JSON', locationId, '{ not json'],
  ])('given %s', (_label, id, body) => {
    it('returns 400 without calling the service', async () => {
      const response = await handler(event(id, body));

      expect(response.statusCode).toBe(400);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['a location ID that does not exist', new LocationNotFoundError(locationId), 404],
    ['an address that cannot be geocoded', new GeocodeNotFoundError(), 422],
  ])('given %s', (_label, error, status) => {
    it(`returns ${status}`, async () => {
      update.mockRejectedValue(error);

      const response = await handler(event(locationId, input));

      expect(response.statusCode).toBe(status);
    });
  });
});
