import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import type { ReactNode } from "react";

import { useMobileConfig } from "../../providers/mobile-config";

export function MobileClerkProvider({ children }: { children: ReactNode }) {
  const { clerkEnabled, clerkPublishableKey } = useMobileConfig();

  if (!clerkEnabled || !clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
