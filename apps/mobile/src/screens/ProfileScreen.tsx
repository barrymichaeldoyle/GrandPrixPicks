import { useClerk, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';
import { useTypography } from '../theme/typography';

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
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              color={colors.accentHover}
              name="information-circle-outline"
              size={18}
            />
            <Text style={styles.infoTitle}>Sign-in not configured</Text>
          </View>
          <Text style={styles.body}>
            Add your Clerk publishable key in mobile env to enable account
            sign-in.
          </Text>
        </View>
      </View>
    );
  }

  return <SignedInProfileScreen />;
}

function SignedInProfileScreen() {
  const { titleFontFamily } = useTypography();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSignOut() {
    try {
      await signOut();
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
      <Text style={styles.body}>
        {user?.primaryEmailAddress?.emailAddress ?? 'Signed in'}
      </Text>
      <Pressable onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  status: {
    color: colors.textMuted,
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
