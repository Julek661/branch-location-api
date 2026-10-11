import { parseLocationId, parseLocationInput } from '../../../src/domain/validation';
import { ValidationError } from '../../../src/domain/errors';

const validBody = {
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
};

const getValidationError = (body: unknown): ValidationError => {
  try {
    parseLocationInput(body);
  } catch (err) {
    if (err instanceof ValidationError) return err;
    throw err;
  }
  throw new Error('Expected parseLocationInput to throw a ValidationError');
};

describe('parseLocationInput', () => {
  describe('given a valid body', () => {
    it('returns the parsed input', () => {
      expect(parseLocationInput(validBody)).toEqual(validBody);
    });
  });

  describe('given fields with surrounding whitespace', () => {
    it('trims whitespace from all fields', () => {
      const result = parseLocationInput({
        locationName: '  Leeds Branch  ',
        city: ' Leeds ',
        state: '\tWest Yorkshire\n',
        country: ' UK ',
      });

      expect(result).toEqual(validBody);
    });
  });

  describe('given a body without a state', () => {
    it('accepts the body', () => {
      const { state, ...withoutState } = validBody;

      expect(parseLocationInput(withoutState)).toEqual(withoutState);
    });
  });

  describe('given an empty state', () => {
    it('throws a ValidationError for the state field', () => {
      const error = getValidationError({ ...validBody, state: '' });

      expect(error.details).toEqual([{ field: 'state', message: 'State cannot be empty' }]);
    });
  });

  describe.each([
    ['locationName', 'Location name is required'],
    ['city', 'City is required'],
    ['country', 'Country is required'],
  ])('given a missing %s', (field, message) => {
    it('throws a ValidationError for that field', () => {
      const { [field as keyof typeof validBody]: _, ...body } = validBody;

      const error = getValidationError(body);

      expect(error.details).toEqual([{ field, message }]);
    });
  });

  describe.each([
    ['locationName', 'Location name is required'],
    ['city', 'City is required'],
    ['country', 'Country is required'],
  ])('given a whitespace-only %s', (field, message) => {
    it('throws a ValidationError for that field', () => {
      const error = getValidationError({ ...validBody, [field]: '   ' });

      expect(error.details).toEqual([{ field, message }]);
    });
  });

  describe('given a field longer than 100 characters', () => {
    it('throws a ValidationError for that field', () => {
      const error = getValidationError({ ...validBody, city: 'a'.repeat(101) });

      expect(error.details).toEqual([{ field: 'city', message: 'City name is too long' }]);
    });
  });

  describe('given an empty body', () => {
    it('reports every missing required field at once', () => {
      const error = getValidationError({});

      expect(error.details.map(d => d.field)).toEqual(['locationName', 'city', 'country']);
    });
  });

  describe('given client-supplied coordinates', () => {
    it('rejects the unrecognised field', () => {
      const error = getValidationError({ ...validBody, latitude: 54.77 });

      expect(error.details).toHaveLength(1);
      expect(error.details[0].message).toContain('latitude');
    });
  });

  describe.each([
    ['null', null],
    ['a string', 'not an object'],
    ['an array', []],
  ])('given %s as the body', (_label, body) => {
    it('throws a ValidationError for the body', () => {
      const error = getValidationError(body);

      expect(error.details).toEqual([{ field: 'body', message: expect.any(String) }]);
    });
  });
});

describe('parseLocationId', () => {
  describe('given a valid UUID', () => {
    it('returns the ID', () => {
      const id = 'cdde1a1f-0422-489c-82b3-8c572a6fb9d8';

      expect(parseLocationId(id)).toBe(id);
    });
  });

  describe.each([
    ['a non-UUID string', 'not-a-uuid'],
    ['an empty string', ''],
    ['undefined', undefined],
  ])('given %s', (_label, id) => {
    it('throws a ValidationError for locationId', () => {
      expect(() => parseLocationId(id)).toThrow(
        expect.objectContaining({
          details: [{ field: 'locationId', message: 'Location ID must be a valid UUID' }],
        }),
      );
    });
  });
});
