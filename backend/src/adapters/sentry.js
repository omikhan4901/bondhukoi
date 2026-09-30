import * as Sentry from '@sentry/node';

/**
 * Error reporting (optional: only when SENTRY_DSN is set). Nothing personal is sent:
 * no request bodies (they can hold coordinates), no headers, no cookies, no user data.
 */
export function initSentry(dsn, environment) {
  if (!dsn) return null;
  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.query_string;
      }
      delete event.user;
      return event;
    },
    beforeBreadcrumb: (crumb) => (crumb.category === 'http' ? { ...crumb, data: { method: crumb.data?.method, status_code: crumb.data?.status_code } } : crumb),
  });
  return Sentry;
}
