import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Location } from '../domain/types';

export type LocationRepository = {
  create: (location: Location) => Promise<void>;
};

export interface DynamoLocationRepositoryConfig {
  tableName: string;
}

export const createDynamoLocationRepository = (
  { tableName }: DynamoLocationRepositoryConfig,
  client: DynamoDBDocumentClient,
): LocationRepository => ({
  create: async (location) => {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: location,
        ConditionExpression: 'attribute_not_exists(locationId)',
      }),
    );
  },
});
