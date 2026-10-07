import { describe, expect, it } from 'vitest';
import type { Event } from '@sentry/react';
import { privateBreadcrumb, privateEvent, privateSpan, telemetryRoute, type TelemetrySpan } from '../../src/lib/observability/privacy';

describe('telemetry privacy', () => {
  it('removes credentials, search/answer text and personal context while retaining error location', () => {
    const event: Event = { user: { email: 'private@example.test' }, extra: { password: 'secret' },
      message: 'answer text', tags: { token: 'secret' }, contexts: { custom: { answer: 'private' } },
      request: { url: 'https://user:secret@host/api/v1/dictionary?q=private#token', headers: { Authorization: 'Bearer secret' }, data: 'password=secret' },
      exception: { values: [{ type: 'TypeError', value: 'private@example.test', stacktrace: { frames: [{ function: 'render', lineno: 12, vars: { password: 'secret' } }] } }] },
      breadcrumbs: [{ category: 'console', message: 'secret' }, { category: 'fetch', data: { url: '/users/123?token=secret', body: 'secret', method: 'POST', status_code: 500 } }] };
    const result = privateEvent(event);
    expect(JSON.stringify(result)).not.toMatch(/secret|private@example|answer text|123/);
    expect(result.exception?.values?.[0].type).toBe('TypeError');
    expect(result.exception?.values?.[0].stacktrace?.frames?.[0].lineno).toBe(12);
    expect(result.breadcrumbs).toHaveLength(1);
    expect(result.request?.url).toBe('/api/v1/dictionary');
  });
  it('scrubs streamed spans and discards UI breadcrumbs', () => {
    const span = { name: '/dictionary?q=secret', attributes: { 'http.request.header.authorization': 'secret' }, trace_id: 'trace', span_id: 'span', start_timestamp: 1, status: 'error', is_segment: true } as TelemetrySpan;
    expect(privateSpan(span)).toMatchObject({ name: '/dictionary', attributes: {}, trace_id: 'trace' });
    expect(privateBreadcrumb({ category: 'ui.click', message: 'private' })).toBeNull();
    expect(telemetryRoute('https://host/users/private@example.test?answer=secret')).toBe('/users/:value');
  });
});

