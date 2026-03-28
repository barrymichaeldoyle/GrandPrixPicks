import { useClerk, useOAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalLinkButton } from '../components/ExternalLinkButton';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';
import { useTypography } from '../theme/typography';

WebBrowser.maybeCompleteAuthSession();

export function ProfileScreen() {
  const { clerkEnabled } = useMobileConfig();
  const { titleFontFamily } = useTypography();

  if (!clerkEnabled) {
    return (
      <View style={styles.screen}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          Profile
        </Text>
        <View style={styles.emptyCard}>
          <View style={styles.emptyHeaderRow}>
            <Ionicons
              color={colors.accentHover}
              name="information-circle-outline"
              size={18}
            />
            <Text style={styles.emptyTitle}>Sign-in not configured</Text>
          </View>
          <Text style={styles.body}>
            Add your Clerk publishable key in mobile env to enable account
            sign-in.
          </Text>
          <Text style={styles.envLabel}>Required env var</Text>
          <Text style={styles.envValue}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
          <ExternalLinkButton
            label="Open setup docs"
            url="https://clerk.com/docs/expo/getting-started/quickstart"
          />
        </View>
      </View>
    );
  }

  return <ClerkEnabledProfileScreen />;
}

function ClerkEnabledProfileScreen() {
  const { titleFontFamily } = useTypography();
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
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
      setStatus(error instanceof Error ? error.message : 'Sign-in failed');
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setStatus('Signed out');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sign-out failed');
    }
  }

  return (
    <View style={styles.screen}>
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Profile
      </Text>
      {isSignedIn ? (
        <>
          <Text style={styles.body}>
            Signed in as {user.primaryEmailAddress?.emailAddress ?? 'user'}.
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
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  emptyHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  envLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  envValue: {
    color: colors.accentHover,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  status: {
    color: colors.success,
    fontSize: 13,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
