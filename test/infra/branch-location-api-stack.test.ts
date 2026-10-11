import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BranchLocationApiStack } from '../../lib/branch-location-api-stack';

describe('BranchLocationApiStack', () => {
  const template = Template.fromStack(new BranchLocationApiStack(new cdk.App(), 'TestStack'));

  describe('given the locations table', () => {
    it('uses locationId as the partition key with point-in-time recovery', () => {
      template.resourceCountIs('AWS::DynamoDB::GlobalTable', 1);
      template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
        KeySchema: [{ AttributeName: 'locationId', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
        Replicas: [Match.objectLike({ PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true } })],
      });
    });
  });

  describe('given the create location function', () => {
    it('runs on Node 22 with the table name and geocoder settings', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
        Architectures: ['arm64'],
        Environment: {
          Variables: Match.objectLike({
            TABLE_NAME: Match.anyValue(),
            GEOCODER_BASE_URL: 'https://nominatim.openstreetmap.org/search',
            GEOCODER_USER_AGENT: Match.anyValue(),
          }),
        },
      });
    });

    it('can write to the table but not read from it', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['dynamodb:PutItem']),
              Effect: 'Allow',
            }),
          ]),
        },
      });

      const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(policies).not.toContain('dynamodb:GetItem');
      expect(policies).not.toContain('dynamodb:Scan');
    });
  });

  describe('given the API', () => {
    it('exposes POST /locations protected by an API key', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', { PathPart: 'locations' });
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        ApiKeyRequired: true,
      });
    });

    it('has a usage plan with throttling linked to the API key', () => {
      template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
        Throttle: { RateLimit: 10, BurstLimit: 20 },
      });
      template.resourceCountIs('AWS::ApiGateway::UsagePlanKey', 1);
    });
  });
});
