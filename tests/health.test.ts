import { describe, expect, it } from 'vitest';
import { healthCheck } from '../src/handlers/health';
import { buildAuditEntry } from '../src/lib/audit';

describe('healthCheck', () => {
  it('returns ok status for shenvigo-api', async () => {
    const result = await healthCheck();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('shenvigo-api');
    expect(typeof result.timestamp).toBe('string');
  });
});

describe('buildAuditEntry (spec FR-013: ID-only entries, no PII)', () => {
  it('contains only IDs and operational fields', () => {
    const entry = buildAuditEntry({
      actorId: 'USER#123e4567-e89b-12d3-a456-426614174000',
      action: 'profile.read',
      targetType: 'PROFILE',
      targetId: 'USER#123e4567-e89b-12d3-a456-426614174000',
      correlationId: 'corr-1',
    });

    expect(Object.keys(entry).sort()).toEqual([
      'action',
      'actorId',
      'correlationId',
      'targetId',
      'targetType',
      'timestamp',
    ]);

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('@');
    expect(serialized).not.toMatch(/contact|authSubject|email|phone/i);
  });
});
