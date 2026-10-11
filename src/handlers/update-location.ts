import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { LocationService } from '../domain/location-service';
import { parseLocationId, parseLocationInput } from '../domain/validation';
import { locationService } from '../dependencies';
import { toErrorResponse, toJson } from '../http/responses';

export const updateLocationHandler =
  (service: LocationService) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '');
    } catch {
      return toJson(400, { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } });
    }

    try {
      const location = await service.update(parseLocationId(event.pathParameters?.id), parseLocationInput(body));

      return toJson(200, location);
    } catch (err) {
      return toErrorResponse(err);
    }
  };

export const handler = updateLocationHandler(locationService);
