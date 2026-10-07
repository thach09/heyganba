import { apiRequest } from '../../lib/api/client';

/** Best effort, no answers/credentials/metadata. Completion facts stay server-owned. */
export function trackLearningStarted(module: 'SRS' | 'GRAMMAR', eventKey: string) {
  void apiRequest<void>('/product-events/learning-started', {
    method: 'POST', body: JSON.stringify({ module, eventKey }),
  }).catch(() => { /* Telemetry must never interrupt practice. */ });
}
