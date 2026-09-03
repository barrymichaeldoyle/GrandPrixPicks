import * as Sentry from '@sentry/tanstackstart-react';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { ErrorFallback } from './components/error/ErrorFallback';
import * as TanstackQuery from './integrations/tanstack-query/root-provider';
import { deferUntilAfterLoad } from './lib/deferUntilAfterLoad';
import {
  isReloadingForStaleChunk,
  isStaleChunkError,
  listenForStaleChunks,
  reloadForStaleChunk,
} from './lib/staleChunk';
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
    // Let the router restore history positions and scroll hash targets only
    // after the destination route has rendered. A root-level effect cannot
    // safely do this: it runs before lazy route content has necessarily laid
    // out and can overwrite the browser's anchor scroll with a scroll to 0.
    scrollRestoration: true,
    defaultErrorComponent: ({ error }) => {
      // A visitor one deploy behind asked for a chunk that no longer exists.
      // Nothing is broken for them that new HTML would not fix, so reload
      // instead of showing a red flag. `vite:preloadError` below catches most
      // of these first; this is the path for the ones that reach the boundary.
      //
      // The first branch is for a reload already under way: whatever failed
      // downstream of it is the teardown, not a fault, and a red flag flashing
      // over the last frames before the new page arrives helps nobody.
      if (isReloadingForStaleChunk()) {
        return null;
      }
      if (isStaleChunkError(error) && reloadForStaleChunk()) {
        return null;
      }
      return <ErrorFallback error={error} />;
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  if (!router.isServer) {
    listenForStaleChunks();
  }

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
        // We have already called `reload()`; this page is being torn down and
        // is about to be replaced by one built from the new HTML. Anything it
        // raises on the way out is the teardown, not a defect — including the
        // `undefined` that Vite's preload helper resolves dynamic imports with
        // once we have handled the failure. See `staleChunk.ts`.
        if (isReloadingForStaleChunk()) {
          return null;
        }
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
        // A chunk that vanished under a visitor holding pre-deploy HTML. We
        // reload them onto the new build, so there is no defect here to
        // report — only a record of how often we deployed while people were
        // reading, which is not what this tray is for.
        if (isStaleChunkError(message)) {
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
