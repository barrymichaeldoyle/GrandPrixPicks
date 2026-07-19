import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';

import { PageHero } from '@/components/PageHero';
import { PageLoader } from '@/components/PageLoader';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { NotificationsSection } from './settings/-components/NotificationsSection';
import { ProfileSection } from './settings/-components/ProfileSection';
import { PurchaseSuccessBanner } from './settings/-components/PurchaseSuccessBanner';
import { RegionalSection } from './settings/-components/RegionalSection';
import { SeasonPassSection } from './settings/-components/SeasonPassSection';
import { SettingsPageSkeleton } from './settings/-components/SettingsPageSkeleton';
import { SignInRequired } from './settings/-components/SignInRequired';
import type { NotificationSettings } from './settings/-components/settingsTypes';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/settings')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { purchase?: 'success'; season?: number } => {
    const purchase = search.purchase === 'success' ? 'success' : undefined;
    const rawSeason = search.season;
    const parsedSeason =
      typeof rawSeason === 'string' ? Number(rawSeason) : undefined;
    const season =
      parsedSeason && Number.isInteger(parsedSeason) ? parsedSeason : undefined;

    return { purchase, season };
  },
  component: SettingsPage,
  head: () =>
    pageMeta({
      title: 'Settings | Grand Prix Picks',
      description: 'Manage your Grand Prix Picks account settings.',
      path: '/settings',
      noIndex: true,
    }),
});

const SEASON_PASS_SEASON = 2026;
const USERNAME_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const hasSeasonPassFor2026 = useQuery(
    api.users.hasSeasonPassForSeason,
    isSignedIn ? { season: SEASON_PASS_SEASON } : 'skip',
  );

  const purchaseSeason = search.season ?? SEASON_PASS_SEASON;
  const showPurchaseSuccess = search.purchase === 'success';
  const hasSeasonPassForPurchase = useQuery(
    api.users.hasSeasonPassForSeason,
    isSignedIn && showPurchaseSuccess && purchaseSeason !== SEASON_PASS_SEASON
      ? { season: purchaseSeason }
      : 'skip',
  );
  const hasPassForSuccessBanner =
    purchaseSeason === SEASON_PASS_SEASON
      ? hasSeasonPassFor2026
      : hasSeasonPassForPurchase;

  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateRegional = useMutation(api.users.updateRegionalSettings);

  const pushNotifications = usePushNotifications();
  const [optimisticNotificationSettings, setOptimisticNotificationSettings] =
    useState<Partial<NotificationSettings> | null>(null);
  const [optimisticTimezone, setOptimisticTimezone] = useState<
    string | null | undefined
  >(undefined);
  const [optimisticLocale, setOptimisticLocale] = useState<
    string | null | undefined
  >(undefined);

  const profileForm = useProfileForm({
    user: me,
    updateProfile,
    onUsernameChanged: (username) => {
      void navigate({
        to: '/p/$username',
        params: { username },
        search: { from: undefined, fromLabel: undefined },
      });
    },
  });

  const notificationSettings = resolveNotificationSettings(
    me,
    optimisticNotificationSettings,
  );
  const displayTimezone =
    optimisticTimezone !== undefined
      ? (optimisticTimezone ?? undefined)
      : me?.timezone;
  const displayLocale =
    optimisticLocale !== undefined
      ? (optimisticLocale ?? undefined)
      : me?.locale;

  useEffect(() => {
    if (
      optimisticTimezone !== undefined &&
      (me?.timezone === optimisticTimezone ||
        (me?.timezone === undefined && optimisticTimezone === null))
    ) {
      setOptimisticTimezone(undefined);
    }
  }, [optimisticTimezone, me?.timezone]);

  useEffect(() => {
    if (
      optimisticLocale !== undefined &&
      (me?.locale === optimisticLocale ||
        (me?.locale === undefined && optimisticLocale === null))
    ) {
      setOptimisticLocale(undefined);
    }
  }, [optimisticLocale, me?.locale]);

  function updateNotificationSetting(patch: Partial<NotificationSettings>) {
    setOptimisticNotificationSettings((prev) => ({ ...prev, ...patch }));
    void (async () => {
      try {
        const enablingPush =
          patch.pushPredictionReminders === true || patch.pushResults === true;
        if (enablingPush && !pushNotifications.isSubscribed) {
          await pushNotifications.subscribe();
        }
        await updateNotifications(patch);
      } catch {
        setOptimisticNotificationSettings(null);
      }
    })();
  }

  function updateRegionalSettings(settings: {
    timezone?: string | null;
    locale?: string | null;
  }) {
    if (settings.timezone !== undefined) {
      setOptimisticTimezone(settings.timezone);
    }
    if (settings.locale !== undefined) {
      setOptimisticLocale(settings.locale);
    }

    updateRegional(settings).catch(() => {
      if (settings.timezone !== undefined) {
        setOptimisticTimezone(undefined);
      }
      if (settings.locale !== undefined) {
        setOptimisticLocale(undefined);
      }
    });
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return <SignInRequired />;
  }

  if (me === undefined) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHero
          eyebrow="Account"
          title="Settings"
          subtitle="Manage your profile, privacy, and notification preferences."
        />

        {showPurchaseSuccess ? (
          <PurchaseSuccessBanner
            season={purchaseSeason}
            hasSeasonPass={hasPassForSuccessBanner}
            onDismiss={() => {
              void navigate({ to: '/settings', replace: true });
            }}
          />
        ) : null}

        <div className="space-y-6">
          <ProfileSection user={me} {...profileForm} />

          <SeasonPassSection
            season={SEASON_PASS_SEASON}
            hasSeasonPass={hasSeasonPassFor2026}
          />

          <RegionalSection
            timezone={displayTimezone}
            locale={displayLocale}
            loading={false}
            onUpdate={updateRegionalSettings}
          />

          <NotificationsSection
            settings={notificationSettings}
            isPushSupported={pushNotifications.isSupported}
            pushPermission={pushNotifications.permission}
            isPushSubscribed={pushNotifications.isSubscribed}
            isPushLoading={pushNotifications.isLoading}
            onSubscribePush={() => void pushNotifications.subscribe()}
            onUnsubscribePush={() => void pushNotifications.unsubscribe()}
            onUpdateSetting={updateNotificationSetting}
          />
        </div>
      </div>
    </div>
  );
}

