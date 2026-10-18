/**
 * DynamoDB access.
 *
 * Single-table design (`shenvigo-phase1`), PK/SK key patterns per
 * specs/001-phase-1-community/data-model.md in shenvigo-meta.
 *
 * The table name is NEVER hardcoded: it comes from the TABLE_NAME
 * environment variable, injected by the CDK stack (which reads it from
 * SSM `/shenvigo/data/table-name` published by shenvigo-data).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let cachedClient: DynamoDBDocumentClient | undefined;

export function getTableName(): string {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is not set');
  }
  return tableName;
}

export function getDocumentClient(): DynamoDBDocumentClient {
  if (!cachedClient) {
    cachedClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return cachedClient;
}
