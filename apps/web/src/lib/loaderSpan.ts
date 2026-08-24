import * as Sentry from '@sentry/tanstackstart-react';

/**
 * Times one route loader, so its cost is a number instead of an inference.
 *
 * Black-box timing from a laptop cannot attribute latency: measuring the race
 * page before and after a change showed it getting faster, and the leaderboard
 * — which nothing had touched — getting faster by more. Ambient load moves
 * both, so the only honest reading of that experiment was "inconclusive".
 *
 * A span is attributed by construction. It reports where the server actually
 * spent its time, on real requests, split by route, and it says whether the
 * next change to a loader did anything.
 *
 * `waves` is the number of SEQUENTIAL round trips the loader makes, recorded
 * as an attribute rather than left in a comment. That is the number worth
 * watching: a Convex query is fast and a trip to Convex is not, so a loader's
 * latency tracks its waves far more closely than its query count. Recording it
 * also means a refactor that quietly reintroduces a wave shows up here rather
 * than in a TTFB somebody happens to notice months later.
 *
 * Sampling comes from the client's `tracesSampleRate`; when Sentry is not
 * initialised, `startSpan` runs the callback and records nothing, so this is
 * safe on every path including tests and dev.
 */
export function withLoaderSpan<T>(
  route: string,
  waves: number,
  load: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `loader ${route}`,
      op: 'function.loader',
      attributes: {
        'app.route': route,
        'app.loader.waves': waves,
      },
    },
    load,
  );
}
