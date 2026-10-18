/**
 * Structured JSON logging.
 *
 * Every line is a single JSON object: { level, message, timestamp,
 * correlationId, ...fields }. No PII may be logged — callers must pass
 * only IDs (userId, threadId, ...) and operational fields. Never pass
 * contact details, auth subjects, display names, or free-text user
 * content into these fields (constitution III: no PII in logs).
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createLogger(correlationId: string): Logger {
  const emit = (level: LogLevel, message: string, fields: Record<string, unknown> = {}): void => {
    const line = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId,
      ...fields,
    });
    // eslint-disable-next-line no-console
    console.log(line);
  };

  return {
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
  };
}
