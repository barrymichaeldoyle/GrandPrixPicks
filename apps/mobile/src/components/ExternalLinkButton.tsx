import { Linking, Pressable, StyleSheet, Text } from "react-native";

import { colors, radii } from "../theme/tokens";

type ExternalLinkButtonProps = {
  label: string;
  url: string;
};

export function ExternalLinkButton({ label, url }: ExternalLinkButtonProps) {
  async function handlePress() {
    try {
      await Linking.openURL(url);
    } catch {
      // Ignore URL open failures in-app.
    }
  }

  return (
    <Pressable onPress={handlePress} style={styles.button}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 2,
    paddingVertical: 9,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
