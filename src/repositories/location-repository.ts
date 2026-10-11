import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Location } from '../domain/types';

export type LocationRepository = {
  create: (location: Location) => Promise<void>;
  get: (locationId: string) => Promise<Location | null>;
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

  get: async (locationId) => {
    const { Item } = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { locationId },
      }),
    );

    return (Item as Location | undefined) ?? null;
  },
});
