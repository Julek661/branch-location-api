import { listLocationsHandler } from '../../../src/handlers/list-locations';

describe('listLocationsHandler', () => {
  const list = jest.fn();
  const handler = listLocationsHandler({ create: jest.fn(), get: jest.fn(), update: jest.fn(), list });

  beforeEach(() => list.mockReset());

  describe('given stored locations', () => {
    it('returns 200 with the locations under items', async () => {
      const locations = [
        { locationId: '1', locationName: 'Leeds Branch', city: 'Leeds', country: 'UK' },
        { locationId: '2', locationName: 'York Branch', city: 'York', country: 'UK' },
      ];
      list.mockResolvedValue(locations);

      const response = await handler();

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ items: locations });
    });
  });

  describe('given no locations', () => {
    it('returns 200 with an empty list', async () => {
      list.mockResolvedValue([]);

      const response = await handler();

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ items: [] });
    });
  });

  describe('given an unexpected error', () => {
    it('returns 500', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      list.mockRejectedValue(new Error('DynamoDB unavailable'));

      const response = await handler();

      expect(response.statusCode).toBe(500);
    });
  });
});
