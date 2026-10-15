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
import { ProfileResultHistory } from '@/components/ProfileResultHistory';
import { FeedEmptyState } from '@/components/FeedItem/states';
import { InlineLoader } from '@/components/InlineLoader';
import { FollowButton } from '@/components/FollowButton';
import { PageLoader } from '@/components/PageLoader';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from '@/components/RaceFlag';
import { pageMeta } from '@/lib/site';
import { NoticeCard } from '@/components/NoticeCard';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
import { sanitizeInternalPath } from '@grandprixpicks/shared/internalPath';

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
      // One thin, near-identical stat page per player is exactly the crawl
      // surface that reads as scaled low-value content. Followers/following
      // are already excluded; keep the profile itself out too.
      noIndex: true,
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
          <NoticeCard
            level="page"
            icon={User}
            title="User not found"
            description={
              <>No user with the username &quot;{username}&quot; exists.</>
            }
            action={
              <Link to="/leaderboard" className={primaryButtonStyles('sm')}>
                View Leaderboard
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const isOwner = currentProfile.isOwner;
  const displayName = resolveDisplayName(currentProfile);

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
                        <span className="font-semibold text-text">
                          {followCounts.followerCount}
                        </span>{' '}
                        <Link
                          to="/p/$username/followers"
                          params={{ username: currentProfile.username }}
                          search={{ from: undefined, fromLabel: undefined }}
                          className="font-semibold text-accent hover:text-accent/90"
                        >
                          {followCounts.followerCount === 1
                            ? 'follower'
                            : 'followers'}
                        </Link>
                        {' · '}
                        <span className="font-semibold text-text">
                          {followCounts.followingCount}
                        </span>{' '}
                        <Link
                          to="/p/$username/following"
                          params={{ username: currentProfile.username }}
                          search={{ from: undefined, fromLabel: undefined }}
                          className="font-semibold text-accent hover:text-accent/90"
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
                  <span className="block text-xs font-semibold tracking-label text-accent uppercase">
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
                <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
                  Top 5 points
                </div>
              </div>
              <div className="bg-surface px-3 py-4 text-center">
                <div className="font-title text-2xl font-semibold text-text">
                  {stats?.weekendCount ?? '—'}
                </div>
                <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
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
                  <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
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
                  <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
                    H2H rank of {stats.h2hTotalPlayers}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {scoredWeekends.length > 0 ? (
          <section className="mb-7">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="font-title text-sm font-semibold text-text">
                Weekend finishes
              </h2>
              <span className="text-xs text-text-muted">Top 5 scoring</span>
            </div>
            {/* Flat rows: a card per weekend holding three bordered cells was
                two levels of border and ran past two thousand pixels on a
                phone by the end of a season. */}
            <ul className="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
              {scoredWeekends.map((weekend) => {
                const countryCode = getCountryCodeForRace({
                  slug: weekend.raceSlug,
                });
                const scoredSessionCount = Object.values(
                  weekend.sessions,
                ).filter((session) => session?.points != null).length;

                return (
                  <li key={weekend.raceId} className="border-b border-border">
                    <Link
                      to="/races/$raceSlug"
                      params={{ raceSlug: weekend.raceSlug }}
                      className="group flex items-center gap-3 py-2.5"
                    >
                      {countryCode ? (
                        <RaceFlag countryCode={countryCode} size="sm" />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-text group-hover:text-accent">
                          {weekend.raceName}
                        </span>
                        <span className="block text-xs text-text-muted">
                          Round {weekend.raceRound} · {scoredSessionCount}{' '}
                          {scoredSessionCount === 1 ? 'session' : 'sessions'}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right">
                        <span className="gpp-mono block font-semibold text-accent">
                          {weekend.top5Rank != null
                            ? `P${weekend.top5Rank}`
                            : '–'}
                        </span>
                        <span className="block text-xs text-text-muted">
                          of {weekend.top5FieldSize}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right">
                        <span className="gpp-mono block font-semibold text-text">
                          {weekend.totalPoints}
                        </span>
                        <span className="block text-xs text-text-muted">
                          pts
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="mt-7 mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-title text-sm font-semibold text-text">
            {isOwner ? 'My recent results' : 'Recent results'}
          </h2>
          {userFeed && userFeed.events.length > 0 ? (
            <span className="text-xs text-text-muted">Combined scoring</span>
          ) : null}
        </div>

        {/* Result feed */}
        {userFeed === undefined ? (
          <InlineLoader label="Loading activity" />
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
          <ProfileResultHistory
            key={currentProfile._id}
            events={userFeed.events}
          />
        )}
      </div>
    </div>
  );
}
