import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

type MobileConfig = {
  clerkEnabled: boolean;
  clerkPublishableKey: string | null;
  convexEnabled: boolean;
  convexUrl: string | null;
};

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? null;

const config: MobileConfig = {
  clerkEnabled:
    typeof clerkPublishableKey === 'string' && clerkPublishableKey.length > 0,
  clerkPublishableKey,
  convexEnabled: typeof convexUrl === 'string' && convexUrl.length > 0,
  convexUrl,
};

const MobileConfigContext = createContext<MobileConfig>(config);

export function MobileConfigProvider({ children }: { children: ReactNode }) {
  return (
    <MobileConfigContext.Provider value={config}>
      {children}
    </MobileConfigContext.Provider>
  );
}

export function useMobileConfig() {
  return useContext(MobileConfigContext);
}
