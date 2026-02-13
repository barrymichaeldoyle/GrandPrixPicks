import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  Bell,
  Eye,
  EyeOff,
  Globe,
  LogIn,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../../convex/_generated/api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PageLoader } from '../components/PageLoader';
import { SettingsSection } from '../components/SettingsSection';
import { TimeFormatSelect } from '../components/TimeFormatSelect';
import { TimezoneSelect } from '../components/TimezoneSelect';
import { ogBaseUrl } from '../lib/site';

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
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: 'Settings | Grand Prix Picks' },
      {
        name: 'description',
        content: 'Manage your Grand Prix Picks account settings.',
      },
      { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
      { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
    ],
  }),
});

const USERNAME_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
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
      setEditError(e instanceof Error ? e.message : 'Failed to update profile');
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

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-6 text-3xl font-bold text-text">Settings</h1>

        <div className="space-y-6">
          {/* Profile section */}
          <SettingsSection
            title="Profile"
            icon={<User className="h-5 w-5 text-text-muted" />}
          >
            {me === undefined ? (
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-surface-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-surface-muted" />
                  <div className="h-3 w-24 rounded bg-surface-muted" />
                </div>
              </div>
            ) : isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    avatarUrl={me?.avatarUrl}
                    username={me?.username}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-muted">
                        Display name
                      </label>
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Display name"
                        maxLength={50}
                        className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-muted">
                        Username
                      </label>
                      <div className="flex items-center">
                        <span className="rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 py-2 text-text-muted">
                          @
                        </span>
                        <input
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
                loading={me === undefined}
              />
            </div>
          </SettingsSection>

          {/* Regional section */}
          <RegionalSection
            timezone={displayTimezone}
            locale={displayLocale}
            loading={me === undefined}
            onUpdate={(settings) => {
              if (settings.timezone !== undefined) {
                setOptimisticTimezone(settings.timezone);
              }
              if (settings.locale !== undefined) {
                setOptimisticLocale(settings.locale);
              }
              updateRegional(settings).catch(() => {
                if (settings.timezone !== undefined)
                  setOptimisticTimezone(undefined);
                if (settings.locale !== undefined)
                  setOptimisticLocale(undefined);
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
              loading={me === undefined}
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
              loading={me === undefined}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
