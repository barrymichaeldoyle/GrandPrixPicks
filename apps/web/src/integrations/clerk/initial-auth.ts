import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createContext, useContext } from 'react';

import { isClerkSessionPresent } from '../../../server/lib/auth';

/**
 * Viewer auth state resolved on the server during SSR. Lets the header render
 * the correct signed-in/out nav on the first paint instead of waiting for
 * Clerk's client SDK to boot. Clerk's client state remains the source of truth
 * once it loads (see {@link useInitialAuth} consumers).
 */
export type InitialAuth = {
  isSignedIn: boolean;
};

const ANONYMOUS_INITIAL_AUTH: InitialAuth = {
  isSignedIn: false,
};

/**
 * Resolves whether the viewer has a Clerk session for the first server render.
 *
 * We read Clerk's durable `__client_uat` cookie rather than validating the
 * `__session` JWT: that token is short-lived (~1 min) and is frequently stale on
 * a mobile refresh or a resumed tab, in which case validating it reports
 * signed-out and the header flashes "Sign in" before the client SDK refreshes.
 * The `__client_uat` signal has no such expiry, so the first paint matches the
 * real state. This only drives cosmetic first-paint nav — Clerk (client) and
 * Convex remain the source of truth for anything that actually reads data.
 */
export const fetchInitialAuth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<InitialAuth> => {
    try {
      return { isSignedIn: isClerkSessionPresent(getRequest()) };
    } catch {
      // SSR auth is a progressive enhancement: on any failure fall back to
      // anonymous and let Clerk's client SDK resolve auth, rather than failing
      // the whole page render.
      return ANONYMOUS_INITIAL_AUTH;
    }
  },
);

const InitialAuthContext = createContext<InitialAuth>(ANONYMOUS_INITIAL_AUTH);

export const InitialAuthProvider = InitialAuthContext.Provider;

/** SSR-resolved auth state. Defaults to anonymous if no provider is present. */
export function useInitialAuth(): InitialAuth {
  return useContext(InitialAuthContext);
}
