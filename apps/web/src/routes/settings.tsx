import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  Globe,
  LoaderCircle,
  LogIn,
  Moon,
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { PageLoader } from '../components/PageLoader';
import { SettingsSection } from '../components/SettingsSection';
import { TimeFormatSelect } from '../components/TimeFormatSelect';
import { TimezoneSelect } from '../components/TimezoneSelect';
import { useTheme } from '../hooks/useTheme';
import { formatCalendarDate } from '../lib/date';
import { canonicalMeta, defaultOgImage } from '../lib/site';

function ToggleSwitch({
  checked,
  onChange,
  loading = false,
}: {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        aria-hidden
        className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted"
      />
    );
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
        checked ? 'bg-accent' : 'bg-surface-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

type NotificationChannel = 'none' | 'email' | 'push' | 'both';

const notificationChannelOptions: {
  label: string;
  value: NotificationChannel;
}[] = [
  { label: 'None', value: 'none' },
  { label: 'Email', value: 'email' },
  { label: 'App', value: 'push' },
  { label: 'Both', value: 'both' },
];

function NotificationChannelItem({
  label,
  description,
  value,
  onChange,
  disabledValues = [],
  options = notificationChannelOptions,
}: {
  label: string;
  description: string;
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
  disabledValues?: NotificationChannel[];
  options?: {
    label: string;
    value: NotificationChannel;
  }[];
}) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div>
        <p className="font-medium text-text">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <div className="inline-flex w-full max-w-sm rounded-lg border border-border bg-surface p-1">
        {options.map((option) => {
          const isActive = option.value === value;
          const isDisabled = disabledValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-button-accent text-white'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => onChange(option.value)}
              disabled={isDisabled}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegionalSection({
  timezone,
  locale,
  loading,
  onUpdate,
}: {
  timezone?: string;
  locale?: string;
  loading: boolean;
  onUpdate: (settings: {
    timezone?: string | null;
    locale?: string | null;
  }) => void;
}) {
  const displayTimezone =
    timezone ??
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');

  function handleTimezoneChange(value: string | undefined) {
    onUpdate({ timezone: value === undefined ? null : value });
  }

  function handleLocaleChange(value: string | undefined) {
    onUpdate({ locale: value === undefined ? null : value });
  }

  return (
    <SettingsSection
      id="regional"
      title="Regional"
      icon={<Globe className="h-5 w-5 text-text-muted" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          The app always uses your browser&apos;s timezone and time format.
          <br />
          These settings only affect how times appear in email notifications.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-text">
                    Timezone
                  </label>
                  <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text">
                  Time format
                </label>
                <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
              </div>
            </>
          ) : (
            <>
              <TimezoneSelect
                value={timezone}
                onChange={handleTimezoneChange}
              />
              <TimeFormatSelect
                value={locale}
                timezone={displayTimezone}
                onChange={handleLocaleChange}
              />
            </>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

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
  head: () => {
    const title = 'Settings | Grand Prix Picks';
    const description = 'Manage your Grand Prix Picks account settings.';
    const canonical = canonicalMeta('/settings');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

const USERNAME_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function channelFromLegacyFlags(
  emailEnabled: boolean | undefined,
  pushEnabled: boolean | undefined,
): NotificationChannel {
  const email = emailEnabled ?? true;
  const push = pushEnabled ?? true;
  if (email && push) {
    return 'both';
  }
  if (email) {
    return 'email';
  }
  if (push) {
    return 'push';
  }
  return 'none';
}

function channelIncludesPush(channel: NotificationChannel): boolean {
  return channel === 'push' || channel === 'both';
}

function stripPushFromChannel(
  channel: NotificationChannel,
): NotificationChannel {
  if (channel === 'both') {
    return 'email';
  }
  if (channel === 'push') {
    return 'none';
  }
  return channel;
}

function SeasonPassSection({
  season,
  hasSeasonPass,
}: {
  season: number;
  hasSeasonPass: boolean | undefined;
}) {
  const isLoading = hasSeasonPass === undefined;
  const isActive = hasSeasonPass === true;

  return (
    <SettingsSection
      id="season-pass"
      title="Season Pass"
      icon={<Ticket className="h-5 w-5 text-text-muted" />}
      headerRight={
        isActive ? (
          <Link
            to="/leagues"
            className="text-sm font-medium text-accent hover:underline"
          >
            Manage leagues
          </Link>
        ) : null
      }
    >
      {isActive ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-success">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-text">Active for {season}</p>
              <p className="text-sm text-text-muted">
                Your season pass is active. Unlimited league joins and public
                league creation are unlocked.
              </p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-9 w-52 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Upgrade to unlock unlimited league joins and public league creation
            for the full {season} season.
          </p>
          <Button asChild size="sm" rightIcon={ArrowRight}>
            <Link to="/pricing">See Season Pass Pricing</Link>
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="mb-6 h-9 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="space-y-6">
          <SettingsSection
            id="profile"
            title="Profile"
            icon={<User className="h-5 w-5 text-text-muted" />}
          >
            <div className="flex animate-pulse items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-surface-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-surface-muted" />
                <div className="h-3 w-24 rounded bg-surface-muted" />
              </div>
            </div>
          </SettingsSection>

          <SeasonPassSection season={2026} hasSeasonPass={undefined} />

          <SettingsSection
            id="privacy"
            title="Privacy"
            icon={<Eye className="h-5 w-5 text-text-muted" />}
          >
            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <div className="mb-2 h-4 w-52 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-72 max-w-full animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted" />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Regional"
            icon={<Globe className="h-5 w-5 text-text-muted" />}
          >
            <div className="min-h-[170px] space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-80 max-w-full animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-64 max-w-full animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                  <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                  <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            icon={<Bell className="h-5 w-5 text-text-muted" />}
            contentClassName="divide-y divide-border px-4"
          >
            <div className="flex min-h-[74px] items-center justify-between gap-4 py-4">
              <div>
                <div className="mb-2 h-4 w-48 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-72 max-w-full animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted" />
            </div>
            <div className="flex min-h-[74px] items-center justify-between gap-4 py-4">
              <div>
                <div className="mb-2 h-4 w-44 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-72 max-w-full animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted" />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const seasonPassSeason = 2026;
  const purchaseSeason = search.season ?? seasonPassSeason;
  const showPurchaseSuccess = search.purchase === 'success';
  const hasSeasonPassFor2026 = useQuery(
    api.users.hasSeasonPassForSeason,
    isSignedIn ? { season: seasonPassSeason } : 'skip',
  );
  const hasSeasonPassForPurchase = useQuery(
    api.users.hasSeasonPassForSeason,
    isSignedIn && showPurchaseSuccess && purchaseSeason !== seasonPassSeason
      ? { season: purchaseSeason }
      : 'skip',
  );
  const hasPassForSuccessBanner =
    purchaseSeason === seasonPassSeason
      ? hasSeasonPassFor2026
      : hasSeasonPassForPurchase;
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateRegional = useMutation(api.users.updateRegionalSettings);
  const { isDark, setTheme } = useTheme();

  // Push notifications
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  const initialPredictionChannel = me
    ? (me.predictionReminderChannel ??
      channelFromLegacyFlags(me.emailReminders, me.pushReminders))
    : 'both';
  const initialResultsChannel = me
    ? (me.resultsNotificationChannel ??
      channelFromLegacyFlags(me.emailResults, me.pushResults))
    : 'both';

  const [optimisticPredictionChannel, setOptimisticPredictionChannel] =
    useState<NotificationChannel | null>(null);
  const [optimisticResultsChannel, setOptimisticResultsChannel] =
    useState<NotificationChannel | null>(null);

  const predictionChannel =
    optimisticPredictionChannel ?? initialPredictionChannel;
  const resultsChannel = optimisticResultsChannel ?? initialResultsChannel;

  useEffect(() => {
    if (
      optimisticPredictionChannel !== null &&
      initialPredictionChannel === optimisticPredictionChannel
    ) {
      setOptimisticPredictionChannel(null);
    }
  }, [optimisticPredictionChannel, initialPredictionChannel]);

  useEffect(() => {
    if (
      optimisticResultsChannel !== null &&
      initialResultsChannel === optimisticResultsChannel
    ) {
      setOptimisticResultsChannel(null);
    }
  }, [optimisticResultsChannel, initialResultsChannel]);

  const canUsePushChannels = isPushSupported && pushPermission !== 'denied';
  const notificationChannelChoices = canUsePushChannels
    ? notificationChannelOptions
    : notificationChannelOptions.filter(
        (option) => option.value === 'none' || option.value === 'email',
      );
  const disabledNotificationValues: NotificationChannel[] =
    canUsePushChannels && !isPushLoading ? [] : ['push', 'both'];
  const visiblePredictionChannel = canUsePushChannels
    ? predictionChannel
    : stripPushFromChannel(predictionChannel);
  const visibleResultsChannel = canUsePushChannels
    ? resultsChannel
    : stripPushFromChannel(resultsChannel);

  // Regional (timezone, locale) optimistic state
  const [optimisticTimezone, setOptimisticTimezone] = useState<
    string | null | undefined
  >(undefined);
  const [optimisticLocale, setOptimisticLocale] = useState<
    string | null | undefined
  >(undefined);

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

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);

  const usernameCooldownUntil = me?.usernameChangedAt
    ? me.usernameChangedAt + USERNAME_COOLDOWN_MS
    : null;
  const isUsernameLocked =
    usernameCooldownUntil !== null && Date.now() < usernameCooldownUntil;

  function startEditing() {
    setEditDisplayName(me?.displayName ?? '');
    setEditUsername(me?.username ?? '');
    setEditError(null);
    setShowUsernameConfirm(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditError(null);
    setShowUsernameConfirm(false);
  }

  async function handleSave() {
    const trimmedUsername = editUsername.trim().toLowerCase();
    const usernameChanged = trimmedUsername !== (me?.username ?? '');

    if (usernameChanged && !showUsernameConfirm) {
      setShowUsernameConfirm(true);
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      await updateProfile({
        displayName: editDisplayName,
        ...(usernameChanged ? { username: trimmedUsername } : {}),
      });
      setIsEditing(false);
      setShowUsernameConfirm(false);

      if (usernameChanged) {
        navigate({
          to: '/p/$username',
          params: { username: trimmedUsername },
          search: { from: undefined, fromLabel: undefined },
        });
      }
    } catch (e) {
      setEditError(
        e instanceof Error
          ? toUserFacingMessage(e)
          : 'Failed to update profile',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateNotificationChannels(
    nextPredictionChannel: NotificationChannel,
    nextResultsChannel: NotificationChannel,
  ) {
    const normalizedPredictionChannel = canUsePushChannels
      ? nextPredictionChannel
      : stripPushFromChannel(nextPredictionChannel);
    const normalizedResultsChannel = canUsePushChannels
      ? nextResultsChannel
      : stripPushFromChannel(nextResultsChannel);

    setOptimisticPredictionChannel(normalizedPredictionChannel);
    setOptimisticResultsChannel(normalizedResultsChannel);

    void (async () => {
      try {
        const needsPush =
          channelIncludesPush(normalizedPredictionChannel) ||
          channelIncludesPush(normalizedResultsChannel);

        if (needsPush) {
          if (!canUsePushChannels) {
            throw new Error('Push channel unavailable');
          }
          if (!isPushSubscribed) {
            await subscribePush();
          }
        } else if (isPushSubscribed) {
          await unsubscribePush();
        }

        await updateNotifications({
          predictionReminderChannel: normalizedPredictionChannel,
          resultsNotificationChannel: normalizedResultsChannel,
        });
      } catch {
        setOptimisticPredictionChannel(null);
        setOptimisticResultsChannel(null);
      }
    })();
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to access your settings.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (me === undefined) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button
          asChild
          leftIcon={ArrowLeft}
          variant="text"
          size="sm"
          className="mb-4"
        >
          <Link to="/me">Back to My Picks</Link>
        </Button>
        <PageHero
          eyebrow="Account"
          title="Settings"
          subtitle="Manage your profile, privacy, and notification preferences."
        />
        {showPurchaseSuccess ? (
          <div className="reveal-up reveal-delay-1 mb-6 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {hasPassForSuccessBanner === true ? (
                  <div className="flex items-start gap-2 text-success">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Season Pass is active</p>
                      <p className="text-sm text-text-muted">
                        Your {purchaseSeason} season pass is now active. Premium
                        league limits are unlocked.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-accent">
                    <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                    <div>
                      <p className="font-semibold">Payment received</p>
                      <p className="text-sm text-text-muted">
                        Activating your {purchaseSeason} season pass. This can
                        take a few seconds after checkout closes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigate({
                    to: '/settings',
                    replace: true,
                  });
                }}
                className="inline-flex rounded-md p-1 text-text-muted hover:bg-surface-muted hover:text-text"
                aria-label="Dismiss purchase banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-text-muted">
              <Link to="/leagues" className="text-accent hover:underline">
                Go to leagues
              </Link>{' '}
              to create or join leagues with your new limits.
            </p>
          </div>
        ) : null}

        <div className="space-y-6">
          {/* Profile section */}
          <SettingsSection
            id="profile"
            title="Profile"
            icon={<User className="h-5 w-5 text-text-muted" />}
          >
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    avatarUrl={me?.avatarUrl}
                    username={me?.username}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label
                        htmlFor="display-name"
                        className="mb-1 block text-sm font-medium text-text-muted"
                      >
                        Display name
                      </label>
                      <input
                        id="display-name"
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Display name"
                        maxLength={50}
                        className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="username"
                        className="mb-1 block text-sm font-medium text-text-muted"
                      >
                        Username
                      </label>
                      <div className="flex items-center">
                        <span
                          className="rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 py-2 text-text-muted"
                          aria-hidden="true"
                        >
                          @
                        </span>
                        <input
                          id="username"
                          type="text"
                          value={editUsername}
                          onChange={(e) => {
                            setEditUsername(e.target.value);
                            setShowUsernameConfirm(false);
                          }}
                          placeholder="username"
                          maxLength={30}
                          disabled={isUsernameLocked}
                          className="w-full rounded-r-lg border border-border bg-page px-3 py-2 text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      {isUsernameLocked && usernameCooldownUntil && (
                        <p
                          className="mt-1 text-sm text-text-muted"
                          suppressHydrationWarning
                        >
                          You can change your username again on{' '}
                          {formatCalendarDate(usernameCooldownUntil)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Username change confirmation warning */}
                {showUsernameConfirm && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-100 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                    <p className="text-sm font-medium text-amber-900 dark:font-normal dark:text-amber-400">
                      Changing your username will break any existing links to
                      your profile. You won&apos;t be able to change it again
                      for 90 days.
                    </p>
                  </div>
                )}

                {/* Non-confirm username change notice */}
                {!isUsernameLocked &&
                  !showUsernameConfirm &&
                  editUsername.trim().toLowerCase() !==
                    (me?.username ?? '') && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-100 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                      <p className="text-sm font-medium text-amber-900 dark:font-normal dark:text-amber-400">
                        You can only change your username once every 90 days.
                        Your old profile link will stop working.
                      </p>
                    </div>
                  )}

                {editError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                    {editError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <Button size="sm" loading={isSubmitting} onClick={handleSave}>
                    {showUsernameConfirm ? 'Confirm Change' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    avatarUrl={me?.avatarUrl}
                    username={me?.username}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      {me?.displayName ?? me?.username ?? 'Anonymous'}
                    </p>
                    {me?.username && (
                      <p className="text-sm text-text-muted">@{me.username}</p>
                    )}
                  </div>
                </div>
                <Button size="tab" variant="tab" onClick={startEditing}>
                  Edit
                </Button>
              </div>
            )}
          </SettingsSection>

          <SeasonPassSection
            season={seasonPassSeason}
            hasSeasonPass={hasSeasonPassFor2026}
          />

          {/* Regional section */}
          <RegionalSection
            timezone={displayTimezone}
            locale={displayLocale}
            loading={false}
            onUpdate={(settings) => {
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
            }}
          />

          <SettingsSection
            id="appearance"
            title="Appearance"
            icon={
              isDark ? (
                <Moon className="h-5 w-5 text-text-muted" />
              ) : (
                <Sun className="h-5 w-5 text-text-muted" />
              )
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-text">Dark mode</p>
                <p className="text-sm text-text-muted">
                  Choose light or dark theme across the app.
                </p>
              </div>
              <ToggleSwitch
                checked={isDark}
                onChange={() => setTheme(!isDark)}
                loading={false}
              />
            </div>
          </SettingsSection>

          {/* Notifications section */}
          <SettingsSection
            id="notifications"
            title="Notifications"
            icon={<Bell className="h-5 w-5 text-text-muted" />}
            contentClassName="divide-y divide-border px-4"
          >
            <NotificationChannelItem
              label="Prediction reminders"
              description="Get reminders before picks lock for each race weekend. Reminders won't be sent if you've already saved your prediction."
              value={visiblePredictionChannel}
              onChange={(next) => {
                updateNotificationChannels(next, visibleResultsChannel);
              }}
              disabledValues={disabledNotificationValues}
              options={notificationChannelChoices}
            />
            <NotificationChannelItem
              label="Result notifications"
              description="Get notified when session results are published and scores are calculated."
              value={visibleResultsChannel}
              onChange={(next) => {
                updateNotificationChannels(visiblePredictionChannel, next);
              }}
              disabledValues={disabledNotificationValues}
              options={notificationChannelChoices}
            />
            {isPushSupported && pushPermission === 'denied' && (
              <div className="py-4">
                <p className="font-medium text-text">Push notifications</p>
                <p className="text-sm text-text-muted">
                  Notifications are blocked. Enable them in your browser
                  settings to receive alerts.
                </p>
              </div>
            )}
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
