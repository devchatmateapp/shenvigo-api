/**
 * shenvigo-api Lambda entry point.
 *
 * DIRECT-INVOKE CONVENTION
 * ------------------------
 * This Lambda has NO public ingress (no API Gateway). It is invoked
 * directly by the shenvigo-bff-web Lambda via the AWS SDK
 * (LambdaClient / InvokeCommand, RequestResponse).
 *
 * The BFF sends a JSON payload shaped as:
 *
 *   {
 *     "operation": "groups.list",        // "<domain>.<action>", required
 *     "correlationId": "uuid",           // optional; generated if absent
 *     "payload": { ... }                 // operation-specific input
 *   }
 *
 * The handler dispatches on `operation` and returns either the
 * operation's result or the standard error shape:
 *
 *   { "error": { "code": "UNKNOWN_OPERATION", "message": "..." } }
 *
 * Internal failures always map to `{ error: { code: "INTERNAL", ... } }`
 * so stack traces and internals never leak to the caller.
 */
import type { Context } from 'aws-lambda';
import { healthCheck } from './handlers/health';
import { resolveCorrelationId } from './middleware/correlation';
import { createLogger } from './lib/logger';

export interface InvokeEvent {
  operation: string;
  correlationId?: string;
  payload?: unknown;
}

export interface OperationContext {
  correlationId: string;
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

type OperationHandler = (payload: unknown, ctx: OperationContext) => Promise<unknown>;

/** Operation registry. New domains register their handlers here. */
const routes: Record<string, OperationHandler> = {
  'health.check': async () => healthCheck(),
  // Future operations (T020+): groups.list, groups.get, threads.*, votes.*,
  // profile.*, admin.* — each implemented under src/handlers/ + src/domain/.
};

export const handler = async (event: InvokeEvent, _context: Context): Promise<unknown> => {
  const correlationId = resolveCorrelationId(event ?? {});
  const log = createLogger(correlationId);

  const operation = typeof event?.operation === 'string' ? event.operation : '';
  const route = routes[operation];

  if (!route) {
    log.warn('Unknown operation', { operation });
    const body: ErrorBody = {
      error: { code: 'UNKNOWN_OPERATION', message: `Unknown operation: ${operation || '(missing)'}` },
    };
    return body;
  }

  try {
    return await route(event.payload, { correlationId });
  } catch (err) {
    log.error('Operation failed', {
      operation,
      err: err instanceof Error ? err.message : 'unknown',
    });
    const body: ErrorBody = { error: { code: 'INTERNAL', message: 'Internal error' } };
    return body;
  }
};
