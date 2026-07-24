import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex-generated/api';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useMatches,
} from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Hash,
  History,
  Settings,
  User,
} from 'lucide-react';

import { Avatar } from '@/components/Avatar';
import { Button, primaryButtonStyles } from '@/components/Button/Button';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
} from '@/components/FeedItem';
import { FollowButton } from '@/components/FollowButton';
import { PageLoader } from '@/components/PageLoader';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from '@/components/RaceFlag';
import { pageMeta } from '@/lib/site';

/**
 * Only accept same-origin relative paths for the "back" link. Without this an
 * attacker-crafted `?from=//evil.com` (or `/\evil.com`, or an absolute URL)
 * renders a trusted-domain "Back to …" link that navigates off-site on
 * click / middle-click / native href follow (open redirect).
 */
function sanitizeInternalPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  // Must be a path rooted at "/", but not protocol-relative ("//") or a
  // backslash-smuggled variant ("/\") that browsers treat as a host.
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return undefined;
  }
  // Reject control characters (incl. tab/newline/space) that browsers may
  // strip to expose a leading "//".
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 0x20) {
      return undefined;
    }
  }
  return value;
}

export const Route = createFileRoute('/p/$username')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: sanitizeInternalPath(search.from),
    fromLabel:
      typeof search.fromLabel === 'string' ? search.fromLabel : undefined,
  }),
  component: ProfilePage,
  loader: async ({ context, params }) => {
    const profile = await context.queryClient.ensureQueryData(
      convexQuery(api.users.getProfileByUsername, {
        username: params.username,
      }),
    );
    if (!profile) {
      throw notFound();
    }

    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.users.getUserStats, { userId: profile._id }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.predictions.getUserPredictionHistory, {
          userId: profile._id,
        }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.feed.getUserFeed, { userId: profile._id }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.follows.getFollowCounts, { userId: profile._id }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.races.getNextRace, {}),
      ),
    ]);

    return { initialProfile: profile };
  },
  head: ({ loaderData, matches, params }) => {
    const childOwnsHead = matches.some(
      (match) =>
        (match.routeId as string) === '/p/$username/followers' ||
        (match.routeId as string) === '/p/$username/following',
    );
    if (childOwnsHead) {
      return {};
    }

    const name =
      loaderData?.initialProfile?.displayName ??
      loaderData?.initialProfile?.username ??
      'Profile';
    return pageMeta({
      title: `${name}'s F1 Predictions & Season Stats | Grand Prix Picks`,
      description: `Check out ${name}'s prediction history, scores, and season ranking on Grand Prix Picks. See how they stack up against other players.`,
      path: `/p/${params.username}`,
    });
  },
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { initialProfile } = Route.useLoaderData();
  const { from, fromLabel } = Route.useSearch();
  const matches = useMatches();

  const { data: profile } = useQuery(
    convexQuery(api.users.getProfileByUsername, { username }),
  );
  const currentProfile = profile ?? initialProfile;

  const { data: stats } = useQuery(
    convexQuery(
      api.users.getUserStats,
      currentProfile ? { userId: currentProfile._id } : 'skip',
    ),
  );

  const { data: weekends } = useQuery(
    convexQuery(
      api.predictions.getUserPredictionHistory,
      currentProfile ? { userId: currentProfile._id } : 'skip',
    ),
  );

  const { data: userFeed } = useQuery(
    convexQuery(
      api.feed.getUserFeed,
      currentProfile ? { userId: currentProfile._id } : 'skip',
    ),
  );

  const { data: followCounts } = useQuery(
    convexQuery(
      api.follows.getFollowCounts,
      currentProfile ? { userId: currentProfile._id } : 'skip',
    ),
  );

  const { data: nextRace } = useQuery(convexQuery(api.races.getNextRace, {}));

  const isChildRoute = matches.some(
    (m) =>
      m.routeId === '/p/$username/followers' ||
      m.routeId === '/p/$username/following',
  );
  if (isChildRoute) {
    return <Outlet />;
  }

  if (profile === undefined && !initialProfile) {
    return <PageLoader />;
  }

  if (!currentProfile) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <User className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              User not found
            </h1>
            <p className="mb-4 text-text-muted">
              No user with the username &quot;{username}&quot; exists.
            </p>
            <Link to="/leaderboard" className={primaryButtonStyles('sm')}>
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = currentProfile.isOwner;
  const displayName =
    currentProfile.displayName ?? currentProfile.username ?? 'Anonymous';

  const scoredWeekends = (weekends ?? [])
    .filter((weekend) => weekend.hasScores)
    .slice(0, 6);

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {from && (
          <Button
            asChild
            size="sm"
            variant="text"
            leftIcon={ArrowLeft}
            className="mb-4"
          >
            <Link to={from}>Back to {fromLabel ?? 'previous page'}</Link>
          </Button>
        )}
        {/* Profile header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Avatar
                avatarUrl={currentProfile.avatarUrl}
                username={currentProfile.username}
                size="lg"
              />
              <div className="min-w-0">
                <p className="mb-0.5 text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">
                  {isOwner ? 'My results' : 'Player profile'}
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="font-title truncate text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
                    {displayName}
                  </h1>
                  {isOwner && (
                    <Link
                      to="/settings"
                      className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                      aria-label="Settings"
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
                {currentProfile.username && (
                  <p className="text-text-muted">@{currentProfile.username}</p>
                )}
                {currentProfile.username && (
                  <div className="mt-1 min-h-5">
                    {followCounts !== undefined && (
                      <p className="reveal-up text-sm text-text-muted">
                        <span className="font-bold text-text">
                          {followCounts.followerCount}
                        </span>{' '}
                        <Link
                          to="/p/$username/followers"
                          params={{ username: currentProfile.username }}
                          search={{ from: undefined, fromLabel: undefined }}
                          className="font-bold text-accent hover:text-accent/90"
                        >
                          {followCounts.followerCount === 1
                            ? 'follower'
                            : 'followers'}
                        </Link>
                        {' · '}
                        <span className="font-bold text-text">
                          {followCounts.followingCount}
                        </span>{' '}
                        <Link
                          to="/p/$username/following"
                          params={{ username: currentProfile.username }}
                          search={{ from: undefined, fromLabel: undefined }}
                          className="font-bold text-accent hover:text-accent/90"
                        >
                          following
                        </Link>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {isOwner && nextRace?.status === 'upcoming' ? (
              <Link
                className="group flex w-full items-center gap-3 rounded-sm border border-border bg-surface-elevated px-3 py-2.5 transition-colors hover:border-accent/45 hover:bg-accent-muted/25 sm:w-auto"
                to="/races/$raceSlug"
                params={{ raceSlug: nextRace.slug }}
                title={`My picks for ${nextRace.name}`}
              >
                {getCountryCodeForRace(nextRace) ? (
                  <RaceFlag
                    countryCode={getCountryCodeForRace(nextRace)!}
                    size="md"
                    className="rounded-sm"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
                    My Picks
                  </span>
                  <span className="block truncate text-sm font-semibold text-text">
                    {nextRace.name}
                  </span>
                  <span className="block text-xs text-text-muted">
                    Round {nextRace.round} · Picks open
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            ) : !isOwner ? (
              <div className="shrink-0">
                <FollowButton followeeId={currentProfile._id} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Stats grid — rank cards only when user has an actual rank */}
        {(() => {
          const showTop5 = stats != null && stats.seasonRank != null;
          const showH2H = stats != null && stats.h2hSeasonRank != null;
          const gridCols =
            !showTop5 && !showH2H
              ? 'sm:grid-cols-2'
              : showTop5 && showH2H
                ? 'sm:grid-cols-4'
                : 'sm:grid-cols-3';
          return (
            <div
              className={`mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border ${gridCols}`}
            >
              <div className="bg-surface px-3 py-4 text-center">
                <div className="font-title text-2xl font-semibold text-accent">
                  {stats?.totalPoints ?? '—'}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Total points
                </div>
              </div>
              <div className="bg-surface px-3 py-4 text-center">
                <div className="font-title text-2xl font-semibold text-text">
                  {stats?.weekendCount ?? '—'}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Weekends
                </div>
              </div>
              {showTop5 && (
                <div className="bg-surface px-3 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Hash className="h-4 w-4 text-accent" />
                    <span className="font-title text-2xl font-semibold text-accent">
                      {stats.seasonRank}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                    Top 5 rank of {stats.totalPlayers}
                  </div>
                </div>
              )}
              {showH2H && (
                <div className="bg-surface px-3 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Hash className="h-4 w-4 text-accent" />
                    <span className="font-title text-2xl font-semibold text-accent">
                      {stats.h2hSeasonRank}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                    H2H rank of {stats.h2hTotalPlayers}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {scoredWeekends.length > 0 ? (
          <section className="mb-7">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-title text-sm font-semibold tracking-wide text-text uppercase">
                Weekend finishes
              </h2>
              <span className="text-xs text-text-muted">Top 5 scoring</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scoredWeekends.map((weekend) => {
                const countryCode = getCountryCodeForRace({
                  slug: weekend.raceSlug,
                });
                const scoredSessionCount = Object.values(
                  weekend.sessions,
                ).filter((session) => session?.points != null).length;

                return (
                  <Link
                    key={weekend.raceId}
                    to="/races/$raceSlug"
                    params={{ raceSlug: weekend.raceSlug }}
                    className="group overflow-hidden rounded-sm border border-border bg-surface transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      {countryCode ? (
                        <RaceFlag countryCode={countryCode} size="md" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                          Round {weekend.raceRound}
                        </p>
                        <p className="truncate font-semibold text-text group-hover:text-accent">
                          {weekend.raceName}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-px bg-border text-center">
                      <div className="bg-surface-elevated px-2 py-2.5">
                        <p className="font-title text-lg font-semibold text-accent">
                          {weekend.top5Rank != null
                            ? `P${weekend.top5Rank}`
                            : '—'}
                        </p>
                        <p className="text-[9px] tracking-wide text-text-muted uppercase">
                          of {weekend.top5FieldSize}
                        </p>
                      </div>
                      <div className="bg-surface-elevated px-2 py-2.5">
                        <p className="font-title text-lg font-semibold text-text">
                          {weekend.totalPoints}
                        </p>
                        <p className="text-[9px] tracking-wide text-text-muted uppercase">
                          points
                        </p>
                      </div>
                      <div className="bg-surface-elevated px-2 py-2.5">
                        <p className="font-title text-lg font-semibold text-text">
                          {scoredSessionCount}
                        </p>
                        <p className="text-[9px] tracking-wide text-text-muted uppercase">
                          sessions
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-7 mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-title text-sm font-semibold tracking-wide text-text uppercase">
            {isOwner ? 'My recent results' : 'Recent results'}
          </h2>
          {weekends && weekends.length > 0 ? (
            <span className="text-xs text-text-muted">
              {weekends.length} race{' '}
              {weekends.length === 1 ? 'weekend' : 'weekends'}
            </span>
          ) : null}
        </div>

        {/* Result feed */}
        {userFeed === undefined ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : userFeed.events.length === 0 ? (
          weekends?.length === 0 ? (
            <div className="rounded-sm border border-border bg-surface p-8 text-center">
              <History className="mx-auto mb-4 h-16 w-16 text-text-muted" />
              <h2 className="mb-2 text-xl font-semibold text-text">
                No predictions yet
              </h2>
              <p className="text-text-muted">
                {isOwner
                  ? 'Make your first prediction to start tracking your scores.'
                  : 'This user has not made any predictions yet.'}
              </p>
              {isOwner && (
                <Link
                  to="/races"
                  className={`mt-4 inline-block ${primaryButtonStyles('md')}`}
                >
                  View Races
                </Link>
              )}
            </div>
          ) : (
            <FeedEmptyState
              icon={History}
              message="Race-by-race results will appear here once sessions are scored."
            />
          )
        ) : (
          <div className="space-y-4">
            {userFeed.events.map((event) => (
              <FeedItem key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
