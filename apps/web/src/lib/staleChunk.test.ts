import { describe, expect, it } from 'vitest';

import {
  hasLazyRouteChunkFrame,
  isLazyRouteChunkFailure,
  isStaleChunkError,
} from './staleChunk';

/** The stack Sentry recorded for GRAND-PRIX-PICKS-24, trimmed to two frames. */
const LAZY_ROUTE_STACK = `TypeError: Cannot read properties of undefined (reading 'component')
    at n (@tanstack+react-router@1.170.32/node_modules/@tanstack/react-router/dist/esm/lazyRouteComponent.js:27:12)
    at @tanstack+router-core@1.171.27/node_modules/@tanstack/router-core/dist/esm/load-client.js:41:3`;

function typeErrorWithStack(message: string, stack: string): Error {
  const error = new TypeError(message);
  error.stack = stack;
  return error;
}

describe('isStaleChunkError', () => {
  it('matches the wording each browser uses for a chunk that would not load', () => {
    expect(
      isStaleChunkError(
        new Error('Failed to fetch dynamically imported module'),
      ),
    ).toBe(true);
    expect(
      isStaleChunkError(new Error('Importing a module script failed.')),
    ).toBe(true);
    expect(isStaleChunkError('Unable to preload CSS')).toBe(true);
  });

  it('does not match the TypeError TanStack raises for the same cause', () => {
    expect(isStaleChunkError(LAZY_ROUTE_STACK)).toBe(false);
  });
});

describe('isLazyRouteChunkFailure', () => {
  it('matches a TypeError raised inside the lazy-route loader', () => {
    expect(
      isLazyRouteChunkFailure(
        typeErrorWithStack(
          "Cannot read properties of undefined (reading 'component')",
          LAZY_ROUTE_STACK,
        ),
      ),
    ).toBe(true);
  });

  it('leaves an ordinary application TypeError alone', () => {
    // The exact same message from our own code must still reach the boundary,
    // or a real bug turns into a silent reload loop.
    expect(
      isLazyRouteChunkFailure(
        typeErrorWithStack(
          "Cannot read properties of undefined (reading 'component')",
          `TypeError: Cannot read properties of undefined (reading 'component')
    at RaceDetailPage (src/routes/races/$raceSlug/index.tsx:212:9)`,
        ),
      ),
    ).toBe(false);
  });

  it('ignores non-TypeErrors and non-Errors', () => {
    const notATypeError = new Error('boom');
    notATypeError.stack = LAZY_ROUTE_STACK;
    expect(isLazyRouteChunkFailure(notATypeError)).toBe(false);
    expect(isLazyRouteChunkFailure(LAZY_ROUTE_STACK)).toBe(false);
    expect(isLazyRouteChunkFailure(undefined)).toBe(false);
  });
});

describe('hasLazyRouteChunkFrame', () => {
  it('reaches the same verdict from Sentry frames', () => {
    expect(
      hasLazyRouteChunkFrame('TypeError', [
        '@tanstack+react-router@1.170.32/node_modules/@tanstack/react-router/dist/esm/lazyRouteComponent',
        undefined,
      ]),
    ).toBe(true);

    expect(
      hasLazyRouteChunkFrame('TypeError', ['src/routes/races/$raceSlug/index']),
    ).toBe(false);

    expect(
      hasLazyRouteChunkFrame('ReferenceError', [
        '@tanstack/react-router/dist/esm/lazyRouteComponent',
      ]),
    ).toBe(false);
  });
});
