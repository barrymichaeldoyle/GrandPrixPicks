import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { OfflineBanner } from './src/components/ui/OfflineBanner';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/providers/AppProviders';
import { Sentry, initSentry } from './src/lib/sentry';
import { View } from './src/tw';

// Initialise Sentry before React mounts so early errors are captured. This
// runs before `Sentry.wrap` below, which is evaluated when this module is.
//
// In dev there is usually no DSN, so `initSentry` returns without calling
// `Sentry.init` and the wrap logs "Sentry.wrap was called before Sentry.init".
// That warning is the missing DSN, not the ordering: with a DSN set, as every
// EAS build has, init runs first and the warning does not appear.
initSentry();

/*
 * Screenshot mode. A dev build parks a yellow LogBox banner across the bottom
 * of every screen, which is exactly where the tab bar is, so store screenshots
 * taken from a dev build are unusable without it. Off unless asked for, and
 * dev-only regardless.
 *
 *   EXPO_PUBLIC_SCREENSHOT_MODE=1 npx expo start --dev-client
 */
if (__DEV__ && process.env.EXPO_PUBLIC_SCREENSHOT_MODE) {
  LogBox.ignoreAllLogs(true);
}

function App() {
  return (
    <AppProviders>
      <View className="flex-1 bg-page">
        <StatusBar style="light" />
        {/* Inside the providers so it can read the Convex socket, above the
            navigator so it sits over every screen. */}
        <OfflineBanner />
        <AppErrorBoundary>
          <AppNavigator />
        </AppErrorBoundary>
      </View>
    </AppProviders>
  );
}

export default Sentry.wrap(App);
