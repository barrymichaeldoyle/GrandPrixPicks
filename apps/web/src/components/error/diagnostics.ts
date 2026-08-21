import { hasClerkSessionCookie } from '@/integrations/clerk/session-cookie';

/**
 * The tags an error report needs to be actionable in Sentry.
 *
 * Written after a crash that took every race page down for signed-out visitors
 * for a week while Sentry had it the whole time. The reports were there; they
 * just could not be read. Two things were missing.
 *
 * The location tag was the raw pathname, so `/races/monaco-2026` and
 * `/races/hungary-2026` were different values and one broken route arrived as
 * twenty unrelated-looking issues, none individually alarming. `route` is the
 * matched pattern instead, so a broken route is one issue whose count is the
 * size of the problem.
 *
 * And nothing recorded whether the visitor was signed in, which was the entire
 * tell: every one of those events was anonymous, and a glance at that
 * distribution would have named the bug. `viewer` is read from Clerk's durable
 * cookie rather than a hook or a provider, because this runs on the error path
 * — including in a class `componentDidCatch`, and including when what failed
 * was the provider tree itself. A tag is never worth a second throw.
 */
export function errorDiagnosticTags(routePattern?: string): {
  route: string;
  location: string;
  viewer: 'anonymous' | 'authed';
} {
  return {
    route: routePattern ?? readRoutePattern(),
    // Kept alongside `route`: the pattern says which page is broken, the exact
    // path is what you paste into a browser to see it.
    location:
      typeof window === 'undefined' ? 'unknown' : window.location.pathname,
    viewer: readViewer(),
  };
}

function readViewer(): 'anonymous' | 'authed' {
  try {
    return hasClerkSessionCookie() ? 'authed' : 'anonymous';
  } catch {
    // Storage access can throw outright in some embedded contexts. An
    // unknowable viewer must not cost us the whole report.
    return 'anonymous';
  }
}

/**
 * Best-effort route pattern when the caller has no router handy.
 *
 * A class boundary catches errors from anywhere in the tree and cannot call
 * `useRouter`, so it falls back to collapsing the obvious dynamic segments.
 * Deliberately crude: it only has to stop one broken route from arriving as
 * one issue per URL.
 */
function readRoutePattern(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  return (
    window.location.pathname
      .replace(/^\/races\/[^/]+/, '/races/$raceSlug')
      .replace(/^\/circuits\/[^/]+/, '/circuits/$circuitSlug')
      .replace(/^\/leagues\/[^/]+/, '/leagues/$slug')
      .replace(/^\/guides\/[^/]+/, '/guides/$slug')
      .replace(/^\/p\/[^/]+/, '/p/$username')
      .replace(/^\/feed\/[^/]+/, '/feed/$feedEventId') || '/'
  );
}
