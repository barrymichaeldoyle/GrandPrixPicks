import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { useSignOutWithCleanup } from '../hooks/useSignOutWithCleanup';
import { captureAnalyticsEvent } from '../lib/analytics';
import type { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/tokens';
import { Pressable, ScrollView, Text, View } from '../tw';
import { useIsSignedIn } from '../lib/useIsSignedIn';

const SITE_URL = 'https://grandprixpicks.com';

export function MoreScreen() {
  const navigation = useNavigation<NavigationProp<MoreStackParamList>>();
  const signOut = useSignOutWithCleanup();

  const isSignedIn = useIsSignedIn();

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
    <View className="flex-1 bg-page">
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4 pb-8">
        <View className="gap-2.5">
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Account
          </Text>
          <View>
            <LinkRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              subtitle="Results, locks, and reactions"
            />
            <View className="ml-[30px] h-px bg-border" />
            <LinkRow
              icon="settings-outline"
              label="Settings"
              onPress={() => navigation.navigate('Settings')}
              subtitle="Profile, notifications, timezone"
            />
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Leagues
          </Text>
          <View>
            <LinkRow
              icon="people-outline"
              label="Leagues are managed on the web"
              onPress={() => {
                captureAnalyticsEvent('leagues_web_handoff_opened');
                openOnWeb('/leagues');
              }}
              subtitle="Open your leagues at grandprixpicks.com"
            />
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Help &amp; legal
          </Text>
          <View>
            <LinkRow
              icon="help-buoy-outline"
              label="Support"
              onPress={() => openOnWeb('/support')}
              subtitle="Get help or report a problem"
            />
            <View className="ml-[30px] h-px bg-border" />
            <LinkRow
              icon="shield-checkmark-outline"
              label="Privacy policy"
              onPress={() => openOnWeb('/privacy')}
              subtitle="How your data is handled"
            />
            <View className="ml-[30px] h-px bg-border" />
            <LinkRow
              icon="document-text-outline"
              label="Terms of service"
              onPress={() => openOnWeb('/terms')}
              subtitle="The rules of the game"
            />
          </View>
        </View>

        {/* Signed out this offered "Sign out", which is both wrong and the
            only route back to an account from here now that the tabs are not
            gated. */}
        {isSignedIn ? (
          <Pressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 self-center py-2 active:opacity-70"
            hitSlop={8}
            onPress={confirmSignOut}
          >
            <Ionicons
              color={colors.textMuted}
              name="log-out-outline"
              size={14}
            />
            <Text className="text-muted text-xs font-semibold">Sign out</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Sign in or create an account"
            accessibilityRole="button"
            className="self-center rounded-sm bg-accent px-4 py-2.5 active:bg-accent-press"
            onPress={() => {
              // @ts-expect-error the sign-in sheet lives on the root stack.
              navigation.navigate('SignIn');
            }}
          >
            <Text className="text-[13px] font-bold text-text-on-accent">
              Sign in or create an account
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
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
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 py-3 active:opacity-70"
      onPress={onPress}
    >
      <Ionicons color={colors.accent} name={icon} size={18} />
      <View className="flex-1">
        <Text className="text-foreground text-[15px] font-semibold">
          {label}
        </Text>
        <Text className="text-muted mt-px text-xs">{subtitle}</Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
    </Pressable>
  );
}
