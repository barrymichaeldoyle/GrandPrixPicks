import { useAuth } from '@clerk/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { PropsWithChildren } from 'react';

import { convex } from './client';

export function AppConvexProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
