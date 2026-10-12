import { toErrorResponse } from '../../../src/http/responses';
import {
  GeocodeNotFoundError,
  GeocoderUnavailableError,
  LocationNotFoundError,
  ValidationError,
} from '../../../src/domain/errors';

describe('toErrorResponse', () => {
  describe.each([
    ['a ValidationError', new ValidationError([{ field: 'city', message: 'City is required' }]), 400],
    ['a LocationNotFoundError', new LocationNotFoundError('123'), 404],
    ['a GeocodeNotFoundError', new GeocodeNotFoundError(), 422],
    ['a GeocoderUnavailableError', new GeocoderUnavailableError(), 502],
  ])('given %s', (_label, error, status) => {
    it(`returns ${status} with the error code`, () => {
      const response = toErrorResponse(error);

      expect(response.statusCode).toBe(status);
      expect(JSON.parse(response.body).error.code).toBe(error.code);
    });
  });

  describe('given a LocationNotFoundError', () => {
    it('includes the location ID in the message', () => {
      const response = toErrorResponse(new LocationNotFoundError('123'));

      expect(JSON.parse(response.body).error.message).toBe('Location 123 not found');
    });
  });

  describe('given an unexpected error', () => {
    it('returns 500 without leaking the error message', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = toErrorResponse(new Error('secret internal detail'));

      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain('secret internal detail');
    });
  });
});
