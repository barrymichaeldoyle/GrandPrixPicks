import { getSessionsForWeekend } from "@grandprixpicks/shared/sessions";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grand Prix Picks Mobile</Text>
      <Text style={styles.subtitle}>
        Shared session count: {getSessionsForWeekend(true).length}
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#05070f",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
  },
});
