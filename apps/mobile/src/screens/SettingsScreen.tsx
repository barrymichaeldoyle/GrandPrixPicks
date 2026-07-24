import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { TimezonePickerModal } from '../components/settings/TimezonePickerModal';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useSignOutWithCleanup } from '../hooks/useSignOutWithCleanup';
import { api } from '../integrations/convex/api';
import { captureAnalyticsEvent } from '../lib/analytics';
import { obtainExpoPushToken } from '../lib/pushRegistration';
import { usePushPermission } from '../lib/usePushPermission';
import { useMobileConfig } from '../providers/mobile-config';
import { useToast } from '../providers/ToastProvider';
import { colors } from '../theme/tokens';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from '../tw';

type NotificationKey =
  | 'pushPredictionReminders'
  | 'pushPredictionLockReminders'
  | 'pushResults'
  | 'pushSessionLocked'
  | 'pushRevReceived'
  | 'emailPredictionReminders'
  | 'emailResults';

const PUSH_TOGGLES: { key: NotificationKey; label: string; help: string }[] = [
  {
    key: 'pushPredictionReminders',
    label: 'Prediction reminders',
    help: 'Heads-up when picks are open for the next weekend.',
  },
  {
    key: 'pushPredictionLockReminders',
    label: 'Lock reminders',
    help: 'A nudge an hour before a session locks.',
  },
  {
    key: 'pushResults',
    label: 'Results published',
    help: 'When your session score is final.',
  },
  {
    key: 'pushSessionLocked',
    label: 'Session locked',
    help: 'When a session you predicted locks.',
  },
  {
    key: 'pushRevReceived',
    label: 'Revs from others',
    help: 'When someone revs one of your picks.',
  },
];

const EMAIL_TOGGLES: { key: NotificationKey; label: string; help: string }[] = [
  {
    key: 'emailPredictionReminders',
    label: 'Prediction reminders',
    help: 'Weekend opening + closing emails.',
  },
  {
    key: 'emailResults',
    label: 'Results published',
    help: 'Your scoring summary after each race.',
  },
];

