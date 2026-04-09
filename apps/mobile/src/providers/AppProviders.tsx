import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MobileClerkProvider } from '../integrations/clerk/provider';
import { MobileConvexProvider } from '../integrations/convex/provider';
import { TypographyProvider } from '../theme/typography';
import { MobileConfigProvider } from './mobile-config';
import { NotificationsProvider } from './NotificationsProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileConfigProvider>
          <TypographyProvider>
            <MobileClerkProvider>
              <MobileConvexProvider>
                <NotificationsProvider />
                {children}
              </MobileConvexProvider>
            </MobileClerkProvider>
          </TypographyProvider>
        </MobileConfigProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
