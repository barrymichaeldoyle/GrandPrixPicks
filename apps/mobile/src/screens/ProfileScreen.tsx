import { useClerk, useOAuth, useUser } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMobileConfig } from "../providers/mobile-config";

WebBrowser.maybeCompleteAuthSession();

export function ProfileScreen() {
  const { clerkEnabled } = useMobileConfig();
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [status, setStatus] = useState<string | null>(null);

  async function handleSignIn() {
    try {
      setStatus(null);
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in failed");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setStatus("Signed out");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-out failed");
    }
  }

  if (!clerkEnabled) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>
          Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to enable account sign-in.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      {isSignedIn ? (
        <>
          <Text style={styles.body}>
            Signed in as {user.primaryEmailAddress?.emailAddress ?? "user"}.
          </Text>
          <Pressable onPress={handleSignOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.body}>Sign in to sync picks with Convex.</Text>
          <Pressable onPress={handleSignIn} style={styles.button}>
            <Text style={styles.buttonText}>Sign In With Google</Text>
          </Pressable>
        </>
      )}
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#2b4da9",
    borderRadius: 12,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    color: "#b5c0da",
    fontSize: 16,
    lineHeight: 24,
  },
  screen: {
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
  },
  status: {
    color: "#9be5b2",
    fontSize: 13,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
});
