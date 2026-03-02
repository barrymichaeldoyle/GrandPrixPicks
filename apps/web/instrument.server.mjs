import * as Sentry from '@sentry/tanstackstart-react';

const sentryDsn =
  import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;

if (!sentryDsn) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.');
} else if (process.env.NODE_ENV !== 'production') {
  // Sentry only runs in production
} else {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
