import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoLocationRepository } from '../../../src/repositories/location-repository';
import type { Location } from '../../../src/domain/types';

const input: Location = {
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

        await repository.create(input);

        expect(send).toHaveBeenCalledTimes(1);
        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(PutCommand);
        expect(command.input).toEqual({
          TableName: 'locations-test',
          Item: input,
          ConditionExpression: 'attribute_not_exists(locationId)',
        });
      });
    });

    describe('given DynamoDB rejects the write', () => {
      it('passes the error through', async () => {
        const dynamoError = new Error('ConditionalCheckFailedException');
        send.mockRejectedValue(dynamoError);

        await expect(repository.create(input)).rejects.toBe(dynamoError);
      });
    });
  });

  describe('get', () => {
    describe('given the location exists', () => {
      it('gets it from the configured table by locationId', async () => {
        send.mockResolvedValue({ Item: input });

        const location = await repository.get(input.locationId);

        expect(location).toEqual(input);
        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(GetCommand);
        expect(command.input).toEqual({
          TableName: 'locations-test',
          Key: { locationId: input.locationId },
        });
      });
    });

    describe('given the location does not exist', () => {
      it('returns null', async () => {
        send.mockResolvedValue({});

        await expect(repository.get(input.locationId)).resolves.toBeNull();
      });
    });
  });

  describe('update', () => {
    describe('given an existing location', () => {
      it('puts the location only if it already exists', async () => {
        send.mockResolvedValue({});

        await repository.update(input);

        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(PutCommand);
        expect(command.input).toEqual({
          TableName: 'locations-test',
          Item: input,
          ConditionExpression: 'attribute_exists(locationId)',
        });
      });
    });
  });

  describe('list', () => {
    const york: Location = { ...input, locationId: '7b2e9c40-1d2e-4f3a-8b4c-5d6e7f8a9b0c', city: 'York' };

    describe('given the table fits in one page', () => {
      it('scans the configured table and returns every location', async () => {
        send.mockResolvedValue({ Items: [input, york] });

        const locations = await repository.list();

        expect(locations).toEqual([input, york]);
        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(ScanCommand);
        expect(command.input).toEqual({ TableName: 'locations-test', ExclusiveStartKey: undefined });
      });
    });

    describe('given the results span multiple pages', () => {
      it('keeps scanning from the last key until every page is read', async () => {
        send
          .mockResolvedValueOnce({ Items: [input], LastEvaluatedKey: { locationId: input.locationId } })
          .mockResolvedValueOnce({ Items: [york] });

        const locations = await repository.list();

        expect(locations).toEqual([input, york]);
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ locationId: input.locationId });
      });
    });

    describe('given the table is empty', () => {
      it('returns an empty list', async () => {
        send.mockResolvedValue({});

        await expect(repository.list()).resolves.toEqual([]);
      });
    });
  });
});
