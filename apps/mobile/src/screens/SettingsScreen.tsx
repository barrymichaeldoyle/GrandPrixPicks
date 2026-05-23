import { useClerk } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TimezonePickerModal } from '../components/settings/TimezonePickerModal';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHero } from '../components/ui/PageHero';
import { api } from '../integrations/convex/api';
import { usePushPermission } from '../lib/usePushPermission';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

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
  const { signOut } = useClerk();

  const me = useQuery(api.users.me, clerkEnabled && convexEnabled ? {} : 'skip');
  const updateProfile = useMutation(api.users.updateProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updateRegional = useMutation(api.users.updateRegionalSettings);
  const pushPermission = usePushPermission();
  const pushGranted = pushPermission.status === 'granted';

  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);

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
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSavingName(false);
    }
  }

  function toggleNotification(key: NotificationKey, value: boolean) {
    void Haptics.selectionAsync();
    updateNotifications({ [key]: value }).catch((err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Could not update',
        err instanceof Error ? err.message : 'Try again later.',
      );
    });
  }

  function handleTimezoneSelect(tz: string | null) {
    void Haptics.selectionAsync();
    updateRegional({ timezone: tz }).catch((err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Could not update timezone',
        err instanceof Error ? err.message : 'Try again later.',
      );
    });
  }

  function handleTimeFormatSelect(format: 'en-US' | 'en-GB') {
    if (format === currentTimeFormat) {
      return;
    }
    void Haptics.selectionAsync();
    updateRegional({ locale: format }).catch((err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Could not update time format',
        err instanceof Error ? err.message : 'Try again later.',
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

  if (me === undefined && clerkEnabled && convexEnabled) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <PageHero
        subtitle="Manage your profile, notifications, and account."
        title="Settings"
      />

      {/* Profile */}
      <SettingsSection title="Profile">
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display name</Text>
          {isEditingName ? (
            <View style={styles.editRow}>
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
                style={styles.input}
                value={displayName}
              />
              <Pressable
                disabled={isSavingName}
                onPress={() => {
                  setIsEditingName(false);
                  setDisplayName(me?.displayName ?? '');
                  setNameError(null);
                }}
                style={[styles.smallButton, styles.smallButtonGhost]}
              >
                <Text style={styles.smallButtonGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isSavingName}
                onPress={() => void handleSaveName()}
                style={[styles.smallButton, styles.smallButtonPrimary]}
              >
                {isSavingName ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.smallButtonPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.editRow}>
              <Text style={styles.fieldValue}>{me?.displayName ?? '—'}</Text>
              <Pressable
                onPress={() => setIsEditingName(true)}
                style={[styles.smallButton, styles.smallButtonGhost]}
              >
                <Text style={styles.smallButtonGhostText}>Edit</Text>
              </Pressable>
            </View>
          )}
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        {me?.username ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue}>@{me.username}</Text>
            <Text style={styles.fieldHelp}>Username changes require web.</Text>
          </View>
        ) : null}
      </SettingsSection>

      {/* Regional */}
      <SettingsSection title="Regional">
        <Pressable
          onPress={() => setTzPickerOpen(true)}
          style={styles.linkButton}
        >
          <View style={styles.linkButtonText}>
            <Text style={styles.fieldLabel}>Timezone</Text>
            <Text style={styles.fieldValue}>
              {(me?.timezone ?? deviceTz).replace(/_/g, ' ')}
            </Text>
            {!me?.timezone ? (
              <Text style={styles.fieldHelp}>Using device default</Text>
            ) : null}
          </View>
          <Ionicons
            color={colors.textMuted}
            name="chevron-forward"
            size={16}
          />
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Time format</Text>
          <View style={styles.segmentBar}>
            <Pressable
              onPress={() => handleTimeFormatSelect('en-US')}
              style={[
                styles.segment,
                currentTimeFormat === 'en-US' ? styles.segmentActive : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  currentTimeFormat === 'en-US'
                    ? styles.segmentTextActive
                    : null,
                ]}
              >
                12-hour
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTimeFormatSelect('en-GB')}
              style={[
                styles.segment,
                currentTimeFormat === 'en-GB' ? styles.segmentActive : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  currentTimeFormat === 'en-GB'
                    ? styles.segmentTextActive
                    : null,
                ]}
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
            if (granted) {
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
        <Pressable onPress={handleSignOut} style={styles.signOutRow}>
          <Ionicons color={colors.error} name="log-out-outline" size={18} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </SettingsSection>
    </ScrollView>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
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
    <View style={[styles.toggleRow, disabled ? styles.toggleRowDisabled : null]}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHelp}>{help}</Text>
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
      <View style={styles.permissionRow}>
        <View style={styles.permissionRowText}>
          <Text style={styles.permissionLabel}>System permission</Text>
          <Text style={styles.permissionHelp}>
            {status === 'loading' ? 'Checking…' : 'Granted'}
          </Text>
        </View>
        {status === 'granted' ? (
          <View style={styles.permissionBadge}>
            <Ionicons
              color={colors.success}
              name="checkmark-circle"
              size={14}
            />
            <Text style={styles.permissionBadgeText}>On</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const isDenied = status === 'denied';
  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionRowText}>
        <Text style={styles.permissionLabel}>System permission</Text>
        <Text style={styles.permissionHelp}>
          {isDenied
            ? 'Push notifications are disabled in iOS settings.'
            : 'Allow Grand Prix Picks to send push notifications.'}
        </Text>
      </View>
      <Pressable
        onPress={isDenied || !canAskAgain ? onOpenSettings : onRequest}
        style={styles.permissionAction}
      >
        <Text style={styles.permissionActionText}>
          {isDenied || !canAskAgain ? 'Open settings' : 'Allow'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  editRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  field: {
    gap: 6,
  },
  fieldHelp: {
    color: colors.textMuted,
    fontSize: 11,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  linkButtonText: {
    flex: 1,
    gap: 4,
  },
  permissionAction: {
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  permissionBadge: {
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  permissionBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  permissionHelp: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  permissionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
  },
  permissionRowText: {
    flex: 1,
    gap: 2,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.accentMuted,
  },
  segmentBar: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.accent,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  sectionBody: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  signOutRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  signOutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonGhost: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  smallButtonGhostText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  smallButtonPrimary: {
    backgroundColor: colors.buttonAccent,
  },
  smallButtonPrimaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleHelp: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
});
