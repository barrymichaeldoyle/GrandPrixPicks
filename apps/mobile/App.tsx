import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/providers/AppProviders';
import { Sentry, initSentry } from './src/lib/sentry';
import { colors } from './src/theme/tokens';

// Initialise Sentry before React mounts so early errors are captured.
initSentry();

function App() {
  return (
    <AppProviders>
      <View style={styles.app}>
        <StatusBar style="light" />
        <AppNavigator />
      </View>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: colors.page,
    flex: 1,
  },
});

export default Sentry.wrap(App);
