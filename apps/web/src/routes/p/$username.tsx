import { useAuth } from '@clerk/react';
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
  Hash,
  History,
  Info,
  Settings,
  Star,
  Trophy,
  User,
} from 'lucide-react';

import { displayTeamName } from '@/lib/display';

import { Avatar } from '@/components/Avatar';
import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { TEAM_COLORS } from '@/components/DriverBadge';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
} from '@/components/FeedItem';
import { Flag } from '@/components/Flag';
import { FollowButton } from '@/components/FollowButton';
import { PageLoader } from '@/components/PageLoader';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from '@/components/RaceFlag';
import { Tooltip } from '@/components/Tooltip';
import { computeFavoriteTop5Pick } from '@/lib/favorites';
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
      context.queryClient.ensureQueryData(convexQuery(api.drivers.listDrivers)),
      context.queryClient.ensureQueryData(
        convexQuery(api.feed.getUserFeed, { userId: profile._id }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.follows.getFollowCounts, { userId: profile._id }),
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
  useAuth();

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

  const { data: drivers } = useQuery(convexQuery(api.drivers.listDrivers));

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

  const favoritePick = weekends ? computeFavoriteTop5Pick(weekends) : null;
  const favoriteDriver = favoritePick
    ? drivers?.find((d) => d._id === favoritePick.driverId)
    : null;

  /** Best scoring weekend (max totalPoints; tiebreak: most recent race). */
  const bestRace =
    weekends && weekends.length > 0
      ? ([...weekends]
          .filter((w) => w.hasScores && w.totalPoints > 0)
          .sort((a, b) => {
            if (a.totalPoints !== b.totalPoints) {
              return b.totalPoints - a.totalPoints;
            }
            return b.raceDate - a.raceDate;
          })[0] ?? null)
      : null;

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
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Avatar
                avatarUrl={currentProfile.avatarUrl}
                username={currentProfile.username}
                size="lg"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-text sm:text-2xl lg:text-3xl">
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
            {!isOwner && (
              <div className="shrink-0">
                <FollowButton followeeId={currentProfile._id} />
              </div>
            )}
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
            <div className={`mb-4 grid grid-cols-2 gap-3 ${gridCols}`}>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="text-2xl font-bold text-accent">
                  {stats?.totalPoints ?? '—'}
                </div>
                <div className="text-xs text-text-muted">Total Points</div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="text-2xl font-bold text-text">
                  {stats?.weekendCount ?? '—'}
                </div>
                <div className="text-xs text-text-muted">
                  Weekends predicted
                </div>
              </div>
              {showTop5 && (
                <div className="rounded-xl border border-border bg-surface p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Hash className="h-4 w-4 text-accent" />
                    <span className="text-2xl font-bold text-accent">
                      {stats.seasonRank}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    Top 5 rank of {stats.totalPlayers}
                  </div>
                </div>
              )}
              {showH2H && (
                <div className="rounded-xl border border-border bg-surface p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Hash className="h-4 w-4 text-accent" />
                    <span className="text-2xl font-bold text-accent">
                      {stats.h2hSeasonRank}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    H2H rank of {stats.h2hTotalPlayers}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Favorite Pick + Best Race: side by side on desktop */}
        {((favoritePick && favoriteDriver) || bestRace) && (
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {favoritePick && favoriteDriver && (
              <div
                className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${!bestRace ? 'md:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-2 border-b border-border/60 bg-surface-muted/40 px-4 py-2.5">
                  <Star className="h-5 w-5 shrink-0 text-accent" />
                  <h2 className="text-sm font-semibold text-text">
                    {isOwner
                      ? 'Your Favorite Top 5 Pick'
                      : 'Favorite Top 5 Pick'}
                  </h2>
                  <Tooltip
                    placement="top"
                    content={
                      isOwner
                        ? 'Your most-picked driver in top positions.'
                        : `The driver that ${displayName} picked most in top positions.`
                    }
                  >
                    <Info className="h-4 w-4 shrink-0 text-text-muted" />
                  </Tooltip>
                </div>
                <div className="flex items-stretch">
                  <div
                    className="flex w-16 shrink-0 items-center justify-center py-4 text-white"
                    style={{
                      backgroundColor:
                        favoriteDriver.team &&
                        (TEAM_COLORS[favoriteDriver.team] ?? '#666'),
                    }}
                  >
                    <span className="inline-flex flex-col items-center gap-1 rounded-lg bg-black/30 px-2 py-1.5 leading-none">
                      {favoriteDriver.number != null && (
                        <span className="font-mono text-2xl font-bold">
                          {favoriteDriver.number}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold tracking-wider">
                        {favoriteDriver.code}
                      </span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {favoriteDriver.nationality && (
                        <Flag
                          code={favoriteDriver.nationality}
                          size="md"
                          className="shrink-0"
                        />
                      )}
                      {favoriteDriver.displayName && (
                        <span className="text-lg font-semibold text-text">
                          {favoriteDriver.displayName}
                        </span>
                      )}
                    </div>
                    {favoriteDriver.team && (
                      <span className="text-sm text-text-muted">
                        {displayTeamName(favoriteDriver.team)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {bestRace && (
              <div
                className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${!(favoritePick && favoriteDriver) ? 'md:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-2 border-b border-border/60 bg-surface-muted/40 px-4 py-2.5">
                  <Trophy className="h-5 w-5 shrink-0 text-accent" />
                  <h2 className="text-sm font-semibold text-text">
                    {isOwner
                      ? 'Your Best Top 5 Weekend Result'
                      : 'Best Top 5 Weekend Result'}
                  </h2>
                  <Tooltip
                    placement="top"
                    content={
                      isOwner
                        ? 'The race weekend where you scored the most points. Ties broken by most recent race.'
                        : `The race weekend where ${displayName} scored the most points. Ties broken by most recent race.`
                    }
                  >
                    <Info className="h-4 w-4 shrink-0 text-text-muted" />
                  </Tooltip>
                </div>
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: bestRace.raceSlug }}
                  className="group flex h-21 items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-hover/60"
                  aria-label={`Open ${bestRace.raceName} race page`}
                >
                  {(() => {
                    const countryCode = getCountryCodeForRace({
                      slug: bestRace.raceSlug,
                    });
                    return countryCode ? (
                      <RaceFlag countryCode={countryCode} size="lg" />
                    ) : null;
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-muted">
                      Round {bestRace.raceRound}
                    </p>
                    <p className="truncate text-base font-semibold text-text">
                      {bestRace.raceName}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-lg bg-accent/15 px-3 py-1.5 text-xl font-bold text-accent">
                    {bestRace.totalPoints} pts
                  </span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Result feed */}
        {userFeed === undefined ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : userFeed.events.length === 0 ? (
          weekends?.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
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
          <div className="space-y-3">
            {userFeed.events.map((event) => (
              <FeedItem key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
