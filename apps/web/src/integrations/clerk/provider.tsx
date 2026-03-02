import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import type { PropsWithChildren } from 'react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env.local file');
}

interface AppClerkProviderProps extends PropsWithChildren {
  /** When true, Clerk components use the dark theme. */
  darkMode?: boolean;
}

export function AppClerkProvider({
  children,
  darkMode = false,
}: AppClerkProviderProps) {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{ theme: darkMode ? dark : undefined }}
    >
      {children}
    </ClerkProvider>
  );
}
