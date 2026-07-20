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

export const ViewerSessionProvider = ViewerSessionContext.Provider;

export function useViewerSessionContext() {
  return useContext(ViewerSessionContext);
}
