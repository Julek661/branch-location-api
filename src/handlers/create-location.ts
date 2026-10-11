import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { LocationService } from '../domain/location-service';
import { parseLocationInput } from '../domain/validation';
import { locationService } from '../dependencies';
import { toErrorResponse, toJson } from '../http/responses';

export const createLocationHandler = (service: LocationService) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '');
    } catch {
      return toJson(400, { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } });
    }

    try {
      const location = await service.create(parseLocationInput(body));
      return toJson(201, location, { Location: `/locations/${location.locationId}` });
    } catch (err) {
      return toErrorResponse(err);
    }
  };

export const handler = createLocationHandler(locationService);
