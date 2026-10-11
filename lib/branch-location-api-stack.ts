import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class BranchLocationApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.TableV2(this, 'LocationsTable', {
      partitionKey: { name: 'locationId', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const createLocationFn = this.createFunction('CreateLocationFunction', 'create-location.ts', table);

    table.grant(createLocationFn, 'dynamodb:PutItem');

    const getLocationFn = this.createFunction('GetLocationFunction', 'get-location.ts', table);
    table.grant(getLocationFn, 'dynamodb:GetItem');

    const listLocationsFn = this.createFunction('ListLocationsFunction', 'list-locations.ts', table);
    table.grant(listLocationsFn, 'dynamodb:Scan');

    const updateLocationFn = this.createFunction('UpdateLocationFunction', 'update-location.ts', table);
    table.grant(updateLocationFn, 'dynamodb:GetItem', 'dynamodb:PutItem');

    const accessLogs = new logs.LogGroup(this, 'BranchLocAccessLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const api = new apigateway.RestApi(this, 'BranchLocationApi', {
      restApiName: 'branch-location-api',
      description: 'Store and query branch locations',
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      deployOptions: {
        stageName: 'v1',
        tracingEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    const locations = api.root.addResource('locations');
    locations.addMethod('POST', new apigateway.LambdaIntegration(createLocationFn), {
      apiKeyRequired: true,
    });
    locations.addMethod('GET', new apigateway.LambdaIntegration(listLocationsFn), {
      apiKeyRequired: true,
    });

    const location = locations.addResource('{id}');
    location.addMethod('GET', new apigateway.LambdaIntegration(getLocationFn), {
      apiKeyRequired: true,
    });
    location.addMethod('PUT', new apigateway.LambdaIntegration(updateLocationFn), {
      apiKeyRequired: true,
    });

    const apiKey = api.addApiKey('ApiKey');
    const usagePlan = api.addUsagePlan('UsagePlan', {
      throttle: { rateLimit: 10, burstLimit: 20 },
      quota: { limit: 10_000, period: apigateway.Period.DAY },
    });
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'ApiKeyId', { value: apiKey.keyId });
  }

  private createFunction(id: string, handlerFile: string, table: dynamodb.ITableV2): NodejsFunction {
    return new NodejsFunction(this, id, {
      entry: path.join(__dirname, '../src/handlers', handlerFile),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
      logGroup: new logs.LogGroup(this, `${id}Logs`, {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        TABLE_NAME: table.tableName,
        GEOCODER_BASE_URL: 'https://nominatim.openstreetmap.org/search',
        GEOCODER_USER_AGENT: 'branch-location-api/1.0',
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });
  }
}
