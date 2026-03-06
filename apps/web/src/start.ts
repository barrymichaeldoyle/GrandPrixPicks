import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createStart } from '@tanstack/react-start';

// Log full HTTPError details so they appear in `wrangler tail`.
// Without this, unhandled rejections only show { message: 'HTTPError' } with
// no URL or status code, making it impossible to diagnose which request failed.
if (typeof addEventListener !== 'undefined') {
  addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const err = event.reason;
    if (err?.name === 'HTTPError' && err?.response) {
      err.response
        .clone()
        .text()
        .then((body: string) => {
          console.error(
            '[HTTPError]',
            err.response.status,
            err.response.url,
            body.slice(0, 500),
          );
        })
        .catch(() => {
          console.error('[HTTPError]', err.response.status, err.response.url);
        });
    } else {
      console.error('[unhandledrejection]', err?.stack ?? err);
    }
  });
}

// On Cloudflare Pages, process.env is only populated when compatibility_flags
// include nodejs_compat_populate_process_env. Explicitly passing all three keys
// here prevents Clerk v1's "keyless" fallback from firing — without a
// publishableKey, Clerk tries to create accountless credentials via the
// filesystem and its API, both of which fail on Workers (HTTPError → 500).
// publishableKey is safe to read from import.meta.env because Vite bakes it
// into the bundle at build time.
const clerkOpts = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined,
  ...(typeof process !== 'undefined' && {
    ...(process.env.CLERK_SECRET_KEY && {
      secretKey: process.env.CLERK_SECRET_KEY,
    }),
    ...(process.env.CLERK_JWT_KEY && {
      jwtKey: process.env.CLERK_JWT_KEY,
    }),
  }),
};

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware(clerkOpts)],
  };
});
