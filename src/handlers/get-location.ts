import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { LocationService } from '../domain/location-service';
import { parseLocationId } from '../domain/validation';
import { locationService } from '../dependencies';
import { toErrorResponse, toJson } from '../http/responses';

export const getLocationHandler =
  (service: LocationService) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const location = await service.get(parseLocationId(event.pathParameters?.id));

      return toJson(200, location);
    } catch (err) {
      return toErrorResponse(err);
    }
  };

export const handler = getLocationHandler(locationService);
