import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
} from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import {
  Check,
  CircleX,
  Hash,
  History,
  Info,
  Settings,
  Star,
  Swords,
  Trophy,
  User,
} from 'lucide-react';

import { displayTeamName } from '@/lib/display';

import { Avatar } from '../../components/Avatar';
import { primaryButtonStyles } from '../../components/Button';
import { DriverBadge, TEAM_COLORS } from '../../components/DriverBadge';
import { Flag } from '../../components/Flag';
import { FollowButton } from '../../components/FollowButton';
import { PageLoader } from '../../components/PageLoader';
import { getCountryCodeForRace, RaceFlag } from '../../components/RaceCard';
import {
  fromProfileHistory,
  RaceScoreCard,
} from '../../components/RaceScoreCard';
import { Tooltip } from '../../components/Tooltip';
import { computeFavoriteTop5Pick } from '../../lib/favorites';
import { getSessionsForWeekend } from '../../lib/sessions';
import { canonicalMeta, defaultOgImage } from '../../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/p/$username')({
  component: ProfilePage,
  loader: async ({ params }) => {
    const profile = await convex.query(api.users.getProfileByUsername, {
      username: params.username,
    });
    return { initialProfile: profile };
  },
  head: ({ loaderData, params }) => {
    const name =
      loaderData?.initialProfile?.displayName ??
      loaderData?.initialProfile?.username ??
      'Profile';
    const title = `${name}'s F1 Predictions & Season Stats | Grand Prix Picks`;
    const description = `Check out ${name}'s prediction history, scores, and season ranking on Grand Prix Picks. See how they stack up against other players.`;
    const ogImage = defaultOgImage;
    const canonical = canonicalMeta(`/p/${params.username}`);
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

function ProfilePage() {
  const { username } = Route.useParams();
  const { initialProfile } = Route.useLoaderData();
  const matches = useMatches();
  const { isSignedIn } = useAuth();

  const profile = useQuery(api.users.getProfileByUsername, { username });
  const currentProfile = profile ?? initialProfile;

  const stats = useQuery(
    api.users.getUserStats,
    currentProfile ? { userId: currentProfile._id } : 'skip',
  );

  const weekends = useQuery(
    api.predictions.getUserPredictionHistory,
    currentProfile ? { userId: currentProfile._id } : 'skip',
  );
  const h2hHistory = useQuery(
    api.h2h.getUserH2HPredictionHistory,
    currentProfile ? { userId: currentProfile._id } : 'skip',
  );
  const h2hPicksByRace = useQuery(
    api.h2h.getUserH2HPicksByRace,
    currentProfile ? { userId: currentProfile._id } : 'skip',
  );

  const drivers = useQuery(api.drivers.listDrivers);

  const followCounts = useQuery(
    api.follows.getFollowCounts,
    currentProfile ? { userId: currentProfile._id } : 'skip',
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
                    Top 5 · of {stats.totalPlayers}
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
                    H2H · of {stats.h2hTotalPlayers}
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
                      <span className="block max-w-[240px] rounded bg-text px-2 py-1.5 text-xs font-medium text-white shadow-sm">
                        {isOwner
                          ? 'Weighted by where you picked them: P1 = 5 pts, P2 = 4, P3 = 3, P4 = 2, P5 = 1. Your most-picked driver in top positions.'
                          : 'Weighted by where they were picked: P1 = 5 pts, P2 = 4, P3 = 3, P4 = 2, P5 = 1. The driver they picked in top positions most.'}
                      </span>
                    }
                  >
                    <Info className="h-4 w-4 shrink-0 text-text-muted" />
                  </Tooltip>
                </div>
                <div className="flex items-stretch">
                  <div
                    className="flex w-16 shrink-0 flex-col items-center justify-center py-4 text-white"
                    style={{
                      backgroundColor:
                        favoriteDriver.team &&
                        (TEAM_COLORS[favoriteDriver.team] ?? '#666'),
                    }}
                  >
                    {favoriteDriver.number != null && (
                      <span className="font-mono text-2xl font-bold">
                        {favoriteDriver.number}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold tracking-wider text-white/90">
                      {favoriteDriver.code}
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
                      <span className="block max-w-[240px] rounded bg-text px-2 py-1.5 text-xs font-medium text-white shadow-sm">
                        {isOwner
                          ? 'The race weekend where you scored the most points. Ties broken by most recent race.'
                          : 'The race weekend where they scored the most points. Ties broken by most recent race.'}
                      </span>
                    }
                  >
                    <Info className="h-4 w-4 shrink-0 text-text-muted" />
                  </Tooltip>
                </div>
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: bestRace.raceSlug }}
                  className="group block px-4 py-4 transition-colors hover:bg-surface-hover/60"
                  aria-label={`Open ${bestRace.raceName} race page`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {(() => {
                          const countryCode = getCountryCodeForRace({
                            slug: bestRace.raceSlug,
                          });
                          return countryCode ? (
                            <RaceFlag countryCode={countryCode} />
                          ) : null;
                        })()}
                        <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-muted">
                          Round {bestRace.raceRound}
                        </span>
                      </div>
                      <div className="truncate text-lg font-semibold text-text">
                        {bestRace.raceName}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Open full race details and scoring breakdown
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex rounded-lg bg-accent/15 px-3 py-1.5 text-xl font-bold text-accent">
                        {bestRace.totalPoints} pts
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Prediction history */}
        {weekends === undefined ? (
          <PageLoader />
        ) : weekends.length === 0 ? (
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
          <div className="space-y-4">
            {(() => {
              // Weekends are sorted by raceDate descending; the next race
              // is the earliest upcoming one (last in the filtered list).
              const nextRaceId = weekends
                .filter((w) => w.raceStatus === 'upcoming')
                .at(-1)?.raceId;

              return weekends.map((weekend) => (
                <ProfileWeekendCard
                  key={weekend.raceId}
                  weekend={weekend}
                  currentUserId={currentProfile._id}
                  isOwner={isOwner}
                  isSignedIn={!!isSignedIn}
                  isNextRace={weekend.raceId === nextRaceId}
                  drivers={drivers}
                  h2hWeekendPoints={
                    h2hHistory?.find((entry) => entry.raceId === weekend.raceId)
                      ?.totalPoints ?? null
                  }
                  h2hWeekendMaxPoints={
                    h2hHistory?.find((entry) => entry.raceId === weekend.raceId)
                      ? Object.values(
                          h2hHistory.find(
                            (entry) => entry.raceId === weekend.raceId,
                          )!.sessions,
                        ).reduce(
                          (sum, session) => sum + (session?.totalPicks ?? 0),
                          0,
                        )
                      : null
                  }
                  hasH2HPicks={Boolean(
                    h2hPicksByRace?.some(
                      (entry) => entry.raceId === weekend.raceId,
                    ),
                  )}
                />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileWeekendCard({
  weekend,
  currentUserId,
  isOwner,
  isSignedIn,
  isNextRace,
  drivers,
  h2hWeekendPoints,
  h2hWeekendMaxPoints,
  hasH2HPicks,
}: {
  weekend: NonNullable<
    NonNullable<
      ReturnType<
        typeof useQuery<typeof api.predictions.getUserPredictionHistory>
      >
    >[number]
  >;
  currentUserId: string;
  isOwner: boolean;
  isSignedIn: boolean;
  isNextRace: boolean;
  drivers: ReturnType<typeof useQuery<typeof api.drivers.listDrivers>>;
  h2hWeekendPoints: number | null;
  h2hWeekendMaxPoints: number | null;
  hasH2HPicks: boolean;
}) {
  const detailedPicks = useQuery(api.h2h.getUserH2HDetailedPicks, {
    userId: currentUserId as never,
    raceId: weekend.raceId as never,
  });
  const compactSessionExtras =
    isOwner && hasH2HPicks && detailedPicks
      ? Object.fromEntries(
          getSessionsForWeekend(weekend.hasSprint).map((session) => [
            session,
            <CompactH2HSessionPicks
              key={session}
              picks={detailedPicks[session] ?? null}
            />,
          ]),
        )
      : undefined;
  const compactSessionPointOverrides =
    isOwner && hasH2HPicks && detailedPicks
      ? Object.fromEntries(
          getSessionsForWeekend(weekend.hasSprint).map((session) => [
            session,
            (detailedPicks[session] ?? []).reduce(
              (sum, pick) => sum + (pick.isCorrect ? 1 : 0),
              0,
            ),
          ]),
        )
      : undefined;

  return (
    <RaceScoreCard
      data={fromProfileHistory(weekend, drivers)}
      variant="compact"
      compactSummaryOnly={!isOwner}
      defaultExpanded={isOwner}
      compactSummaryMeta={
        isOwner && h2hWeekendPoints !== null ? (
          <span className="text-xs text-text-muted">
            H2H{' '}
            <span className="font-semibold text-accent">
              {h2hWeekendPoints} pts
            </span>
          </span>
        ) : undefined
      }
      compactScoreRing={
        isOwner && h2hWeekendPoints !== null
          ? {
              earned: weekend.totalPoints + h2hWeekendPoints,
              max: (() => {
                const top5Max = Object.values(weekend.sessions).reduce(
                  (sum, session) =>
                    sum + (session && session.points !== null ? 25 : 0),
                  0,
                );
                return top5Max + (h2hWeekendMaxPoints ?? 0);
              })(),
            }
          : undefined
      }
      compactSessionExtras={compactSessionExtras}
      compactSessionPointOverrides={compactSessionPointOverrides}
      viewer={{
        isSignedIn,
        isOwner,
      }}
      isNextRace={isNextRace}
    />
  );
}

function CompactH2HSessionPicks({
  picks,
}: {
  picks:
    | {
        matchupId: string;
        team: string;
        driver1: {
          _id: string;
          code: string;
          displayName: string;
          number: number | null;
          team: string | null;
          nationality: string | null;
        };
        driver2: {
          _id: string;
          code: string;
          displayName: string;
          number: number | null;
          team: string | null;
          nationality: string | null;
        };
        predictedWinnerId: string;
        actualWinnerId: string | null;
        isCorrect: boolean | null;
      }[]
    | null;
}) {
  if (!picks || picks.length === 0) {
    return null;
  }

  const sessionPoints = picks.reduce(
    (sum, pick) => sum + (pick.isCorrect ? 1 : 0),
    0,
  );
  const hasResolvedResults = picks.some((pick) => pick.actualWinnerId !== null);

  return (
    <div className="rounded-lg border border-border/70 bg-surface-muted/25 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-accent" />
          <h4 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            H2H
          </h4>
        </div>
        {hasResolvedResults ? (
          <span className="text-xs font-semibold text-accent">
            {sessionPoints} pts
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick, index) => {
          const driver =
            pick.predictedWinnerId === pick.driver1._id
              ? pick.driver1
              : pick.driver2;

          return (
            <div
              key={`${pick.matchupId}-${index}`}
              className="rounded-md bg-surface/20 px-1 py-0.5"
            >
              <span className="relative inline-flex">
                <DriverBadge
                  code={driver.code}
                  team={driver.team}
                  displayName={driver.displayName}
                  number={driver.number}
                  nationality={driver.nationality}
                  size="sm"
                />
                {pick.isCorrect !== null ? (
                  <span
                    className={`absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-surface ${
                      pick.isCorrect
                        ? 'bg-success text-white'
                        : 'bg-error text-white'
                    }`}
                  >
                    {pick.isCorrect ? (
                      <Check
                        className="h-2.5 w-2.5"
                        strokeWidth={3}
                        aria-label="Correct H2H pick"
                      />
                    ) : (
                      <CircleX
                        className="h-2.5 w-2.5"
                        strokeWidth={2.5}
                        aria-label="Incorrect H2H pick"
                      />
                    )}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
