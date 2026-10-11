import { buildSearchParams, createNominatimGeocoder, parseCoordinates } from '../../../src/services/geocoder';
import { GeocodeNotFoundError, GeocoderUnavailableError } from '../../../src/domain/errors';

const leeds = {
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildSearchParams', () => {
  it('includes city, state and country with format=json and limit=1', () => {
    const params = buildSearchParams(leeds);

    expect(params.get('city')).toBe('Leeds');
    expect(params.get('state')).toBe('West Yorkshire');
    expect(params.get('country')).toBe('UK');
    expect(params.get('format')).toBe('json');
    expect(params.get('limit')).toBe('1');
  });

  describe('given a location without a state', () => {
    it('omits the state parameter', () => {
      const { state, ...withoutState } = leeds;

      expect(buildSearchParams(withoutState).has('state')).toBe(false);
    });
  });
});

describe('parseCoordinates', () => {
  describe('given a match', () => {
    it('returns the first result as numbers', () => {
      expect(
        parseCoordinates([
          { lat: '53.7974185', lon: '-1.5437941' },
          { lat: '0', lon: '0' },
        ]),
      ).toEqual({ latitude: 53.7974185, longitude: -1.5437941 });
    });
  });

  describe('given no results', () => {
    it('throws a GeocodeNotFoundError', () => {
      expect(() => parseCoordinates([])).toThrow(GeocodeNotFoundError);
    });
  });

  describe.each([
    ['a non-numeric latitude', [{ lat: 'abc', lon: '-1.54' }]],
    ['a missing longitude', [{ lat: '53.79' }]],
    ['a null result', [null]],
    ['an object instead of an array', { lat: '1', lon: '2' }],
  ])('given %s', (_label, body) => {
    it('throws a GeocoderUnavailableError', () => {
      expect(() => parseCoordinates(body)).toThrow(GeocoderUnavailableError);
    });
  });
});

describe('createNominatimGeocoder', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const geocode = createNominatimGeocoder(
    {
      baseUrl: 'https://nominatim.example.test/search',
      userAgent: 'test-agent/1.0',
      timeoutMs: 3000,
    },
    fetchMock,
  );

  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('given Nominatim returns a match', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(jsonResponse([{ lat: '53.7974185', lon: '-1.5437941' }]));
    });

    it('returns the coordinates', async () => {
      await expect(geocode(leeds)).resolves.toEqual({
        latitude: 53.7974185,
        longitude: -1.5437941,
      });
    });

    it('requests the configured base URL with the search params', async () => {
      await geocode(leeds);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(`${url.origin}${url.pathname}`).toBe('https://nominatim.example.test/search');
      expect(url.searchParams.toString()).toBe(buildSearchParams(leeds).toString());
    });

    it('sends the configured User-Agent and a timeout signal', async () => {
      await geocode(leeds);

      const init = fetchMock.mock.calls[0][1]!;
      expect(init.headers).toMatchObject({ 'User-Agent': 'test-agent/1.0' });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('given Nominatim responds with an error status', () => {
    it('throws a GeocoderUnavailableError', async () => {
      fetchMock.mockResolvedValue(new Response('error', { status: 503 }));

      await expect(geocode(leeds)).rejects.toBeInstanceOf(GeocoderUnavailableError);
    });
  });

  describe('given a network failure', () => {
    it('throws a GeocoderUnavailableError with the original error as the cause', async () => {
      const networkError = new TypeError('fetch failed');
      fetchMock.mockRejectedValue(networkError);

      const error = await geocode(leeds).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(GeocoderUnavailableError);
      expect((error as GeocoderUnavailableError).cause).toBe(networkError);
    });
  });

  describe('given Nominatim returns invalid JSON', () => {
    it('throws a GeocoderUnavailableError', async () => {
      fetchMock.mockResolvedValue(new Response('<html>not json</html>', { status: 200 }));

      await expect(geocode(leeds)).rejects.toBeInstanceOf(GeocoderUnavailableError);
    });
  });
});
