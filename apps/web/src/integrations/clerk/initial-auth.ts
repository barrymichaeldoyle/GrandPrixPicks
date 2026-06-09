import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createContext, useContext } from 'react';

import { getAuthenticatedClerkIdentity } from '../../../server/lib/auth';

/**
 * Viewer auth state resolved on the server during SSR. Lets the header render
 * the correct signed-in/out nav on the first paint instead of waiting for
 * Clerk's client SDK to boot. Clerk's client state remains the source of truth
 * once it loads (see {@link useInitialAuth} consumers).
 */
export type InitialAuth = {
  isSignedIn: boolean;
  userId: string | null;
};

const ANONYMOUS_INITIAL_AUTH: InitialAuth = {
  isSignedIn: false,
  userId: null,
};

/**
 * Resolves the viewer's Clerk auth state from the request cookies using the
 * edge-safe `@clerk/backend` SDK (the same primitive the Nitro API routes use),
 * so it runs on Cloudflare without Clerk's `node:fs`-bound server adapter.
 */
export const fetchInitialAuth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<InitialAuth> => {
    try {
      const identity = await getAuthenticatedClerkIdentity(getRequest());
      return {
        isSignedIn: identity !== null,
        userId: identity?.userId ?? null,
      };
    } catch {
      // SSR auth is a progressive enhancement: if resolution fails (e.g. missing
      // CLERK_SECRET_KEY, a transient Clerk error, or a malformed cookie) fall
      // back to anonymous and let Clerk's client SDK resolve auth, rather than
      // failing the whole page render.
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
