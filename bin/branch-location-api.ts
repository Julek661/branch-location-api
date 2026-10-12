#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { BranchLocationApiStack } from '../lib/branch-location-api-stack';

const app = new cdk.App();
new BranchLocationApiStack(app, 'BranchLocationApiStack', {
});
