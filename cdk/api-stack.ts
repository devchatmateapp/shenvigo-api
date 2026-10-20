/**
 * shenvigo-api CDK stack.
 *
 * Provisions the API Lambda ONLY — there is deliberately NO API Gateway
 * and no other public ingress. The only caller is the shenvigo-bff-web
 * Lambda, which invokes this function directly via the AWS SDK
 * (LambdaClient / InvokeCommand). This is the strictest interpretation
 * of the constitution's "browser → BFF → API → DB" layering: the API is
 * not reachable from the public internet at all.
 */
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'node:path';

/**
 * Resolve a cross-stack value. Prefers CDK context, then env var, else
 * throws with a pointer to the SSM parameter that is the source of truth
 * in production. This keeps `cdk synth` working without AWS credentials.
 */
function configValue(scope: Construct, id: string, envVar: string, ssmPath: string): string {
  const fromContext = scope.node.tryGetContext(id) as string | undefined;
  const value = fromContext ?? process.env[envVar];
  if (!value) {
    throw new Error(
      `Missing required config "${id}". Provide via CDK context (-c ${id}=...) or env var ${envVar}. ` +
        `In production this value is published to SSM Parameter Store at ${ssmPath}.`,
    );
  }
  return value;
}

export class ShenvigoApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Published by shenvigo-data (T008).
    const tableName = configValue(this, 'tableName', 'TABLE_NAME', '/shenvigo/data/table-name');
    const tableArn = configValue(this, 'tableArn', 'TABLE_ARN', '/shenvigo/data/table-arn');
    // Published by shenvigo-infra network stack (T007).
    const vpcId = configValue(this, 'vpcId', 'VPC_ID', '/shenvigo/network/vpc-id');
    const privateSubnetIds = configValue(
      this,
      'privateSubnetIds',
      'PRIVATE_SUBNET_IDS',
      '/shenvigo/network/private-subnet-ids',
    ).split(',');
    const availabilityZones = (
      (this.node.tryGetContext('availabilityZones') as string | undefined) ??
      process.env.AVAILABILITY_ZONES ??
      'us-east-1a,us-east-1b'
    ).split(',');

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId,
      availabilityZones,
      privateSubnetIds,
    });

    const fn = new NodejsFunction(this, 'ApiFunction', {
      entry: path.join(__dirname, '..', 'src', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      // Entry lives in the repo root's src/ (outside cdk/), so the
      // bundling project root must be the repo root.
      projectRoot: path.join(__dirname, '..'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:BatchGetItem',
          'dynamodb:BatchWriteItem',
          'dynamodb:TransactWriteItems',
        ],
        resources: [tableArn, `${tableArn}/index/*`],
      }),
    );

    // The BFF is the ONLY allowed invoker, enforced by the invoke grant on
    // the BFF role's identity policy (shenvigo-bff-web's bff-stack.ts) -
    // deliberately NOT a resource policy here: Lambda validates that a
    // resource-policy principal already exists, and the BFF role is created
    // by shenvigo-bff-web, which deploys after this stack (first-rollout
    // deadlock). No API Gateway, no Function URL - no public surface.

    // Published for shenvigo-bff-web, which invokes this function directly
    // via the Lambda SDK (no API Gateway).
    new ssm.StringParameter(this, 'FunctionNameParam', {
      parameterName: '/shenvigo/api/function-name',
      stringValue: fn.functionName,
    });

    new cdk.CfnOutput(this, 'ApiFunctionArn', {
      value: fn.functionArn,
      description: 'ARN of the shenvigo-api Lambda (invoked directly by the BFF)',
    });
  }
}
