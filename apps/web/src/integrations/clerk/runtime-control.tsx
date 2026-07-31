import { createContext, useContext } from 'react';

type ClerkRuntimeControl = {
  active: boolean;
  openSignInOnMount: boolean;
  afterSignInPath: '/leagues/create' | null;
  requestSignIn: (afterSignInPath?: '/leagues/create') => void;
  signInOpened: () => void;
  clearAfterSignInPath: () => void;
};

const ClerkRuntimeControlContext = createContext<ClerkRuntimeControl>({
  active: true,
  openSignInOnMount: false,
  afterSignInPath: null,
  requestSignIn: () => undefined,
  signInOpened: () => undefined,
  clearAfterSignInPath: () => undefined,
});

export const ClerkRuntimeControlProvider = ClerkRuntimeControlContext.Provider;

export function useClerkRuntimeControl() {
  return useContext(ClerkRuntimeControlContext);
}
