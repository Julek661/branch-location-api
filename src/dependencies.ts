import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createLocationService } from './domain/location-service';
import { createDynamoLocationRepository } from './repositories/location-repository';
import { createNominatimGeocoder } from './services/geocoder';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const locationService = createLocationService({
  repository: createDynamoLocationRepository({ tableName: process.env.TABLE_NAME! }, dynamoClient),
  geocode: createNominatimGeocoder(
    {
      baseUrl: process.env.GEOCODER_BASE_URL!,
      userAgent: process.env.GEOCODER_USER_AGENT!,
      timeoutMs: 3000,
    },
    fetch,
  ),
});
