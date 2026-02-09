import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { AlertTriangle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../../convex/_generated/api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PageLoader } from '../components/PageLoader';
import { ogBaseUrl } from '../lib/site';

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
  const updateProfile = useMutation(api.users.updateProfile);

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
        <div className="mx-auto max-w-4xl px-4 py-8">
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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-text">Settings</h1>

        <div className="space-y-6">
          {/* Profile section */}
          <div className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold text-text">Profile</h2>
            </div>
            <div className="px-4 py-4">
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
                    <Button
                      size="sm"
                      loading={isSubmitting}
                      onClick={handleSave}
                    >
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
                        <p className="text-sm text-text-muted">
                          @{me.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="tab" variant="tab" onClick={startEditing}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Privacy section */}
          <div className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold text-text">Privacy</h2>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {showOnLeaderboard ? (
                    <Eye className="h-5 w-5 text-text-muted" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-text-muted" />
                  )}
                  <div>
                    <p className="font-medium text-text">
                      Show on public leaderboard
                    </p>
                    <p className="text-sm text-text-muted">
                      When disabled, your name won&apos;t appear on the season
                      leaderboard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showOnLeaderboard}
                  onClick={() => {
                    const next = !showOnLeaderboard;
                    setOptimisticLeaderboard(next);
                    updatePrivacy({ showOnLeaderboard: next }).catch(() => {
                      setOptimisticLeaderboard(null);
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
                    showOnLeaderboard ? 'bg-accent' : 'bg-surface-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      showOnLeaderboard ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
