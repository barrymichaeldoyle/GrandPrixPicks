import { ClerkProvider } from '@clerk/tanstack-react-start';
import { dark } from '@clerk/ui/themes';
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
      localization={{
        userProfile: {
          deletePage: {
            messageLine1:
              'Deleting your account will permanently remove all your data, including your predictions, scores, and profile.',
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
