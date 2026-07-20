import { createContext, useContext } from 'react';

type ClerkRuntimeControl = {
  active: boolean;
  openSignInOnMount: boolean;
  requestSignIn: () => void;
  signInOpened: () => void;
};

const ClerkRuntimeControlContext = createContext<ClerkRuntimeControl>({
  active: true,
  openSignInOnMount: false,
  requestSignIn: () => undefined,
  signInOpened: () => undefined,
});

export const ClerkRuntimeControlProvider = ClerkRuntimeControlContext.Provider;

export function useClerkRuntimeControl() {
  return useContext(ClerkRuntimeControlContext);
}
