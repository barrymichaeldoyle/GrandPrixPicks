import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  Globe,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '../../components/Button';
import { PageLoader } from '../../components/PageLoader';
import { canonicalMeta, ogBaseUrl } from '../../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/leagues/$slug')({
  component: LeagueDetailPage,
  loader: async ({ params }) => {
    const league = await convex.query(api.leagues.getLeagueBySlug, {
      slug: params.slug,
    });
    return { league };
  },
  head: ({ loaderData, params }) => {
    const league = loaderData?.league;
    const title = league
      ? `${league.name} | Grand Prix Picks`
      : 'League Standings & Predictions | Grand Prix Picks';
    const description = league
      ? league.description
        ? `${league.name} — ${league.description} ${league.memberCount} member${league.memberCount !== 1 ? 's' : ''}.`
        : `Compete with ${league.memberCount} member${league.memberCount !== 1 ? 's' : ''} in ${league.name}. View standings and make your F1 predictions on Grand Prix Picks.`
      : 'View league standings, track member rankings, and compete with friends in this private F1 prediction league.';
    const ogImage = `${ogBaseUrl}/og/home.png`;
    const canonical = canonicalMeta(`/leagues/${params.slug}`);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function LeagueDetailPage() {
  const { slug } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const league = useQuery(api.leagues.getLeagueBySlug, { slug });

  if (!isLoaded || league === undefined) {
    return <PageLoader />;
  }

  if (league === null) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              League Not Found
            </h1>
            <p className="mb-4 text-text-muted">
              This league doesn't exist or may have been deleted.
            </p>
            <Link
              to="/leagues"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Back to Leagues
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in — show sign-in prompt with league info
  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">{league.name}</h1>
            <p className="mb-1 text-text-muted">
              {league.memberCount} member
              {league.memberCount !== 1 ? 's' : ''}
            </p>
            {league.description && (
              <p className="mb-4 text-sm text-text-muted">
                {league.description}
              </p>
            )}
            <p className="mb-4 text-text-muted">Sign in to join this league.</p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <LeagueDetailContent league={league} />;
}

type League = NonNullable<
  ReturnType<typeof useQuery<typeof api.leagues.getLeagueBySlug>>
>;

function LeagueDetailContent({ league }: { league: League }) {
  const isAdmin = league.viewerRole === 'admin';
  const isMember = league.viewerRole !== null;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-text">{league.name}</h1>
            {isAdmin && <Crown className="h-5 w-5 text-warning" />}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                league.visibility === 'public'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {league.visibility === 'public' ? (
                <>
                  <Globe className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </span>
          </div>
          {league.description && (
            <p className="mt-1 text-text-muted">{league.description}</p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            {league.memberCount} member{league.memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Join flow for non-members */}
        {!isMember && (
          <JoinSection leagueId={league._id} hasPassword={league.hasPassword} />
        )}

        {/* Share link — visible to all members */}
        {isMember && <ShareLinkSection slug={league.slug} />}

        {/* Leaderboard */}
        {isMember && <LeagueLeaderboard leagueId={league._id} />}

        {/* Members */}
        {isMember && <LeagueMembers leagueId={league._id} isAdmin={isAdmin} />}

        {/* League settings (danger zone, admin general settings) */}
        {isMember && <LeagueSettings league={league} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function JoinSection({
  leagueId,
  hasPassword,
}: {
  leagueId: Id<'leagues'>;
  hasPassword: boolean;
}) {
  const joinLeague = useMutation(api.leagues.joinLeague);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setError(null);
    setIsJoining(true);
    try {
      await joinLeague({
        leagueId,
        password: password || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to join league',
      );
      setIsJoining(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
      <Users className="mx-auto mb-4 h-12 w-12 text-accent" />
      <h2 className="mb-2 text-lg font-semibold text-text">Join this league</h2>
      {hasPassword && (
        <div className="mx-auto mb-3 max-w-xs">
          <div className="flex items-center gap-2">
            <Lock
              className="h-4 w-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="League password"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <Button size="sm" loading={isJoining} onClick={() => void handleJoin()}>
        Join League
      </Button>
    </div>
  );
}

function ShareLinkSection({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const leagueUrl = `${window.location.origin}/leagues/${slug}`;

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(leagueUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [leagueUrl]);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-text-muted">
        Share League
      </h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-surface-muted px-3 py-2 text-sm text-text">
          {leagueUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          aria-label={copied ? 'Copied!' : 'Copy league link'}
          className="shrink-0 rounded-lg border border-border p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? 'Link copied!' : ''}
        </span>
      </div>
    </div>
  );
}

function LeagueLeaderboard({ leagueId }: { leagueId: Id<'leagues'> }) {
  const data = useQuery(api.leaderboards.getLeagueLeaderboard, {
    leagueId,
    limit: 50,
  });

  if (data === undefined) {
    return <InlineLoader />;
  }

  if (data.entries.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-text-muted">
          No scores yet. The leaderboard will populate once race results are
          published.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-text">Standings</h2>

      {data.viewerEntry && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border-2 border-accent bg-accent-muted px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">
            {data.viewerEntry.rank}
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-text">
              <User className="h-3.5 w-3.5 text-accent" />
              Your Rank
            </div>
            <div className="text-lg font-bold text-accent">
              {data.viewerEntry.points} pts
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Player
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Races
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <tr
                key={entry.userId}
                className={`border-b border-border transition-colors last:border-0 ${
                  entry.isViewer
                    ? 'bg-accent-muted hover:bg-accent-muted'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/p/$username"
                    params={{ username: entry.username }}
                    className="flex items-center gap-2 font-medium text-text"
                  >
                    {entry.isViewer && (
                      <User
                        className="h-4 w-4 text-accent"
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-semibold text-accent">
                      {entry.username}
                    </span>
                    {entry.isViewer && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                        YOU
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-text-muted">
                    {entry.raceCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-accent">{entry.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeagueMembers({
  leagueId,
  isAdmin,
}: {
  leagueId: Id<'leagues'>;
  isAdmin: boolean;
}) {
  const me = useQuery(api.users.me, {});
  const members = useQuery(api.leagues.getLeagueMembers, { leagueId });
  const promoteMember = useMutation(api.leagues.promoteMember);
  const demoteMember = useMutation(api.leagues.demoteMember);
  const removeMember = useMutation(api.leagues.removeMember);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isViewer = (userId: Id<'users'>) => me?._id === userId;

  if (members === undefined) {
    return <InlineLoader />;
  }

  const handleAction = async (
    action: 'promote' | 'demote' | 'remove',
    userId: Id<'users'>,
  ) => {
    setActionLoading(`${action}-${userId}`);
    try {
      if (action === 'promote') {
        await promoteMember({ leagueId, userId });
      } else if (action === 'demote') {
        await demoteMember({ leagueId, userId });
      } else {
        await removeMember({ leagueId, userId });
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-text">
        Members ({members.length})
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {members.map((member, index) => (
          <div
            key={member._id}
            className={`flex items-center justify-between px-4 py-3 ${
              index < members.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Link
                to="/p/$username"
                params={{ username: member.username }}
                className="font-medium text-accent hover:underline"
              >
                {member.username}
              </Link>
              {member.role === 'admin' && (
                <span className="flex items-center gap-1 rounded-full bg-warning-muted px-2 py-0.5 text-xs font-medium text-warning">
                  <Crown className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1">
                {member.role === 'member' && (
                  <button
                    type="button"
                    aria-label="Promote to admin"
                    disabled={actionLoading !== null}
                    onClick={() => void handleAction('promote', member.userId)}
                    className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
                  >
                    {actionLoading === `promote-${member.userId}` ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
                {member.role === 'admin' && (
                  <button
                    type="button"
                    aria-label="Demote to member"
                    disabled={actionLoading !== null}
                    onClick={() => void handleAction('demote', member.userId)}
                    className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
                  >
                    {actionLoading === `demote-${member.userId}` ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <UserMinus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
                {member.role === 'member' && !isViewer(member.userId) && (
                  <button
                    type="button"
                    aria-label="Remove from league"
                    disabled={actionLoading !== null}
                    onClick={() => void handleAction('remove', member.userId)}
                    className="rounded-lg p-1.5 text-error/60 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                  >
                    {actionLoading === `remove-${member.userId}` ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueSettings({
  league,
  isAdmin,
}: {
  league: League;
  isAdmin: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setSettingsOpen((o) => !o)}
        aria-expanded={settingsOpen}
        aria-controls="league-settings-content"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-muted"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-text">
          <Settings className="h-5 w-5 text-text-muted" aria-hidden="true" />
          League settings
        </span>
        {settingsOpen ? (
          <ChevronDown
            className="h-5 w-5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        )}
      </button>

      {settingsOpen && (
        <div id="league-settings-content" className="mt-3 space-y-4">
          {isAdmin && <AdminGeneralSettings league={league} />}
          <DangerZone leagueId={league._id} league={league} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}

function AdminGeneralSettings({ league }: { league: League }) {
  const updateLeague = useMutation(api.leagues.updateLeague);
  const setPasswordMutation = useMutation(api.leagues.setPassword);
  const removePasswordMutation = useMutation(api.leagues.removePassword);
  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const isPublic = league.visibility === 'public';

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      return;
    }
    setPasswordLoading(true);
    try {
      await setPasswordMutation({
        leagueId: league._id,
        password: newPassword,
      });
      setNewPassword('');
      setShowPasswordForm(false);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setPasswordLoading(true);
    try {
      await removePasswordMutation({ leagueId: league._id });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">
        General
      </h3>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-medium text-text">Visibility</p>
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text">
            <div className="flex items-center gap-2">
              {league.visibility === 'public' ? (
                <>
                  <Globe className="h-4 w-4 shrink-0 text-accent" />
                  <span className="font-medium">Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 shrink-0 text-accent" />
                  <span className="font-medium">Private</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Visibility is chosen when the league is created and cannot be
              changed later.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowEdit(!showEdit)}>
            Edit League
          </Button>
          {!isPublic &&
            (league.hasPassword ? (
              <Button
                size="sm"
                loading={passwordLoading}
                onClick={() => void handleRemovePassword()}
              >
                <Lock className="h-4 w-4" />
                Remove Password
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                <Lock className="h-4 w-4" />
                Set Password
              </Button>
            ))}
        </div>

        {showPasswordForm && !league.hasPassword && !isPublic && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="New league password"
              maxLength={50}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <Button
              size="sm"
              loading={passwordLoading}
              disabled={!newPassword.trim()}
              onClick={() => void handleSetPassword()}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => setShowPasswordForm(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        )}

        {showEdit && (
          <EditLeagueForm
            league={league}
            updateLeague={updateLeague}
            onClose={() => setShowEdit(false)}
          />
        )}
      </div>
    </div>
  );
}

function DangerZone({
  leagueId,
  league,
  isAdmin,
}: {
  leagueId: Id<'leagues'>;
  league: League;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const deleteLeagueMutation = useMutation(api.leagues.deleteLeague);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const slugMatches = deleteConfirmSlug.trim() === league.slug;

  const handleDelete = async () => {
    if (!slugMatches) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteLeagueMutation({ leagueId: league._id });
      void navigate({ to: '/leagues' });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmSlug('');
  };

  return (
    <div className="overflow-hidden rounded-xl border-2 border-error/40 bg-error/5">
      <div className="border-b border-error/20 bg-error/10 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wide text-error uppercase">
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Irreversible actions. Leave removes you from the league; delete
          removes the league for everyone.
        </p>
      </div>
      <div className="space-y-4 p-4">
        {isAdmin && league.adminCount === 1 ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm font-medium text-text">
              You're the only admin
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Add at least one other admin (promote a member in the Members
              section above) if you want to leave the league without deleting
              it. Until then, you can only delete the league.
            </p>
          </div>
        ) : (
          <LeaveButton leagueId={leagueId} />
        )}

        {isAdmin && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-text">
              Delete this league
            </p>
            <p className="mb-3 text-xs text-text-muted">
              Permanently delete the league and remove all members. This cannot
              be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-text">
                  Type the league slug{' '}
                  <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                    {league.slug}
                  </code>{' '}
                  to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmSlug}
                  onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                  placeholder={league.slug}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-text-muted focus:border-error focus:ring-1 focus:ring-error focus:outline-none"
                  disabled={isDeleting}
                  aria-label="Type league slug to confirm deletion"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={isDeleting}
                    disabled={!slugMatches}
                    onClick={() => void handleDelete()}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete forever
                  </Button>
                  <button
                    type="button"
                    onClick={resetDeleteConfirm}
                    disabled={isDeleting}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-transparent px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete league
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditLeagueForm({
  league,
  updateLeague,
  onClose,
}: {
  league: League;
  updateLeague: ReturnType<typeof useMutation<typeof api.leagues.updateLeague>>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(league.name);
  const [slug, setSlug] = useState(league.slug);
  const [description, setDescription] = useState(league.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugChanged = slug !== league.slug;
  const slugAvailable = useQuery(
    api.leagues.isSlugAvailable,
    slugChanged && slug.length >= 3 ? { slug } : 'skip',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await updateLeague({
        leagueId: league._id,
        name,
        slug,
        description,
      });
      if (slugChanged) {
        void navigate({
          to: '/leagues/$slug',
          params: { slug },
          replace: true,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to update league',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-4 space-y-3 border-t border-border pt-4"
    >
      <div>
        <label
          htmlFor="edit-league-name"
          className="mb-1 block text-sm font-medium text-text"
        >
          Name
        </label>
        <input
          id="edit-league-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="edit-league-slug"
          className="mb-1 block text-sm font-medium text-text"
        >
          Slug
        </label>
        <div className="flex items-center gap-2">
          <input
            id="edit-league-slug"
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '')
                  .slice(0, 30),
              )
            }
            maxLength={30}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          {slugChanged && slug.length >= 3 && (
            <span className="shrink-0">
              {slugAvailable === undefined ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              ) : slugAvailable ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <span className="text-xs text-error">Taken</span>
              )}
            </span>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="edit-league-description"
          className="mb-1 block text-sm font-medium text-text"
        >
          Description
        </label>
        <input
          id="edit-league-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Save Changes
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LeaveButton({ leagueId }: { leagueId: Id<'leagues'> }) {
  const navigate = useNavigate();
  const leaveLeague = useMutation(api.leagues.leaveLeague);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    setError(null);
    setIsLeaving(true);
    try {
      await leaveLeague({ leagueId });
      void navigate({ to: '/leagues' });
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to leave league',
      );
      setIsLeaving(false);
    }
  };

  if (showConfirm) {
    return (
      <div>
        <p className="mb-2 text-sm text-text">
          Are you sure you want to leave this league? You can rejoin later if
          invited.
        </p>
        {error && <p className="mb-2 text-sm text-error">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLeaving}
            onClick={() => void handleLeave()}
            className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-error/10 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
          >
            {isLeaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Leave league
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text">Leave this league</p>
      <p className="mb-2 text-xs text-text-muted">
        Stop being a member. You can rejoin with the link if the league is still
        open.
      </p>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-transparent px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
      >
        <LogOut className="h-4 w-4" />
        Leave league
      </button>
    </div>
  );
}
