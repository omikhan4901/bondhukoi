import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Crash and error reports (only when EXPO_PUBLIC_SENTRY_DSN is set). Nothing personal is
 * sent: no user, no request bodies (a location check's body holds coordinates), no
 * screenshots, and network breadcrumbs keep only the method, path and status.
 */
export function initSentry() {
  if (!dsn || Platform.OS === 'web') return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user;
      if (event.request) delete event.request.data;
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'fetch' || crumb.category === 'xhr') {
        const url = String(crumb.data?.url || '').split('?')[0];
        return { ...crumb, data: { method: crumb.data?.method, url, status_code: crumb.data?.status_code } };
      }
      if (crumb.category === 'console') return null;
      return crumb;
    },
  });
}
