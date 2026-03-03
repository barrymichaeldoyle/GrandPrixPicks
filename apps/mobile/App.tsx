import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { AppProviders } from "./src/providers/AppProviders";
import { colors } from "./src/theme/tokens";

export default function App() {
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
