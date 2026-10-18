/**
 * Correlation-ID propagation.
 *
 * The BFF passes its correlation ID through on every direct invoke so a
 * single request can be traced across BFF → API → DynamoDB in the
 * structured logs. If the caller omits it, we generate one — every
 * operation is always traceable.
 */
import { randomUUID } from 'node:crypto';

export function resolveCorrelationId(event: { correlationId?: unknown }): string {
  if (typeof event.correlationId === 'string' && event.correlationId.length > 0) {
    return event.correlationId;
  }
  return randomUUID();
}