export function SettingsScreen() {
  const { clerkEnabled, convexEnabled } = useMobileConfig();
  const signOut = useSignOutWithCleanup();
  const deleteAccount = useDeleteAccount();
  const { showToast } = useToast();

  const me = useQuery(
    api.users.me,
    clerkEnabled && convexEnabled ? {} : 'skip',
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updateRegional = useMutation(api.users.updateRegionalSettings);
  const saveExpoPushToken = useMutation(api.push.saveExpoPushToken);
  const pushPermission = usePushPermission();
  const pushGranted = pushPermission.status === 'granted';

  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const detectedLocaleHour12 = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
      }).resolvedOptions().hour12;
    } catch {
      return false;
    }
  })();
  const defaultTimeFormat: 'en-US' | 'en-GB' = detectedLocaleHour12
    ? 'en-US'
    : 'en-GB';
  const currentTimeFormat: 'en-US' | 'en-GB' = (() => {
    if (!me?.locale) {
      return defaultTimeFormat;
    }
    if (me.locale === 'en-US' || me.locale === 'en-GB') {
      return me.locale;
    }
    try {
      return new Intl.DateTimeFormat(me.locale, {
        hour: '2-digit',
      }).resolvedOptions().hour12
        ? 'en-US'
        : 'en-GB';
    } catch {
      return 'en-GB';
    }
  })();

  useEffect(() => {
    if (me?.displayName && !isEditingName) {
      setDisplayName(me.displayName);
    }
  }, [me?.displayName, isEditingName]);

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (trimmed.length < 1) {
      setNameError('Display name cannot be empty.');
      return;
    }
    setIsSavingName(true);
    setNameError(null);
    try {
      await updateProfile({ displayName: trimmed });
      setIsEditingName(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Display name saved', 'success');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSavingName(false);
    }
  }

  function toggleNotification(key: NotificationKey, value: boolean) {
    void Haptics.selectionAsync();
    captureAnalyticsEvent('notification_setting_changed', {
      setting: key,
      enabled: value,
    });
    updateNotifications({ [key]: value }).catch((err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        err instanceof Error ? err.message : 'Could not update setting',
        'error',
      );
    });
  }

  function handleTimezoneSelect(tz: string | null) {
    void Haptics.selectionAsync();
    updateRegional({ timezone: tz })
      .then(() => {
        showToast('Timezone updated', 'success');
      })
      .catch((err) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(
          err instanceof Error ? err.message : 'Could not update timezone',
          'error',
        );
      });
  }

  function handleTimeFormatSelect(format: 'en-US' | 'en-GB') {
    if (format === currentTimeFormat) {
      return;
    }
    void Haptics.selectionAsync();
    updateRegional({ locale: format })
      .then(() => {
        showToast(
          `Time format set to ${format === 'en-US' ? '12-hour' : '24-hour'}`,
          'success',
        );
      })
      .catch((err) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(
          err instanceof Error ? err.message : 'Could not update time format',
          'error',
        );
      });
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Sign out of Grand Prix Picks?', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Sign out',
        onPress: () => void signOut(),
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, including every pick, score, league membership, and follower. This cannot be undone.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete forever',
          onPress: () => {
            setIsDeletingAccount(true);
            deleteAccount()
              .catch((err: unknown) => {
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                showToast(
                  err instanceof Error
                    ? err.message
                    : 'Could not delete your account. Please try again.',
                  'error',
                );
              })
              .finally(() => {
                setIsDeletingAccount(false);
              });
          },
        },
      ],
    );
  }

  if (me === undefined && clerkEnabled && convexEnabled) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="gap-[26px] px-4 pb-8 pt-3"
    >
      <View className="mb-1 gap-1">
        <Text className="text-[10px] font-extrabold text-accent uppercase">
          Settings
        </Text>
        <Text className="text-foreground text-2xl font-extrabold">Account</Text>
      </View>

      {/* Profile */}
      <SettingsSection title="Profile">
        <View className="gap-1.5">
          <Text className="text-muted text-[11px] font-bold uppercase">
            Display name
          </Text>
          {isEditingName ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                autoFocus
                editable={!isSavingName}
                maxLength={50}
                onChangeText={(v) => {
                  setDisplayName(v);
                  setNameError(null);
                }}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                className="text-foreground flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-[15px]"
                value={displayName}
              />
              <Pressable
                disabled={isSavingName}
                onPress={() => {
                  setIsEditingName(false);
                  setDisplayName(me?.displayName ?? '');
                  setNameError(null);
                }}
                className="items-center rounded-md border border-border px-3 py-2"
              >
                <Text className="text-foreground text-[13px] font-bold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={isSavingName}
                onPress={() => void handleSaveName()}
                className="items-center rounded-md bg-button-accent px-3 py-2"
              >
                {isSavingName ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text className="text-foreground text-[13px] font-bold">
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-foreground flex-1 text-[15px] font-semibold">
                {me?.displayName ?? '—'}
              </Text>
              <Pressable
                onPress={() => setIsEditingName(true)}
                className="items-center rounded-md border border-border px-3 py-2"
              >
                <Text className="text-foreground text-[13px] font-bold">
                  Edit
                </Text>
              </Pressable>
            </View>
          )}
          {nameError ? (
            <Text className="text-xs text-error">{nameError}</Text>
          ) : null}
        </View>

        {me?.username ? (
          <View className="gap-1.5">
            <Text className="text-muted text-[11px] font-bold uppercase">
              Username
            </Text>
            <Text className="text-foreground flex-1 text-[15px] font-semibold">
              @{me.username}
            </Text>
            <Text className="text-muted text-[11px]">
              Username changes require web.
            </Text>
          </View>
        ) : null}
      </SettingsSection>

      {/* Regional */}
      <SettingsSection title="Regional">
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => setTzPickerOpen(true)}
        >
          <View className="flex-1 gap-1">
            <Text className="text-muted text-[11px] font-bold uppercase">
              Timezone
            </Text>
            <Text className="text-foreground flex-1 text-[15px] font-semibold">
              {(me?.timezone ?? deviceTz).replace(/_/g, ' ')}
            </Text>
            {!me?.timezone ? (
              <Text className="text-muted text-[11px]">
                Using device default
              </Text>
            ) : null}
          </View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>

        <View className="gap-1.5">
          <Text className="text-muted text-[11px] font-bold uppercase">
            Time format
          </Text>
          <View className="flex-row rounded-md border border-border bg-surface-elevated p-[3px]">
            <Pressable
              onPress={() => handleTimeFormatSelect('en-US')}
              className={`flex-1 items-center rounded-md py-2 ${currentTimeFormat === 'en-US' ? 'bg-accent-muted' : ''}`}
            >
              <Text
                className={`text-[13px] font-bold ${currentTimeFormat === 'en-US' ? 'text-accent' : 'text-muted'}`}
              >
                12-hour
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTimeFormatSelect('en-GB')}
              className={`flex-1 items-center rounded-md py-2 ${currentTimeFormat === 'en-GB' ? 'bg-accent-muted' : ''}`}
            >
              <Text
                className={`text-[13px] font-bold ${currentTimeFormat === 'en-GB' ? 'text-accent' : 'text-muted'}`}
              >
                24-hour
              </Text>
            </Pressable>
          </View>
        </View>
      </SettingsSection>

      <TimezonePickerModal
        currentValue={me?.timezone ?? undefined}
        onClose={() => setTzPickerOpen(false)}
        onSelect={handleTimezoneSelect}
        visible={tzPickerOpen}
      />

      {/* Push */}
      <SettingsSection title="Push notifications">
        <PushPermissionRow
          canAskAgain={pushPermission.canAskAgain}
          onOpenSettings={pushPermission.openSystemSettings}
          onRequest={async () => {
            void Haptics.selectionAsync();
            const granted = await pushPermission.requestPermission();
            captureAnalyticsEvent('push_permission_result', {
              granted,
              source: 'settings',
            });
            if (granted) {
              const token = await obtainExpoPushToken();
              if (token) {
                await saveExpoPushToken({ token }).catch((err: unknown) => {
                  console.warn('[settings] saveExpoPushToken failed', err);
                });
              }
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
          }}
          status={pushPermission.status}
        />
        {PUSH_TOGGLES.map((toggle) => (
          <NotificationToggleRow
            disabled={!pushGranted}
            help={toggle.help}
            key={toggle.key}
            label={toggle.label}
            onValueChange={(value) => toggleNotification(toggle.key, value)}
            value={Boolean(me?.[toggle.key as keyof typeof me] ?? true)}
          />
        ))}
      </SettingsSection>

      {/* Email */}
      <SettingsSection title="Email">
        {EMAIL_TOGGLES.map((toggle) => (
          <NotificationToggleRow
            key={toggle.key}
            help={toggle.help}
            label={toggle.label}
            onValueChange={(value) => toggleNotification(toggle.key, value)}
            value={Boolean(me?.[toggle.key as keyof typeof me] ?? true)}
          />
        ))}
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account">
        <Pressable
          className="flex-row items-center gap-2.5"
          onPress={handleSignOut}
        >
          <Ionicons color={colors.error} name="log-out-outline" size={18} />
          <Text className="text-[15px] font-bold text-error">Sign out</Text>
        </Pressable>
        <View className="my-3 h-px bg-border" />
        <View className="gap-1.5">
          <Pressable
            className="flex-row items-center gap-2.5"
            disabled={isDeletingAccount}
            onPress={handleDeleteAccount}
          >
            <Ionicons color={colors.error} name="trash-outline" size={18} />
            <Text className="text-[15px] font-bold text-error">
              {isDeletingAccount ? 'Deleting account…' : 'Delete account'}
            </Text>
          </Pressable>
          <Text className="text-muted text-[11px] leading-[15px]">
            Permanently removes your account and all picks, scores, and
            followers. This cannot be undone.
          </Text>
        </View>
      </SettingsSection>

      <VersionFooter />
    </ScrollView>
  );
}

