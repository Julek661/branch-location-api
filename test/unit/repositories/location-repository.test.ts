import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoLocationRepository } from '../../../src/repositories/location-repository';
import type { Location } from '../../../src/domain/types';

const leeds: Location = {
  locationId: '3f6c1f0e-8a4b-4c2d-9e1f-2b3c4d5e6f70',
  locationName: 'Leeds Branch',
  city: 'Leeds',
  state: 'West Yorkshire',
  country: 'UK',
  latitude: 53.7974185,
  longitude: -1.5437941,
  createdAt: '2026-10-11T09:00:00.000Z',
  updatedAt: '2026-10-11T09:00:00.000Z',
};

describe('createDynamoLocationRepository', () => {
  const send = jest.fn();
  const client = { send } as unknown as DynamoDBDocumentClient;
  const repository = createDynamoLocationRepository({ tableName: 'locations-test' }, client);

  beforeEach(() => {
    send.mockReset();
  });

  describe('create', () => {
    describe('given a new location', () => {
      it('puts the location into the configured table', async () => {
        send.mockResolvedValue({});

        await repository.create(leeds);

        expect(send).toHaveBeenCalledTimes(1);
        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(PutCommand);
        expect(command.input).toEqual({
          TableName: 'locations-test',
          Item: leeds,
          ConditionExpression: 'attribute_not_exists(locationId)',
        });
      });
    });

    describe('given DynamoDB rejects the write', () => {
      it('passes the error through', async () => {
        const dynamoError = new Error('ConditionalCheckFailedException');
        send.mockRejectedValue(dynamoError);

        await expect(repository.create(leeds)).rejects.toBe(dynamoError);
      });
    });
  });
});
