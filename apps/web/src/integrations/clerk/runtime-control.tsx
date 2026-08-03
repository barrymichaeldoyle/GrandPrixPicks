import { createContext, useContext } from 'react';

import { preloadClerkRuntime } from './preload';

type ClerkRuntimeControl = {
  active: boolean;
  openSignInOnMount: boolean;
  /** A sign-in click is in flight and the modal is not on screen yet. */
  signInPending: boolean;
  afterSignInPath: '/leagues/create' | null;
  requestSignIn: (afterSignInPath?: '/leagues/create') => void;
  /** Boot Clerk without opening anything, on an intent signal before the click. */
  warmSignIn: () => void;
  signInOpened: () => void;
  clearAfterSignInPath: () => void;
};

const ClerkRuntimeControlContext = createContext<ClerkRuntimeControl>({
  active: true,
  openSignInOnMount: false,
  signInPending: false,
  afterSignInPath: null,
  requestSignIn: () => undefined,
  warmSignIn: () => undefined,
  signInOpened: () => undefined,
  clearAfterSignInPath: () => undefined,
});

export const ClerkRuntimeControlProvider = ClerkRuntimeControlContext.Provider;

export function useClerkRuntimeControl() {
  return useContext(ClerkRuntimeControlContext);
}

/**
 * Spread onto any control that opens sign-in, so the cost of booting Clerk is
 * paid during the hover/focus/tap that precedes the click rather than after it.
 *
 * `touchstart` matters most: a phone gives no hover, and it is still the
 * earliest signal available — a few hundred milliseconds ahead of the click.
 */
export function useClerkWarmHandlers() {
  const { warmSignIn } = useClerkRuntimeControl();

  function warm() {
    void preloadClerkRuntime();
    warmSignIn();
  }

  return {
    onPointerEnter: warm,
    onFocus: warm,
    onTouchStart: warm,
  };
}
