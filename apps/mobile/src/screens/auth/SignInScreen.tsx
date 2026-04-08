import { useOAuth } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

WebBrowser.maybeCompleteAuthSession();

export function SignInScreen() {
  const { titleFontFamily } = useTypography();
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

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          GrandPrixPicks
        </Text>
        <Text style={styles.subtitle}>
          Predict the top 5 finishers every race weekend.
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={handleSignIn} style={styles.button}>
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  status: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
