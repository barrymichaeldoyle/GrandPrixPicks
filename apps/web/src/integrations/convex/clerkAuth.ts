import { useAuth } from '@clerk/react';
import * as Sentry from '@sentry/tanstackstart-react';
import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';

/**
 * Clerk's session token, fetched so that a hung request cannot strand Convex.
 *
 * `ConvexProviderWithClerk` hands Convex a `fetchAccessToken` that calls
 * Clerk's `getToken` and awaits it with no time limit. Convex awaits it in
 * turn, and `AuthenticationManager.setConfig` does so with the WebSocket
 * *paused*. A `getToken` that never settles therefore takes the whole client
 * down with it: the socket never resumes, so no query answers -- public ones
 * included -- and `useConvexAuth()` stays `isLoading` forever, because the
 * callback that would flip it never runs. There is nothing in Clerk's SDK,
 * Convex's provider or the socket layer that puts a bound on it.
 *
 * That is not hypothetical. CI caught it on 2026-08-27: the socket opened, the
 * first token returned in 130ms, and the forced-refresh fetch Convex issues
 * straight after (`?debug=skip_cache`) never came back. Thirty seconds later
 * the race page was still on its loader, under a header showing the viewer's
 * own avatar.
 *
 * So each attempt gets a deadline, and a timed-out attempt is retried rather
 * than believed. The distinction matters: returning `null` on the first
 * timeout would tell Convex the viewer is signed out, which is a lie about a
 * request that merely hung. Only once the retries are spent do we say so, and
 * by then it is the truth as far as this page can establish it.
 */
const TOKEN_FETCH_TIMEOUT_MS = 8_000;
const TOKEN_FETCH_ATTEMPTS = 3;

type GetToken = ReturnType<typeof useAuth>['getToken'];

class TokenFetchTimeout extends Error {
  constructor(ms: number) {
    super(`Clerk getToken did not settle within ${ms}ms`);
    this.name = 'TokenFetchTimeout';
  }
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // The underlying request is left running: Clerk owns it, there is no
    // abort signal to hand it, and a late success is harmless once we have
    // stopped waiting on it.
    const timer = setTimeout(() => reject(new TokenFetchTimeout(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function fetchClerkAccessToken(
  getToken: GetToken,
  options: { forceRefreshToken: boolean; useSessionToken: boolean },
): Promise<string | null> {
  for (let attempt = 1; attempt <= TOKEN_FETCH_ATTEMPTS; attempt++) {
    try {
      return await withDeadline(
        // A session already minted for Convex needs no template, which is the
        // branch `ConvexProviderWithClerk` takes on `sessionClaims.aud`.
        options.useSessionToken
          ? getToken({ skipCache: options.forceRefreshToken })
          : getToken({
              template: 'convex',
              skipCache: options.forceRefreshToken,
            }),
        TOKEN_FETCH_TIMEOUT_MS,
      );
    } catch (error) {
      const isLastAttempt = attempt === TOKEN_FETCH_ATTEMPTS;
      if (error instanceof TokenFetchTimeout) {
        // Worth a report either way: a token fetch slow enough to trip this is
        // already a broken page for as long as it lasts, and it leaves no
        // other trace. Only the final one is an error -- the earlier ones
        // recovered, and paging on a recovered retry trains us to ignore it.
        Sentry.captureMessage('Clerk token fetch timed out', {
          level: isLastAttempt ? 'error' : 'warning',
          tags: { area: 'convex-auth', attempt: String(attempt) },
          extra: {
            timeoutMs: TOKEN_FETCH_TIMEOUT_MS,
            attempts: TOKEN_FETCH_ATTEMPTS,
            forceRefreshToken: options.forceRefreshToken,
            gaveUp: isLastAttempt,
          },
        });
        if (!isLastAttempt) {
          continue;
        }
      }
      // A rejection is Clerk answering, so it is not retried: that is the case
      // the provider we are replacing already handled by returning null.
      return null;
    }
  }

  return null;
}

/**
 * The `useAuth` Convex wants, in place of `ConvexProviderWithClerk`.
 *
 * That component is a thin wrapper over `ConvexProviderWithAuth` whose only
 * job is this adaptation, and it hard-codes the unbounded `getToken` call. Ten
 * lines of it are worth owning to put a deadline in the middle. `__root.tsx`
 * already drives `ConvexProviderWithAuth` directly for anonymous visitors, so
 * this is the same shape, not a new one.
 */
export function useClerkConvexAuth() {
  const { isLoaded, isSignedIn, getToken, sessionClaims } = useAuth();

  /**
   * One `fetchAccessToken` for the life of the provider, reading the current
   * Clerk values through a ref.
   *
   * Upstream rebuilds this function whenever `orgId`, `orgRole` or `sessionId`
   * changes, because a new identity is how Convex is told to re-authenticate.
   * Convex's own effect already depends on `authProviderAuthenticated` and
   * `authProviderLoading`, so signing in or out re-runs `setAuth` either way;
   * what the upstream deps buy on top of that is an organisation switch, and
   * this app has no Clerk organisations.
   *
   * Against that: manual memoization is banned here (React Compiler, which
   * runs only in production), so a `useCallback` we cannot write would be a
   * fresh identity on every dev render -- and this identity sits in an effect
   * dependency array whose body calls `setAuth`, which pauses the socket. A
   * stable one is both the safer default and the honest description of what
   * this app needs.
   */
  const useSessionToken = sessionClaims?.aud === 'convex';
  const latest = useRef({ getToken, useSessionToken });

  // Written in a layout effect rather than during render. Convex calls
  // `fetchAccessToken` from `setAuth`, which runs in a passive effect below
  // this one in the tree, so the values are always current by the time it
  // does.
  useIsomorphicLayoutEffect(() => {
    latest.current = { getToken, useSessionToken };
  });

  const fetchAccessToken = useRef(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
      await fetchClerkAccessToken(latest.current.getToken, {
        forceRefreshToken,
        useSessionToken: latest.current.useSessionToken,
      }),
  ).current;

  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
    fetchAccessToken,
  };
}
