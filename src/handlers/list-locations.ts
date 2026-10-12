import type { APIGatewayProxyResult } from 'aws-lambda';
import type { LocationService } from '../domain/location-service';
import { locationService } from '../dependencies';
import { toErrorResponse, toJson } from '../http/responses';

export const listLocationsHandler =
  (service: LocationService) =>
  async (): Promise<APIGatewayProxyResult> => {
    try {
      const items = await service.list();

      return toJson(200, { items });
    } catch (err) {
      return toErrorResponse(err);
    }
  };

export const handler = listLocationsHandler(locationService);
