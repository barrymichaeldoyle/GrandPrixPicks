import * as Sentry from '@sentry/tanstackstart-react';

const sentryDsn =
  import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;
const sentryRelease =
  import.meta.env?.VITE_SENTRY_RELEASE ??
  process.env.VITE_SENTRY_RELEASE ??
  process.env.SENTRY_RELEASE ??
  process.env.CF_PAGES_COMMIT_SHA;
const sentryDist =
  import.meta.env?.VITE_SENTRY_DIST ?? process.env.VITE_SENTRY_DIST;
const tracesSampleRate = Number(
  import.meta.env?.VITE_SENTRY_TRACES_SAMPLE_RATE ??
    process.env.VITE_SENTRY_TRACES_SAMPLE_RATE ??
    '0.2',
);

if (!sentryDsn) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.');
} else if (process.env.NODE_ENV !== 'production') {
  // Sentry only runs in production
} else {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    release: sentryRelease,
    dist: sentryDist,
    sendDefaultPii: true,
    tracesSampleRate: Number.isFinite(tracesSampleRate)
      ? tracesSampleRate
      : 0.2,
  });
}
