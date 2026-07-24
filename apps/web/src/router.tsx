import * as Sentry from '@sentry/tanstackstart-react';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { ErrorFallback } from './components/error/ErrorFallback';
import * as TanstackQuery from './integrations/tanstack-query/root-provider';
import { deferUntilAfterLoad } from './lib/deferUntilAfterLoad';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
export function getRouter() {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
    },
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => <ErrorFallback error={error} />,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  if (
    !router.isServer &&
    import.meta.env.PROD &&
    import.meta.env.VITE_SENTRY_DSN
  ) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_SENTRY_RELEASE,
      dist: import.meta.env.VITE_SENTRY_DIST,
      tracesSampleRate: Number(
        import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.2',
      ),
      sendDefaultPii: true,
      beforeSend(event) {
        const message = event.exception?.values?.[0]?.value ?? '';
        if (message.includes('localhost:3030')) {
          return null;
        }
        // Environmental third-party script/chunk load failures (e.g. Clerk's
        // lazy-loaded UI bundle dropped by a flaky network or content blocker).
        // Unrecoverable client-side, not actionable — drop to reduce noise.
        if (
          message.includes('failed_to_load_clerk_ui') ||
          message.includes('Failed to load Clerk UI') ||
          /failed to load script/i.test(message)
        ) {
          return null;
        }
        return event;
      },
    });
  }

  if (!router.isServer && import.meta.env.PROD) {
    function loadAnalytics() {
      void Promise.all([
        import('./lib/analytics'),
        import('./lib/consent'),
      ]).then(
        ([
          { capturePageView, initAnalytics, isAnalyticsConfigured },
          { initConsentGatedAnalytics },
        ]) => {
          if (!isAnalyticsConfigured()) {
            console.warn(
              '[Analytics] VITE_POSTHOG_KEY is missing. PostHog and cookie consent are disabled in this build.',
            );
            return;
          }

          initAnalytics();
          // Consent gates capture: PostHog starts opted out, and the consent
          // bridge opts in (and fires the initial pageview) once Google's CMP
          // resolves for EEA users or by default for everyone else.
          initConsentGatedAnalytics();
          router.subscribe('onResolved', () => {
            capturePageView();
          });
        },
      );
    }

    deferUntilAfterLoad(loadAnalytics);
  }

  return router;
}
