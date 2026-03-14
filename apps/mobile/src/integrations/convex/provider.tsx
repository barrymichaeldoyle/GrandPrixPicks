import { useAuth } from '@clerk/clerk-expo';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

import { useMobileConfig } from "../../providers/mobile-config";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient =
  typeof convexUrl === "string" && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;
const fallbackConvexClient = new ConvexReactClient(
  "https://placeholder.convex.cloud",
);

function useConvexClerkAuth() {
  const auth = useAuth();

  return {
    ...auth,
    getToken: async ({ skipCache }: { skipCache?: boolean }) =>
      auth.getToken({ template: "convex", skipCache }),
  };
}

export function MobileConvexProvider({ children }: { children: ReactNode }) {
  const { clerkEnabled, convexEnabled } = useMobileConfig();
  const activeClient =
    convexEnabled && convexClient ? convexClient : fallbackConvexClient;

  if (clerkEnabled && convexEnabled && convexClient) {
    return (
      <ConvexProviderWithClerk client={activeClient} useAuth={useConvexClerkAuth}>
        {children}
      </ConvexProviderWithClerk>
    );
  }

  return <ConvexProvider client={activeClient}>{children}</ConvexProvider>;
}
