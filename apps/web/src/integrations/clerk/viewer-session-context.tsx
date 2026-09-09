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
 * `useAuth` can report loaded from its SSR initial state before the browser
 * SDK has booted. Keep the first-paint assumption until `clerk.loaded` too,
 * then trust either answer. Requiring a previous signed-in confirmation leaves
 * expired sessions on a dashboard whose authenticated queries cannot resolve.
 *
 * Kept pure and exported so the provider and its tests share one definition.
 */
export function deriveViewerSession({
  isLoaded,
  clientSignedIn,
  initialSignedIn,
  clientLoaded,
}: {
  isLoaded: boolean;
  clientSignedIn: boolean | undefined;
  initialSignedIn: boolean;
  clientLoaded: boolean;
}): ViewerSession {
  const sessionLoaded = isLoaded && clientLoaded;
  const confirmedSignedIn = sessionLoaded && !!clientSignedIn;
  return {
    isLoaded: sessionLoaded,
    // Once Clerk has spoken for this page load it is authoritative; before that
    // the SSR signal carries the first paint.
    isSignedIn: sessionLoaded
      ? confirmedSignedIn
      : initialSignedIn || confirmedSignedIn,
    confirmedSignedIn,
  };
}

export const ViewerSessionProvider = ViewerSessionContext.Provider;

export function useViewerSessionContext() {
  return useContext(ViewerSessionContext);
}
