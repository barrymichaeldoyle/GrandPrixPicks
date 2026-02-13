import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  Hash,
  History,
  Info,
  Settings,
  Star,
  Trophy,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Avatar } from '../../components/Avatar';
import { primaryButtonStyles } from '../../components/Button';
import { TEAM_COLORS } from '../../components/DriverBadge';
import { Flag } from '../../components/Flag';
import { PageLoader } from '../../components/PageLoader';
import { WeekendCard } from '../../components/PredictionHistory';
import { Tooltip } from '../../components/Tooltip';
import { computeFavoriteTop5Pick } from '../../lib/favorites';
import { ogBaseUrl } from '../../lib/site';

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
    const ogImage = `${ogBaseUrl}/og/profile/${params.username}.png`;
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
      ],
    };
  },
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { initialProfile } = Route.useLoaderData();

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

  const followCounts = useQuery(api.follows.getFollowCounts, {
    userId: currentProfile._id,
  });

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
            if (a.totalPoints !== b.totalPoints)
              return b.totalPoints - a.totalPoints;
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
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  )}
                </div>
                {currentProfile.username && (
                  <p className="text-text-muted">@{currentProfile.username}</p>
                )}
                {followCounts && (
                  <p className="text-sm text-text-muted">
                    <span className="font-medium text-text">
                      {followCounts.followerCount}
                    </span>{' '}
                    {followCounts.followerCount === 1
                      ? 'follower'
                      : 'followers'}{' '}
                    &middot;{' '}
                    <span className="font-medium text-text">
                      {followCounts.followingCount}
                    </span>{' '}
                    following
                  </p>
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
                <div className="flex items-center justify-between gap-4 px-4 py-4">
                  <span className="text-lg font-semibold text-text">
                    {bestRace.raceName}
                  </span>
                  <span className="shrink-0 rounded-lg bg-accent/15 px-3 py-1.5 text-xl font-bold text-accent">
                    {bestRace.totalPoints} pts
                  </span>
                </div>
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
                className={`mt-4 inline-block ${primaryButtonStyles('sm')}`}
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
                <WeekendCard
                  key={weekend.raceId}
                  weekend={weekend}
                  drivers={drivers}
                  h2hHistory={h2hHistory}
                  h2hPicksByRace={h2hPicksByRace}
                  userId={currentProfile._id}
                  isOwner={isOwner}
                  isNextRace={weekend.raceId === nextRaceId}
                />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowButton({ followeeId }: { followeeId: Id<'users'> }) {
  const isFollowing = useQuery(api.follows.isFollowing, { followeeId });
  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const following = optimistic ?? isFollowing;

  // Not signed in or still loading
  if (isFollowing === undefined) return null;

  const handleClick = async () => {
    const willFollow = !following;
    setOptimistic(willFollow);
    try {
      if (willFollow) {
        await followMutation({ followeeId });
      } else {
        await unfollowMutation({ followeeId });
      }
    } catch {
      setOptimistic(null);
    }
  };

  const buttonClass =
    'inline-flex min-w-[7rem] items-center justify-start gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';

  if (following) {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${buttonClass} ${
          isHovered
            ? 'border border-red-300 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
            : 'border border-border bg-surface-muted text-text-muted'
        }`}
      >
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
          >
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          <span
            className={`absolute inset-0 flex -translate-x-0.5 items-center justify-center transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          >
            <User className="h-3.5 w-3.5" />
          </span>
        </span>
        <span className="flex-1">{isHovered ? 'Unfollow' : 'Following'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`${buttonClass} border border-transparent bg-accent text-white hover:bg-accent/90`}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <UserPlus className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">Follow</span>
    </button>
  );
}
