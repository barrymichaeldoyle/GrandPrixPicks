import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSignOutWithCleanup } from '../hooks/useSignOutWithCleanup';
import { colors } from '../theme/tokens';
import type { MoreStackParamList } from '../navigation/types';

const SITE_URL = 'https://grandprixpicks.com';

const HAIRLINE = StyleSheet.hairlineWidth;

export function MoreScreen() {
  const navigation = useNavigation<NavigationProp<MoreStackParamList>>();
  const signOut = useSignOutWithCleanup();

  function openOnWeb(path: string) {
    void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => void signOut(),
        style: 'destructive',
        text: 'Sign out',
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Account</Text>
        <View>
          <LinkRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            subtitle="Results, locks, and Revs"
          />
          <View style={styles.divider} />
          <LinkRow
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            subtitle="Profile, notifications, timezone"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Leagues</Text>
        <View>
          <LinkRow
            icon="people-outline"
            label="Leagues are managed on the web"
            onPress={() => openOnWeb('/leagues')}
            subtitle="Open your leagues at grandprixpicks.com"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Help &amp; legal</Text>
        <View>
          <LinkRow
            icon="help-buoy-outline"
            label="Support"
            onPress={() => openOnWeb('/support')}
            subtitle="Get help or report a problem"
          />
          <View style={styles.divider} />
          <LinkRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => openOnWeb('/privacy')}
            subtitle="How your data is handled"
          />
          <View style={styles.divider} />
          <LinkRow
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => openOnWeb('/terms')}
            subtitle="The rules of the game"
          />
        </View>
      </View>

      <Pressable
        hitSlop={8}
        onPress={confirmSignOut}
        style={styles.signOutLink}
      >
        <Ionicons color={colors.textMuted} name="log-out-outline" size={14} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function LinkRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Ionicons color={colors.accent} name={icon} size={18} />
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    padding: 16,
    paddingBottom: 32,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 30,
  },
  linkLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  linkSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  linkText: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  signOutLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