function VersionFooter() {
  const version = Constants.expoConfig?.version ?? '—';
  const nativeBuild =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : String(Constants.expoConfig?.android?.versionCode ?? '');
  const channel = (
    Constants.expoConfig?.extra as { eas?: { channel?: string } } | undefined
  )?.eas?.channel;
  const parts = [
    `v${version}`,
    nativeBuild ? `(${nativeBuild})` : null,
    channel ? `· ${channel}` : null,
  ].filter(Boolean);
  return (
    <Text className="text-muted pt-2 text-center text-[11px]">
      Grand Prix Picks {parts.join(' ')}
    </Text>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // Insert hairline dividers between children
  const items = Array.isArray(children) ? children : [children];
  const withDividers: React.ReactNode[] = [];
  items.forEach((child, i) => {
    if (child == null || child === false) {
      return;
    }
    if (withDividers.length > 0) {
      withDividers.push(
        <View className="my-3 h-px bg-border" key={`d-${i}`} />,
      );
    }
    withDividers.push(child);
  });
  return (
    <View className="gap-2.5">
      <Text className="text-muted pb-0.5 text-[10px] font-extrabold uppercase">
        {title}
      </Text>
      <View>{withDividers}</View>
    </View>
  );
}

function NotificationToggleRow({
  label,
  help,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  help: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between gap-3 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-semibold">{label}</Text>
        <Text className="text-muted text-[11px] leading-[15px]">{help}</Text>
      </View>
      <Switch
        disabled={disabled}
        ios_backgroundColor={colors.surfaceMuted}
        onValueChange={onValueChange}
        thumbColor={value && !disabled ? colors.accentHover : colors.text}
        trackColor={{ false: colors.surfaceMuted, true: colors.buttonAccent }}
        value={value}
      />
    </View>
  );
}

function PushPermissionRow({
  status,
  canAskAgain,
  onRequest,
  onOpenSettings,
}: {
  status: 'loading' | 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  onRequest: () => void;
  onOpenSettings: () => void;
}) {
  if (status === 'loading' || status === 'granted') {
    return (
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-sm font-semibold">
            System permission
          </Text>
          <Text className="text-muted text-[11px] leading-[15px]">
            {status === 'loading' ? 'Checking…' : 'Granted'}
          </Text>
        </View>
        {status === 'granted' ? (
          <View className="flex-row items-center gap-1 rounded-full border border-success/35 bg-success-muted px-2 py-[3px]">
            <Ionicons
              color={colors.success}
              name="checkmark-circle"
              size={14}
            />
            <Text className="text-[11px] font-extrabold text-success">On</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const isDenied = status === 'denied';
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-semibold">
          System permission
        </Text>
        <Text className="text-muted text-[11px] leading-[15px]">
          {isDenied
            ? 'Push notifications are disabled in iOS settings.'
            : 'Allow Grand Prix Picks to send push notifications.'}
        </Text>
      </View>
      <Pressable
        className="rounded-md bg-button-accent px-3 py-2"
        onPress={isDenied || !canAskAgain ? onOpenSettings : onRequest}
      >
        <Text className="text-foreground text-[13px] font-bold">
          {isDenied || !canAskAgain ? 'Open settings' : 'Allow'}
        </Text>
      </Pressable>
    </View>
  );
}
