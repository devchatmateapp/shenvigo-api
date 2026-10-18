/** Health-check operation (`health.check`). No auth, no dependencies. */

export interface HealthResult {
  status: 'ok';
  service: 'shenvigo-api';
  timestamp: string;
}

export async function healthCheck(): Promise<HealthResult> {
  return {
    status: 'ok',
    service: 'shenvigo-api',
    timestamp: new Date().toISOString(),
  };
}
