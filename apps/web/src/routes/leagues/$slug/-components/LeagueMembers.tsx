import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  CalendarDays,
  ChevronDown,
  Layers,
  Swords,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

import {
  LeagueMembersList,
  LeagueMembersListSkeleton,
} from '@/components/LeagueMembersList';
import { TabSwitch } from '@/components/TabSwitch';
import { useStickyValue } from '@/hooks/useStickyValue';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { isRaceSelectableForLeaderboard } from '@/lib/raceSessions';

import { leagueRouteApi } from './routeApi';
import type { GameMode, TimeScope } from './types';

const TIME_SCOPE_OPTIONS = [
  { value: 'weekend' as const, label: 'Race Weekend', leftIcon: CalendarDays },
  { value: 'season' as const, label: 'Season', leftIcon: Trophy },
];

const GAME_MODE_OPTIONS = [
  { value: 'combined' as const, label: 'Combined', leftIcon: Layers },
  { value: 'top5' as const, label: 'Top 5', leftIcon: Trophy },
  { value: 'h2h' as const, label: 'H2H', leftIcon: Swords },
];

export function LeagueMembers({
  leagueId,
  leagueName,
}: {
  leagueId: Id<'leagues'>;
  leagueName: string;
}) {
  const search = leagueRouteApi.useSearch();
  const navigate = leagueRouteApi.useNavigate();
  const { slug } = leagueRouteApi.useParams();

  const timeScope: TimeScope = search.time ?? 'weekend';
  const gameMode: GameMode = search.mode ?? 'combined';
  const selectedRaceId = search.raceId as Id<'races'> | undefined;

  const me = useQuery(api.users.me, {});
  const nextRace = useQuery(api.races.getNextRace);
  const allRaces = useQuery(api.races.listRaces, { season: 2026 });
  const weekendDefaultRace = useQuery(api.races.getWeekendLeaderboardRace, {});

  const effectiveRaceId = selectedRaceId ?? weekendDefaultRace?._id;

  const selectableRaces = (allRaces ?? [])
    .filter((r) => isRaceSelectableForLeaderboard(r))
    .sort((a, b) => a.round - b.round);

  // Season queries
  const seasonTop5 = useQuery(
    api.leaderboards.getLeagueLeaderboard,
    timeScope === 'season' && gameMode === 'top5'
      ? { leagueId, limit: 100 }
      : 'skip',
  );
  const seasonCombined = useQuery(
    api.leaderboards.getLeagueCombinedSeasonLeaderboard,
    timeScope === 'season' && gameMode === 'combined'
      ? { leagueId, limit: 100 }
      : 'skip',
  );
  const seasonH2H = useQuery(
    api.leaderboards.getLeagueH2HSeasonLeaderboard,
    timeScope === 'season' && gameMode === 'h2h'
      ? { leagueId, limit: 100 }
      : 'skip',
  );

  // Weekend queries
  const weekendTop5 = useQuery(
    api.leaderboards.getLeagueRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'top5' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );
  const weekendCombined = useQuery(
    api.leaderboards.getLeagueCombinedRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'combined' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );
  const weekendH2H = useQuery(
    api.leaderboards.getLeagueH2HRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'h2h' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );

  // Sticky values — retain last result so switching back to a tab is instant
  const stickySeasonTop5 = useStickyValue(seasonTop5);
  const stickySeasonCombined = useStickyValue(seasonCombined);
  const stickySeasonH2H = useStickyValue(seasonH2H);
  const stickyWeekendTop5 = useStickyValue(weekendTop5);
  const stickyWeekendCombined = useStickyValue(weekendCombined);
  const stickyWeekendH2H = useStickyValue(weekendH2H);

  const activeLeaderboard = (() => {
    if (timeScope === 'season') {
      return gameMode === 'top5'
        ? stickySeasonTop5
        : gameMode === 'combined'
          ? stickySeasonCombined
          : stickySeasonH2H;
    }
    return gameMode === 'top5'
      ? stickyWeekendTop5
      : gameMode === 'combined'
        ? stickyWeekendCombined
        : stickyWeekendH2H;
  })();

  const showPredictionStatus =
    nextRace?.status === 'upcoming' &&
    (timeScope !== 'weekend' || effectiveRaceId === nextRace._id);
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

  const filterControls = (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/50 p-1.5">
      <TabSwitch
        value={timeScope}
        onChange={(v) =>
          navigate({
            search: (prev) => ({ ...prev, time: v }),
            replace: true,
          })
        }
        options={TIME_SCOPE_OPTIONS}
        className="flex gap-1"
        buttonClassName="flex-1"
        ariaLabel="Standings time scope"
      />
      {timeScope === 'weekend' && selectableRaces.length > 1 && (
        <div className="relative">
          <select
            value={effectiveRaceId ?? ''}
            onChange={(e) =>
              navigate({
                search: (prev) => ({ ...prev, raceId: e.target.value }),
                replace: true,
              })
            }
            className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm font-medium text-text focus:ring-2 focus:ring-accent focus:outline-none"
            aria-label="Select race weekend"
          >
            {selectableRaces.map((r) => (
              <option key={r._id} value={r._id}>
                {r.season} Round {r.round} · {r.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      )}
      <TabSwitch
        value={gameMode}
        onChange={(v) =>
          navigate({
            search: (prev) => ({ ...prev, mode: v }),
            replace: true,
          })
        }
        options={GAME_MODE_OPTIONS}
        className="flex gap-1"
        buttonClassName="flex-1"
        ariaLabel="Standings game mode"
      />
    </div>
  );

  if (members === undefined || activeLeaderboard === undefined) {
    return (
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-text">Members</h2>
        {filterControls}
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-72 rounded bg-surface-muted" />
          <div className="mb-3 h-4 w-56 rounded bg-surface-muted" />
        </div>
        <LeagueMembersListSkeleton />
      </div>
    );
  }

  // Extract entries from either a season result ({ entries }) or a race result ({ status, entries })
  type AnyEntry = {
    userId: string;
    rank: number;
    points: number;
    top5Points?: number;
    h2hPoints?: number;
    correctPicks?: number;
    totalPicks?: number;
    isViewer?: boolean;
  };

  // Use timeScope to cast to the appropriate result shape, avoiding type-narrowing issues
  const weekendLeaderboard =
    timeScope === 'weekend'
      ? (activeLeaderboard as {
          status: 'visible' | 'locked';
          reason: string | null;
          entries: AnyEntry[];
        })
      : null;
  const seasonLeaderboard =
    timeScope === 'season'
      ? (activeLeaderboard as {
          entries: AnyEntry[];
          viewerEntry: { rank: number; points: number } | null;
        })
      : null;

  const activeEntries: AnyEntry[] =
    weekendLeaderboard?.status === 'visible'
      ? weekendLeaderboard.entries
      : (seasonLeaderboard?.entries ?? []);

  const isWeekendLocked = weekendLeaderboard?.status === 'locked';

  const viewerEntry = (() => {
    if (weekendLeaderboard?.status === 'visible') {
      return weekendLeaderboard.entries.find((e) => e.isViewer) ?? null;
    }
    return seasonLeaderboard?.viewerEntry ?? null;
  })();

  const followedSet = new Set(followedIds ?? []);
  const standingsByUserId = new Map(
    activeEntries.map((entry) => [String(entry.userId), entry] as const),
  );

  const memberItems = members.map((member) => {
    const standing = standingsByUserId.get(String(member.userId));
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
      rank: standing?.rank,
      points: standing?.points,
      top5Points: standing?.top5Points,
      h2hPoints: standing?.h2hPoints,
      correctPicks: standing?.correctPicks,
      totalPicks: standing?.totalPicks,
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
      captureAnalyticsEvent('user_followed', {
        followee_id: userId,
        source: 'league_members',
      });
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
      captureAnalyticsEvent('user_unfollowed', {
        followee_id: userId,
        source: 'league_members',
      });
    } catch {
      setOptimisticFollows((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  const viewerRankLabel = (() => {
    if (!viewerEntry) {
      return null;
    }
    const modeLabel =
      gameMode === 'combined'
        ? 'Combined'
        : gameMode === 'top5'
          ? 'Top 5'
          : 'H2H';
    const scopeLabel =
      timeScope === 'weekend' ? 'this race weekend' : 'this league';
    return {
      rank: viewerEntry.rank,
      points: viewerEntry.points,
      modeLabel,
      scopeLabel,
    };
  })();

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-text">
        Members ({members.length})
      </h2>

      {filterControls}

      {viewerRankLabel && (
        <p className="mb-3 text-sm text-text-muted">
          You&apos;re currently{' '}
          <span className="font-semibold text-accent">
            #{viewerRankLabel.rank}
          </span>{' '}
          ({viewerRankLabel.modeLabel}) in {viewerRankLabel.scopeLabel} with{' '}
          <span className="font-semibold text-accent">
            {viewerRankLabel.points} pts
          </span>
          .
        </p>
      )}
      {isWeekendLocked && (
        <p className="mb-3 text-sm text-text-muted">
          Submit your picks to unlock the race weekend standings.
        </p>
      )}
      {!isWeekendLocked && activeEntries.length === 0 && (
        <p className="mb-3 text-sm text-text-muted">
          No scores yet. Rankings will appear here once race results are
          published.
        </p>
      )}
      {showPredictionStatus && (
        <p className="mb-3 text-xs text-text-muted">
          Predictions stay hidden until this race locks.
        </p>
      )}
      <LeagueMembersList
        members={memberItems}
        showPredictionStatus={showPredictionStatus}
        gameMode={gameMode}
        renderProfileLink={({ username, className, children }) => (
          <Link
            to="/p/$username"
            params={{ username }}
            search={{ from: `/leagues/${slug}`, fromLabel: leagueName }}
            className={className}
          >
            {children}
          </Link>
        )}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    </div>
  );
}
