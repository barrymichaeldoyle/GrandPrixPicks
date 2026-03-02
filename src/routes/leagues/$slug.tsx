import { SignInButton, useAuth } from '@clerk/clerk-react';
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Crown,
  Eye,
  Globe,
  Lock,
  LogIn,
  Settings,
  Shield,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useCallback, useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '../../components/Button';
import { PageLoader } from '../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../lib/site';

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
    const ogImage = defaultOgImage;
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
  const isSettingsSubroute = useRouterState({
    select: (state) => state.location.pathname.endsWith('/settings'),
  });

  if (isSettingsSubroute) {
    return <Outlet />;
  }

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
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              <Link to="/leagues" className="text-accent hover:underline">
                ← Back to leagues
              </Link>
            </p>
            {isMember ? (
              <Link
                to="/leagues/$slug/settings"
                params={{ slug: league.slug }}
                aria-label="League settings"
                title="League settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
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

  async function handleJoin() {
    setError(null);
    setIsJoining(true);
    try {
      await joinLeague({
        leagueId,
        password: password || undefined,
      });
      posthog.capture('league_joined');
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to join league',
      );
      setIsJoining(false);
    }
  }

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
    posthog.capture('league_invite_copied');
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
  const nextRace = useQuery(api.races.getNextRace);
  const showPredictionStatus = nextRace?.status === 'upcoming';
  const members = useQuery(api.leagues.getLeagueMembers, {
    leagueId,
    raceId: showPredictionStatus ? nextRace._id : undefined,
  });
  const promoteMember = useMutation(api.leagues.promoteMember);
  const demoteMember = useMutation(api.leagues.demoteMember);
  const removeMember = useMutation(api.leagues.removeMember);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<'leagueMembers'> | null>(null);
  const [confirmUsername, setConfirmUsername] = useState('');

  function isViewer(userId: Id<'users'>) {
    return me?._id === userId;
  }

  if (members === undefined) {
    return <InlineLoader />;
  }

  const selectedMember =
    selectedMemberId !== null
      ? (members.find((member) => member._id === selectedMemberId) ?? null)
      : null;

  function openMemberDetails(memberId: Id<'leagueMembers'>) {
    setSelectedMemberId(memberId);
    setActionError(null);
    setConfirmUsername('');
  }

  function closeMemberDetails() {
    if (actionLoading !== null) {
      return;
    }
    setSelectedMemberId(null);
    setActionError(null);
    setConfirmUsername('');
  }

  async function handleAction(
    action: 'promote' | 'demote' | 'remove',
    userId: Id<'users'>,
  ) {
    setActionLoading(`${action}-${userId}`);
    setActionError(null);
    try {
      if (action === 'promote') {
        await promoteMember({ leagueId, userId });
      } else if (action === 'demote') {
        await demoteMember({ leagueId, userId });
      } else {
        await removeMember({ leagueId, userId });
      }
      setConfirmUsername('');
      if (action === 'remove') {
        setSelectedMemberId(null);
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Unable to update member',
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="mb-6">
      <h2 className="mb-1 text-lg font-semibold text-text">
        Members ({members.length})
      </h2>
      {showPredictionStatus && (
        <p className="mb-3 text-xs text-text-muted">
          Predictions are hidden until this race locks
        </p>
      )}
      {!showPredictionStatus && <div className="mb-3" />}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {members.map((member, index) => (
          <div
            key={member._id}
            className={`flex items-center justify-between px-4 py-3 ${
              index < members.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-muted">
                  {member.username.charAt(0).toUpperCase()}
                </span>
              )}
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

            <div className="flex items-center gap-1">
              {member.hasSubmittedPredictions !== undefined && (
                <>
                  {member.hasSubmittedPredictions ? (
                    <CheckCircle2
                      className="h-4 w-4 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 text-text-muted/40"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">
                    {member.hasSubmittedPredictions
                      ? 'Submitted'
                      : 'Not submitted'}
                  </span>
                </>
              )}
              <button
                type="button"
                aria-label={`View ${member.username} details`}
                onClick={() => openMemberDetails(member._id)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <MemberDetailsModal
        member={selectedMember}
        isAdmin={isAdmin}
        isViewer={selectedMember ? isViewer(selectedMember.userId) : false}
        confirmUsername={confirmUsername}
        onConfirmUsernameChange={setConfirmUsername}
        actionLoading={actionLoading}
        actionError={actionError}
        onClose={closeMemberDetails}
        onPromote={(userId) => void handleAction('promote', userId)}
        onDemote={(userId) => void handleAction('demote', userId)}
        onRemove={(userId) => void handleAction('remove', userId)}
      />
    </div>
  );
}

function MemberDetailsModal({
  member,
  isAdmin,
  isViewer,
  confirmUsername,
  onConfirmUsernameChange,
  actionLoading,
  actionError,
  onClose,
  onPromote,
  onDemote,
  onRemove,
}: {
  member: {
    _id: Id<'leagueMembers'>;
    userId: Id<'users'>;
    role: 'member' | 'admin';
    joinedAt: number;
    username: string;
    avatarUrl?: string;
    hasSubmittedPredictions?: boolean;
  } | null;
  isAdmin: boolean;
  isViewer: boolean;
  confirmUsername: string;
  onConfirmUsernameChange: (value: string) => void;
  actionLoading: string | null;
  actionError: string | null;
  onClose: () => void;
  onPromote: (userId: Id<'users'>) => void;
  onDemote: (userId: Id<'users'>) => void;
  onRemove: (userId: Id<'users'>) => void;
}) {
  if (!member) {
    return null;
  }

  const needsUsernameConfirmation = isAdmin && !isViewer;
  const usernameMatches = confirmUsername.trim() === member.username;
  const canRunProtectedAction =
    actionLoading === null && (!needsUsernameConfirmation || usernameMatches);
  const isPromoting = actionLoading === `promote-${member.userId}`;
  const isDemoting = actionLoading === `demote-${member.userId}`;
  const isRemoving = actionLoading === `remove-${member.userId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-text-muted">
                {member.username.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-semibold text-text">
                {member.username}
              </p>
              <p className="text-sm text-text-muted">
                Joined{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                }).format(member.joinedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading !== null}
            className="rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-1 rounded-lg border border-border bg-surface-muted/40 p-3 text-sm">
          <p className="text-text">
            Role:{' '}
            <span className="font-medium">
              {member.role === 'admin' ? 'Admin' : 'Member'}
            </span>
          </p>
          {member.hasSubmittedPredictions !== undefined && (
            <p className="text-text">
              Race status:{' '}
              <span className="font-medium">
                {member.hasSubmittedPredictions ? 'Submitted' : 'Not submitted'}
              </span>
            </p>
          )}
          <p>
            Profile:{' '}
            <Link
              to="/p/$username"
              params={{ username: member.username }}
              className="font-medium text-accent hover:underline"
            >
              /p/{member.username}
            </Link>
          </p>
        </div>

        {isAdmin && !isViewer && (
          <div className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="member-action-confirm"
                className="mb-1 block text-xs font-semibold tracking-wide text-text-muted uppercase"
              >
                Confirm username to change role or remove
              </label>
              <input
                id="member-action-confirm"
                type="text"
                value={confirmUsername}
                onChange={(event) =>
                  onConfirmUsernameChange(event.target.value)
                }
                placeholder={member.username}
                className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-text transition-colors outline-none focus:border-accent"
              />
              <p className="mt-1 text-xs text-text-muted">
                Type <span className="font-mono">{member.username}</span>{' '}
                exactly to enable actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.role === 'member' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={UserPlus}
                  loading={isPromoting}
                  disabled={!canRunProtectedAction}
                  onClick={() => onPromote(member.userId)}
                >
                  Promote
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={UserMinus}
                  loading={isDemoting}
                  disabled={!canRunProtectedAction}
                  onClick={() => onDemote(member.userId)}
                >
                  Demote
                </Button>
              )}
              {member.role === 'member' && (
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={Trash2}
                  loading={isRemoving}
                  disabled={!canRunProtectedAction}
                  onClick={() => onRemove(member.userId)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        )}

        {actionError && (
          <p className="mt-3 text-sm text-error" aria-live="assertive">
            {actionError}
          </p>
        )}
      </div>
    </div>
  );
}
