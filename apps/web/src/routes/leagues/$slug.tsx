import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Globe,
  Lock,
  LogIn,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useCallback, useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '../../components/Button';
import { LeagueMembersList } from '../../components/LeagueMembersList';
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
        ? `${league.name} — ${league.description}`
        : `Compete with other members in ${league.name}. View standings and make your F1 predictions on Grand Prix Picks.`
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
  const currentLeagueUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

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
            <Button asChild size="sm" leftIcon={ArrowLeft}>
              <Link to="/leagues">Back to Leagues</Link>
            </Button>
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
            <SignInButton
              mode="modal"
              fallbackRedirectUrl={currentLeagueUrl}
              signUpFallbackRedirectUrl={currentLeagueUrl}
            >
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
            <Button asChild size="sm" variant="text">
              <Link to="/leagues">← Back to leagues</Link>
            </Button>
            {isAdmin && (
              <Button asChild size="sm" variant="secondary" leftIcon={Settings}>
                <Link
                  to="/leagues/$slug/settings"
                  params={{ slug: league.slug }}
                >
                  Settings
                </Link>
              </Button>
            )}
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
        {isMember && <LeagueMembers leagueId={league._id} />}
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
      await confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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

function LeagueMembers({ leagueId }: { leagueId: Id<'leagues'> }) {
  const me = useQuery(api.users.me, {});
  const nextRace = useQuery(api.races.getNextRace);
  const showPredictionStatus = nextRace?.status === 'upcoming';
  const members = useQuery(api.leagues.getLeagueMembers, {
    leagueId,
    raceId: showPredictionStatus ? nextRace._id : undefined,
  });
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const [optimisticFollows, setOptimisticFollows] = useState<
    Map<string, boolean>
  >(new Map());

  if (members === undefined) {
    return <InlineLoader />;
  }

  const followedSet = new Set(followedIds ?? []);

  const memberItems = members.map((member) => {
    const optimistic = optimisticFollows.get(member.userId as string);
    const isFollowing =
      optimistic !== undefined
        ? optimistic
        : followedIds !== undefined
          ? followedSet.has(member.userId as string)
          : undefined;
    return {
      ...member,
      _id: member._id as string,
      userId: member.userId as string,
      isViewer: me?._id === member.userId,
      isFollowing,
    };
  });

  async function handleFollow(userId: string) {
    setOptimisticFollows((prev) => new Map(prev).set(userId, true));
    try {
      await followMutation({ followeeId: userId as Id<'users'> });
    } catch {
      setOptimisticFollows((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  async function handleUnfollow(userId: string) {
    setOptimisticFollows((prev) => new Map(prev).set(userId, false));
    try {
      await unfollowMutation({ followeeId: userId as Id<'users'> });
    } catch {
      setOptimisticFollows((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
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
      <LeagueMembersList
        members={memberItems}
        showPredictionStatus={showPredictionStatus}
        renderProfileLink={({ username, className, children }) => (
          <Link to="/p/$username" params={{ username }} className={className}>
            {children}
          </Link>
        )}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    </div>
  );
}