function resolveNotificationSettings(
  user:
    | (Partial<NotificationSettings> & {
        timezone?: string | null;
        locale?: string | null;
      })
    | null
    | undefined,
  optimistic: Partial<NotificationSettings> | null,
): NotificationSettings {
  return {
    emailPredictionReminders:
      optimistic?.emailPredictionReminders ??
      user?.emailPredictionReminders ??
      true,
    emailResults: optimistic?.emailResults ?? user?.emailResults ?? true,
    pushPredictionReminders:
      optimistic?.pushPredictionReminders ??
      user?.pushPredictionReminders ??
      true,
    pushPredictionLockReminders:
      optimistic?.pushPredictionLockReminders ??
      user?.pushPredictionLockReminders ??
      true,
    pushResults: optimistic?.pushResults ?? user?.pushResults ?? true,
    pushSessionLocked:
      optimistic?.pushSessionLocked ?? user?.pushSessionLocked ?? true,
    pushRevReceived:
      optimistic?.pushRevReceived ?? user?.pushRevReceived ?? true,
  };
}

function useProfileForm({
  user,
  updateProfile,
  onUsernameChanged,
}: {
  user:
    | {
        displayName?: string | null;
        username?: string | null;
        usernameChangedAt?: number | null;
      }
    | null
    | undefined;
  updateProfile: (args: {
    displayName: string;
    username?: string;
  }) => Promise<unknown>;
  onUsernameChanged: (username: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);

  const usernameCooldownUntil = user?.usernameChangedAt
    ? user.usernameChangedAt + USERNAME_COOLDOWN_MS
    : null;
  const isUsernameLocked =
    usernameCooldownUntil !== null && Date.now() < usernameCooldownUntil;

  function onStartEditing() {
    setDisplayName(user?.displayName ?? '');
    setUsername(user?.username ?? '');
    setError(null);
    setShowUsernameConfirm(false);
    setIsEditing(true);
  }

  function onCancelEditing() {
    setIsEditing(false);
    setError(null);
    setShowUsernameConfirm(false);
  }

  function onUsernameChange(value: string) {
    setUsername(value);
    setShowUsernameConfirm(false);
  }

  async function onSave() {
    const trimmedUsername = username.trim().toLowerCase();
    const usernameChanged = trimmedUsername !== (user?.username ?? '');

    if (usernameChanged && !showUsernameConfirm) {
      setShowUsernameConfirm(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateProfile({
        displayName,
        ...(usernameChanged ? { username: trimmedUsername } : {}),
      });
      setIsEditing(false);
      setShowUsernameConfirm(false);

      if (usernameChanged) {
        onUsernameChanged(trimmedUsername);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? toUserFacingMessage(caught)
          : 'Failed to update profile',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isEditing,
    displayName,
    username,
    usernameCooldownUntil,
    isUsernameLocked,
    showUsernameConfirm,
    isSubmitting,
    error,
    onStartEditing,
    onCancelEditing,
    onDisplayNameChange: setDisplayName,
    onUsernameChange,
    onSave,
  };
}
