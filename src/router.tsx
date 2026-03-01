import * as Sentry from '@sentry/tanstackstart-react';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import posthog from 'posthog-js';

import { ErrorFallback } from './components/ErrorFallback';
import * as TanstackQuery from './integrations/tanstack-query/root-provider';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
export const getRouter = () => {
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
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
      beforeSend(event) {
        const message = event.exception?.values?.[0]?.value ?? '';
        if (message.includes('localhost:3030')) {
          return null;
        }
        return event;
      },
    });
  }

  if (
    !router.isServer &&
    import.meta.env.PROD &&
    import.meta.env.VITE_POSTHOG_KEY
  ) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      opt_out_capturing_by_default: true,
    });

    router.subscribe('onResolved', () => {
      posthog.capture('$pageview');
    });
  }

  return router;
};
