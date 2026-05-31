import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MobileClerkProvider } from '../integrations/clerk/provider';
import { MobileConvexProvider } from '../integrations/convex/provider';
import { TypographyProvider } from '../theme/typography';
import { MobileConfigProvider } from './mobile-config';
import { NotificationsProvider } from './NotificationsProvider';
import { ToastProvider } from './ToastProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileConfigProvider>
          <TypographyProvider>
            <MobileClerkProvider>
              <MobileConvexProvider>
                <NotificationsProvider />
                <ToastProvider>{children}</ToastProvider>
              </MobileConvexProvider>
            </MobileClerkProvider>
          </TypographyProvider>
        </MobileConfigProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
