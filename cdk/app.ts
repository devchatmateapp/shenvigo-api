#!/usr/bin/env node
/**
 * shenvigo-api CDK app.
 *
 * Cross-stack values (table name, VPC, subnets, BFF role ARN) are read
 * from CDK context (`-c key=value`) or environment variables so that
 * `cdk synth` works without AWS credentials. In production these values
 * originate from SSM Parameter Store (`/shenvigo/*`), published by the
 * shenvigo-data / shenvigo-infra / shenvigo-bff-web stacks — pass them
 * through at deploy time, e.g.:
 *
 *   npx cdk deploy \
 *     -c tableName=$(aws ssm get-parameter --name /shenvigo/data/table-name --query Parameter.Value --output text) \
 *     -c vpcId=... -c privateSubnetIds=subnet-a,subnet-b -c bffRoleArn=...
 */
import * as cdk from 'aws-cdk-lib';
import { ShenvigoApiStack } from './api-stack';

const app = new cdk.App();

new ShenvigoApiStack(app, 'ShenvigoApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
