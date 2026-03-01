import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  LoaderCircle,
  LogIn,
  Ticket,
  User,
  X,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { api } from '../../convex/_generated/api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { PageLoader } from '../components/PageLoader';
import { SettingsSection } from '../components/SettingsSection';
import { TimeFormatSelect } from '../components/TimeFormatSelect';
import { TimezoneSelect } from '../components/TimezoneSelect';
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

function NotificationToggleItem({
  label,
  description,
  checked,
  onToggle,
  loading = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-medium text-text">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onToggle} loading={loading} />
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

  const handleTimezoneChange = (value: string | undefined) => {
    onUpdate({ timezone: value === undefined ? null : value });
  };

  const handleLocaleChange = (value: string | undefined) => {
    onUpdate({ locale: value === undefined ? null : value });
  };

  return (
    <SettingsSection
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
        <div className="mb-6 h-9 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="space-y-6">
          <SettingsSection
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
  const updatePrivacy = useMutation(api.users.updatePrivacySettings);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateRegional = useMutation(api.users.updateRegionalSettings);

  // Privacy toggle state
  const [optimisticLeaderboard, setOptimisticLeaderboard] = useState<
    boolean | null
  >(null);

  const showOnLeaderboard =
    optimisticLeaderboard ?? me?.showOnLeaderboard ?? true;

  useEffect(() => {
    if (
      optimisticLeaderboard !== null &&
      me?.showOnLeaderboard === optimisticLeaderboard
    ) {
      setOptimisticLeaderboard(null);
    }
  }, [optimisticLeaderboard, me?.showOnLeaderboard]);

  // Notification toggle state
  const [optimisticReminders, setOptimisticReminders] = useState<
    boolean | null
  >(null);

  const emailReminders = optimisticReminders ?? me?.emailReminders ?? true;

  useEffect(() => {
    if (
      optimisticReminders !== null &&
      me?.emailReminders === optimisticReminders
    ) {
      setOptimisticReminders(null);
    }
  }, [optimisticReminders, me?.emailReminders]);

  // Push notifications
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  // Results notification toggle state
  const [optimisticResults, setOptimisticResults] = useState<boolean | null>(
    null,
  );

  const emailResults = optimisticResults ?? me?.emailResults ?? true;

  useEffect(() => {
    if (optimisticResults !== null && me?.emailResults === optimisticResults) {
      setOptimisticResults(null);
    }
  }, [optimisticResults, me?.emailResults]);

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

  const startEditing = () => {
    setEditDisplayName(me?.displayName ?? '');
    setEditUsername(me?.username ?? '');
    setEditError(null);
    setShowUsernameConfirm(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
    setShowUsernameConfirm(false);
  };

  const handleSave = async () => {
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
        navigate({ to: '/p/$username', params: { username: trimmedUsername } });
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
  };

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
                        <p className="mt-1 text-sm text-text-muted">
                          You can change your username again on{' '}
                          {new Date(usernameCooldownUntil).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            },
                          )}
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

          {/* Privacy section */}
          <SettingsSection
            title="Privacy"
            icon={
              showOnLeaderboard ? (
                <Eye className="h-5 w-5 text-text-muted" />
              ) : (
                <EyeOff className="h-5 w-5 text-text-muted" />
              )
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-text">
                  Show on public leaderboard
                </p>
                <p className="text-sm text-text-muted">
                  When disabled, your name won&apos;t appear on the season
                  leaderboard.
                </p>
              </div>
              <ToggleSwitch
                checked={showOnLeaderboard}
                onChange={() => {
                  const next = !showOnLeaderboard;
                  setOptimisticLeaderboard(next);
                  updatePrivacy({ showOnLeaderboard: next }).catch(() => {
                    setOptimisticLeaderboard(null);
                  });
                }}
                loading={false}
              />
            </div>
          </SettingsSection>

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

          {/* Notifications section */}
          <SettingsSection
            title="Notifications"
            icon={<Bell className="h-5 w-5 text-text-muted" />}
            contentClassName="divide-y divide-border px-4"
          >
            <NotificationToggleItem
              label="Prediction reminders"
              description="Get an email 24 hours before picks lock for each race weekend."
              checked={emailReminders}
              onToggle={() => {
                const next = !emailReminders;
                setOptimisticReminders(next);
                updateNotifications({ emailReminders: next }).catch(() => {
                  setOptimisticReminders(null);
                });
              }}
              loading={false}
            />
            <NotificationToggleItem
              label="Results notifications"
              description="Get notified when session results are published and scores are calculated."
              checked={emailResults}
              onToggle={() => {
                const next = !emailResults;
                setOptimisticResults(next);
                updateNotifications({ emailResults: next }).catch(() => {
                  setOptimisticResults(null);
                });
              }}
              loading={false}
            />
            {isPushSupported && pushPermission !== 'denied' && (
              <NotificationToggleItem
                label="Push notifications"
                description="Get browser/device notifications 1 hour before picks lock and when results are published."
                checked={isPushSubscribed}
                onToggle={() => {
                  if (isPushSubscribed) {
                    posthog.capture('push_notifications_disabled');
                    void unsubscribePush();
                  } else {
                    posthog.capture('push_notifications_enabled');
                    void subscribePush();
                  }
                }}
                loading={isPushLoading}
              />
            )}
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
