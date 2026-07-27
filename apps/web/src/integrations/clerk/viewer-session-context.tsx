import { createContext, useContext } from 'react';

export type ViewerSession = {
  isSignedIn: boolean;
  confirmedSignedIn: boolean;
  isLoaded: boolean;
};

const ViewerSessionContext = createContext<ViewerSession>({
  isSignedIn: false,
  confirmedSignedIn: false,
  isLoaded: true,
});

/**
 * Derives the header's auth state from the SSR signal and Clerk's client state.
 *
 * `isLoaded && !clientSignedIn` is ambiguous on its own: it is both Clerk's
 * mid-boot transient (must not flash "Sign in") and a genuine sign-out (must
 * not stay stuck on the avatar placeholder). `hasConfirmedSession` disambiguates
 * them — it is only true once Clerk has actually confirmed a session on this
 * page load, so a signed-out report after that is real. Sign-out can only be
 * reached through the UserButton, which mounts solely when `confirmedSignedIn`
 * is true, so a real sign-out is always preceded by a confirmation.
 *
 * Kept pure and exported so the provider and its tests share one definition.
 */
export function deriveViewerSession({
  isLoaded,
  clientSignedIn,
  initialSignedIn,
  hasConfirmedSession,
}: {
  isLoaded: boolean;
  clientSignedIn: boolean | undefined;
  initialSignedIn: boolean;
  hasConfirmedSession: boolean;
}): ViewerSession {
  const confirmedSignedIn = isLoaded && !!clientSignedIn;
  return {
    isLoaded,
    // Once Clerk has spoken for this page load it is authoritative; before that
    // the SSR signal carries the first paint.
    isSignedIn: hasConfirmedSession
      ? confirmedSignedIn
      : initialSignedIn || confirmedSignedIn,
    confirmedSignedIn,
  };
}

export const ViewerSessionProvider = ViewerSessionContext.Provider;

export function useViewerSessionContext() {
  return useContext(ViewerSessionContext);
}
