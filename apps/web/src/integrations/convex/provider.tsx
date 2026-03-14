import { useAuth } from '@clerk/react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { PropsWithChildren } from 'react';

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error('missing envar CONVEX_URL');
}

const convex = new ConvexReactClient(CONVEX_URL);

function useConvexClerkAuth() {
  const auth = useAuth();

  return {
    ...auth,
    getToken: async ({ skipCache }: { skipCache?: boolean }) =>
      auth.getToken({ template: 'convex', skipCache }),
  };
}

export function AppConvexProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useConvexClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
