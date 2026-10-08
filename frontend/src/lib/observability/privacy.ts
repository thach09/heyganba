import type { Breadcrumb, Event, init } from '@sentry/react';
export type TelemetrySpan = Parameters<NonNullable<NonNullable<Parameters<typeof init>[0]>['beforeSendSpan']>>[0];

/** Keep known route segments; never send query text, hashes, identifiers or arbitrary paths. */
export function telemetryRoute(value?: string): string {
  if (!value) return '[redacted]';
  const known = new Set(['api','v1','auth','login','register','refresh','logout','users','me','preferences','class-code',
    'dashboard','kana','kanji','grammar','flashcard','exam','dictionary','admin','progress','health','product-events',
    'learning-started','rules','exercises','check','due-today','review','stats','start','submit','results','notebooks']);
  try {
    const url = new URL(value, 'https://telemetry.invalid');
    return '/' + url.pathname.split('/').filter(Boolean).map(segment => known.has(segment) ? segment : ':value').join('/');
  } catch { return '[redacted]'; }
}

export function privateBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console/UI breadcrumbs may include entered answers, names or DOM text.
  if (!['fetch','xhr','navigation'].includes(breadcrumb.category ?? '')) return null;
  return { timestamp: breadcrumb.timestamp, category: breadcrumb.category, type: breadcrumb.type,
    data: breadcrumb.category === 'navigation'
      ? { from: telemetryRoute(breadcrumb.data?.from), to: telemetryRoute(breadcrumb.data?.to) }
      : { url: telemetryRoute(breadcrumb.data?.url),
        method: /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(breadcrumb.data?.method) ? breadcrumb.data?.method : undefined,
        status_code: typeof breadcrumb.data?.status_code === 'number' ? breadcrumb.data.status_code : undefined } };
}

export function privateEvent<T extends Event>(event: T): T {
  delete event.user; delete event.extra; delete event.tags; delete event.contexts;
  delete event.message; delete event.logentry; delete event.fingerprint;
  if (event.request) event.request = { method: event.request.method, url: telemetryRoute(event.request.url) };
  if (event.transaction) event.transaction = telemetryRoute(event.transaction);
  event.breadcrumbs = event.breadcrumbs?.map(privateBreadcrumb).filter((item): item is Breadcrumb => item !== null);
  event.exception?.values?.forEach(exception => {
    exception.value = '[redacted]';
    if (exception.mechanism) delete exception.mechanism.data;
    exception.stacktrace?.frames?.forEach(frame => {
      delete frame.vars; delete frame.pre_context; delete frame.post_context; delete frame.context_line;
      if (frame.filename) frame.filename = telemetrySource(frame.filename);
      if (frame.abs_path) frame.abs_path = telemetrySource(frame.abs_path);
    });
  });
  return event;
}

function telemetrySource(value: string): string {
  try {
    const path = new URL(value, 'https://telemetry.invalid').pathname;
    // Preserve public bundle/source filenames for grouping and source maps, without origin/query.
    return /^\/(assets|src)\/[a-zA-Z0-9_/.-]+\.(js|jsx|ts|tsx)$/.test(path) ? path : '[redacted]';
  } catch { return '[redacted]'; }
}

export function privateSpan(span: TelemetrySpan): TelemetrySpan {
  // Streamed spans are the default in SDK 11; beforeSendTransaction alone does not cover them.
  return { ...span, name: telemetryRoute(span.name), attributes: {}, links: undefined };
}
