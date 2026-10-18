/**
 * Audit logging (spec FR-013).
 *
 * Profile-data access must be audit-logged. Audit entries contain IDs
 * ONLY — actorId, target IDs, action, timestamp. They must NEVER contain
 * PII: no contact details (email/phone), no Cognito auth subjects, no
 * display names, no free-text content. The type below makes this
 * structural: there is simply no field for PII to live in.
 *
 * Entries are stored in the same DynamoDB table:
 *   PK: AUDIT#<yyyy-mm-dd>   SK: <timestamp>#<uuid>
 */
import { randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDocumentClient, getTableName } from './dynamo';

export interface AuditEntry {
  /** Internal stable user ID (USER#<uuid>). Never contact/authSubject. */
  actorId: string;
  /** e.g. 'profile.read', 'profile.update', 'content.removed' */
  action: string;
  /** Entity type, e.g. 'PROFILE', 'THREAD' */
  targetType: string;
  /** Entity ID, e.g. 'USER#<uuid>' */
  targetId: string;
  correlationId: string;
  timestamp: string;
}

export type NewAuditEntry = Omit<AuditEntry, 'timestamp'>;

export function buildAuditEntry(input: NewAuditEntry): AuditEntry {
  return { ...input, timestamp: new Date().toISOString() };
}

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  const day = entry.timestamp.slice(0, 10); // yyyy-mm-dd
  await getDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        PK: `AUDIT#${day}`,
        SK: `${entry.timestamp}#${randomUUID()}`,
        entityType: 'AUDIT',
        ...entry,
      },
    }),
  );
}
