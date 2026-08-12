import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { OfflineBanner } from './src/components/ui/OfflineBanner';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/providers/AppProviders';
import { Sentry, initSentry } from './src/lib/sentry';
import { View } from './src/tw';

// Initialise Sentry before React mounts so early errors are captured.
initSentry();

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
