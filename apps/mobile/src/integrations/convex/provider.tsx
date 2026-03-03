import { useAuth } from "@clerk/clerk-expo";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

import { useMobileConfig } from "../../providers/mobile-config";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient =
  typeof convexUrl === "string" && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;

export function MobileConvexProvider({ children }: { children: ReactNode }) {
  const { clerkEnabled, convexEnabled } = useMobileConfig();

  if (!convexEnabled || !convexClient) {
    return <>{children}</>;
  }

  if (clerkEnabled) {
    return (
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    );
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
