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
  Users,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useState } from 'react';

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

  async function copyToClipboard() {
    await navigator.clipboard.writeText(leagueUrl);
    posthog.capture('league_invite_copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

function LeagueMembers({ leagueId }: { leagueId: Id<'leagues'> }) {
  const me = useQuery(api.users.me, {});
  const nextRace = useQuery(api.races.getNextRace);
  const leaderboard = useQuery(api.leaderboards.getLeagueLeaderboard, {
    leagueId,
    limit: 50,
  });
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

  if (members === undefined || leaderboard === undefined) {
    return <InlineLoader />;
  }

  const followedSet = new Set(followedIds ?? []);
  const standingsByUserId = new Map(
    leaderboard.entries.map((entry) => [String(entry.userId), entry] as const),
  );

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
      rank: standingsByUserId.get(String(member.userId))?.rank,
      points: standingsByUserId.get(String(member.userId))?.points,
    };
  });

  memberItems.sort((a, b) => {
    if (a.rank != null && b.rank != null) {
      return a.rank - b.rank;
    }
    if (a.rank != null) {
      return -1;
    }
    if (b.rank != null) {
      return 1;
    }
    if (a.role !== b.role) {
      return a.role === 'admin' ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
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
      {leaderboard.viewerEntry && (
        <p className="mb-3 text-sm text-text-muted">
          You&apos;re currently{' '}
          <span className="font-semibold text-accent">
            #{leaderboard.viewerEntry.rank}
          </span>{' '}
          in this league with{' '}
          <span className="font-semibold text-accent">
            {leaderboard.viewerEntry.points} pts
          </span>
          .
        </p>
      )}
      {showPredictionStatus && (
        <p className="mb-3 text-xs text-text-muted">
          Rank and points are shown inline. Predictions stay hidden until this
          race locks.
        </p>
      )}
      {!showPredictionStatus && leaderboard.entries.length === 0 && (
        <p className="mb-3 text-xs text-text-muted">
          No scores yet. Rankings will appear here once race results are
          published.
        </p>
      )}
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
