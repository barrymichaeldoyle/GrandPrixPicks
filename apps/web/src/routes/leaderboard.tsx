import { useAuth } from '@clerk/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHero } from '@/components/PageHero';
import { TabSwitch } from '@/components/TabSwitch';
import { isRaceSelectableForLeaderboard } from '@/lib/raceSessions';
import { pageMeta } from '@/lib/site';

import { PAGE_SIZE, playerCountFormatter } from './-leaderboard/constants';
import {
  GAME_MODE_OPTIONS,
  SCOPE_OPTIONS,
  TIME_SCOPE_OPTIONS,
} from './-leaderboard/options';
import { SeasonContent } from './-leaderboard/SeasonContent';
import type {
  CombinedLeaderboardEntry,
  GameMode,
  H2HLeaderboardEntry,
  LeaderboardEntry,
  RaceLeaderboardResult,
  Scope,
  TimeScope,
} from './-leaderboard/types';
import { useStickyValue } from './-leaderboard/useStickyValue';
import { WeekendContent } from './-leaderboard/WeekendContent';

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { time?: TimeScope; mode?: GameMode; scope?: Scope; raceId?: string } => {
    const time =
      search.time === 'weekend' || search.time === 'season'
        ? search.time
        : undefined;
    const mode =
      search.mode === 'combined' ||
      search.mode === 'top5' ||
      search.mode === 'h2h'
        ? search.mode
        : undefined;
    const scope =
      search.scope === 'global' || search.scope === 'following'
        ? search.scope
        : undefined;
    const raceId =
      typeof search.raceId === 'string' ? search.raceId : undefined;
    return { time, mode, scope, raceId };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const [defaultRace, allRaces] = await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.races.getWeekendLeaderboardRace, {}),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.races.listRaces, { season: 2026 }),
      ),
    ]);
    const selectedRace =
      allRaces.find((race) => race._id === deps.raceId) ?? defaultRace;
    const [initialSeason, initialWeekend] = await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
          limit: PAGE_SIZE,
        }),
      ),
      selectedRace
        ? context.queryClient.ensureQueryData(
            convexQuery(api.leaderboards.getCombinedRaceLeaderboard, {
              raceId: selectedRace._id,
            }),
          )
        : Promise.resolve(null),
    ]);
    return { defaultRace, allRaces, initialSeason, initialWeekend };
  },
  head: () =>
    pageMeta({
      title:
        '2026 Season Leaderboard - F1 Prediction Rankings | Grand Prix Picks',
      description:
        'See who tops the 2026 F1 prediction standings. Track your ranking, compare scores, and compete with friends across every race weekend.',
      path: '/leaderboard',
    }),
});

function LeaderboardPage() {
  const { defaultRace, allRaces, initialSeason, initialWeekend } =
    Route.useLoaderData();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // Bare /leaderboard defaults to the current race weekend only when that
  // board has something to show — mid-weekend before any results are
  // published, season standings beat an empty "No scores yet" state. An
  // explicit ?raceId (e.g. from a race page link) still means weekend.
  const weekendHasScores =
    initialWeekend != null &&
    initialWeekend.status === 'visible' &&
    initialWeekend.entries.length > 0;
  const timeScope: TimeScope =
    search.time ??
    (search.raceId != null || weekendHasScores ? 'weekend' : 'season');
  const gameMode: GameMode = search.mode ?? 'combined';
  const scope: Scope = search.scope ?? 'global';

  const selectableRaces = allRaces
    .filter((r) => isRaceSelectableForLeaderboard(r))
    .concat(
      defaultRace && !allRaces.some((r) => r._id === defaultRace._id)
        ? [defaultRace]
        : [],
    )
    .sort((a, b) => a.round - b.round);

  const selectedRace =
    allRaces.find((r) => r._id === search.raceId) ?? defaultRace;
  const selectedRaceId = selectedRace?._id as Id<'races'> | undefined;

  // Season combined (global) – with SSR + pagination
  const [seasonEntries, setSeasonEntries] = useState<
    CombinedLeaderboardEntry[]
  >(initialSeason.entries as CombinedLeaderboardEntry[]);
  const [seasonOffset, setSeasonOffset] = useState(PAGE_SIZE);
  const [seasonHasMore, setSeasonHasMore] = useState(initialSeason.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: clientSeasonCombined } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedSeasonLeaderboard,
      timeScope === 'season' && gameMode === 'combined' && scope === 'global'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonTop5Global } = useQuery(
    convexQuery(
      api.leaderboards.getSeasonLeaderboard,
      timeScope === 'season' && gameMode === 'top5' && scope === 'global'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonH2HGlobal } = useQuery(
    convexQuery(
      api.h2h.getH2HSeasonLeaderboard,
      timeScope === 'season' && gameMode === 'h2h' && scope === 'global'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonCombinedFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getFriendsCombinedLeaderboard,
      timeScope === 'season' && gameMode === 'combined' && scope === 'following'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonTop5Following } = useQuery(
    convexQuery(
      api.leaderboards.getFriendsLeaderboard,
      timeScope === 'season' && gameMode === 'top5' && scope === 'following'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonH2HFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getFriendsH2HLeaderboard,
      timeScope === 'season' && gameMode === 'h2h' && scope === 'following'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );

  // Weekend queries
  const { data: weekendCombined } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'combined' &&
        scope === 'global' &&
        selectedRaceId
        ? { raceId: selectedRaceId }
        : 'skip',
    ),
  );
  const { data: weekendTop5 } = useQuery(
    convexQuery(
      api.leaderboards.getRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'top5' &&
        scope === 'global' &&
        selectedRaceId
        ? { raceId: selectedRaceId }
        : 'skip',
    ),
  );
  const { data: weekendH2H } = useQuery(
    convexQuery(
      api.leaderboards.getH2HRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'h2h' &&
        scope === 'global' &&
        selectedRaceId
        ? { raceId: selectedRaceId }
        : 'skip',
    ),
  );
  const { data: weekendCombinedFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'combined' &&
        scope === 'following' &&
        selectedRaceId
        ? { raceId: selectedRaceId, friendsOnly: true }
        : 'skip',
    ),
  );
  const { data: weekendTop5Following } = useQuery(
    convexQuery(
      api.leaderboards.getRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'top5' &&
        scope === 'following' &&
        selectedRaceId
        ? { raceId: selectedRaceId, friendsOnly: true }
        : 'skip',
    ),
  );
  const { data: weekendH2HFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getH2HRaceLeaderboard,
      timeScope === 'weekend' &&
        gameMode === 'h2h' &&
        scope === 'following' &&
        selectedRaceId
        ? { raceId: selectedRaceId, friendsOnly: true }
        : 'skip',
    ),
  );

  // Sticky values — retain last result so switching back to a tab is instant
  const stickySeasonTop5Global = useStickyValue(seasonTop5Global);
  const stickySeasonH2HGlobal = useStickyValue(seasonH2HGlobal);
  const stickySeasonCombinedFollowing = useStickyValue(seasonCombinedFollowing);
  const stickySeasonTop5Following = useStickyValue(seasonTop5Following);
  const stickySeasonH2HFollowing = useStickyValue(seasonH2HFollowing);
  const stickyWeekendCombined = useStickyValue(weekendCombined);
  const stickyWeekendTop5 = useStickyValue(weekendTop5);
  const stickyWeekendH2H = useStickyValue(weekendH2H);
  const stickyWeekendCombinedFollowing = useStickyValue(
    weekendCombinedFollowing,
  );
  const stickyWeekendTop5Following = useStickyValue(weekendTop5Following);
  const stickyWeekendH2HFollowing = useStickyValue(weekendH2HFollowing);

  const seasonCombinedData = clientSeasonCombined ?? initialSeason;

  // Sync season combined entries on fresh client data
  useEffect(() => {
    if (clientSeasonCombined && seasonOffset === PAGE_SIZE) {
      setSeasonEntries(
        clientSeasonCombined.entries as CombinedLeaderboardEntry[],
      );
      setSeasonHasMore(clientSeasonCombined.hasMore);
    }
  }, [clientSeasonCombined, seasonOffset]);

  async function loadMoreSeason() {
    if (isLoadingMore || !seasonHasMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const more = await queryClient.fetchQuery(
        convexQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
          limit: PAGE_SIZE,
          offset: seasonOffset,
        }),
      );
      setSeasonEntries((prev) => [
        ...prev,
        ...(more.entries as CombinedLeaderboardEntry[]),
      ]);
      setSeasonOffset((prev) => prev + PAGE_SIZE);
      setSeasonHasMore(more.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // The active dataset for each (scope, gameMode) pair — the single source
  // the header card, total count, and content components all read from.
  // `undefined` means the query is still loading; weekend `null` means no
  // data is available for the selected race.
  const weekendDataByView = {
    global: {
      combined:
        stickyWeekendCombined ??
        (selectedRaceId === selectedRace?._id ? initialWeekend : null),
      top5: stickyWeekendTop5,
      h2h: stickyWeekendH2H,
    },
    following: {
      combined: stickyWeekendCombinedFollowing,
      top5: stickyWeekendTop5Following,
      h2h: stickyWeekendH2HFollowing,
    },
  } satisfies Record<Scope, Record<GameMode, RaceLeaderboardResult | null>>;
  const seasonDataByView = {
    global: {
      combined: seasonCombinedData,
      top5: stickySeasonTop5Global,
      h2h: stickySeasonH2HGlobal,
    },
    following: {
      combined: stickySeasonCombinedFollowing,
      top5: stickySeasonTop5Following,
      h2h: stickySeasonH2HFollowing,
    },
  };
  const activeWeekendData = weekendDataByView[scope][gameMode];
  const activeSeasonData = seasonDataByView[scope][gameMode];

  const headerViewerEntry = (() => {
    if (timeScope === 'weekend') {
      if (
        !activeWeekendData ||
        activeWeekendData.status !== 'visible' ||
        activeWeekendData.entries.length === 0
      ) {
        return null;
      }
      return (
        (activeWeekendData.entries as LeaderboardEntry[]).find(
          (e) => e.isViewer,
        ) ?? null
      );
    }
    return activeSeasonData?.viewerEntry ?? null;
  })();

  // No count for weekend boards.
  const activeTotalCount =
    timeScope === 'weekend' ? null : (activeSeasonData?.totalCount ?? 0);

  const gameModeLabel =
    gameMode === 'combined'
      ? 'Combined'
      : gameMode === 'top5'
        ? 'Top 5'
        : 'H2H';
  const activeViewKey = `${timeScope}:${scope}:${gameMode}`;

  const heroSubtitle =
    timeScope === 'weekend' && selectedRace
      ? `${selectedRace.season} ${selectedRace.name} Weekend · ${gameModeLabel}`
      : `2026 Season Standings · ${gameModeLabel}${
          activeTotalCount && activeTotalCount > 0
            ? ` · ${playerCountFormatter.format(activeTotalCount)} ${activeTotalCount === 1 ? 'player' : 'players'}`
            : ''
        }`;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHero
          eyebrow={timeScope === 'weekend' ? 'Race Weekend' : 'Season Rankings'}
          title="Leaderboard"
          subtitle={heroSubtitle}
          className="page-hero--high-contrast"
          rightSlot={
            <AnimatePresence mode="wait">
              {headerViewerEntry ? (
                <motion.div
                  key={timeScope}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex shrink-0 items-center gap-3 rounded-lg border-2 border-accent bg-accent-muted px-3 py-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {headerViewerEntry.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">
                      {(headerViewerEntry as LeaderboardEntry).displayName ??
                        headerViewerEntry.username}
                    </div>
                    <div className="text-base font-bold text-accent">
                      {headerViewerEntry.points} points
                      {gameMode === 'h2h' &&
                        'correctPicks' in headerViewerEntry && (
                          <span className="ml-2 text-sm font-normal text-text-muted">
                            (
                            {
                              (headerViewerEntry as H2HLeaderboardEntry)
                                .correctPicks
                            }
                            /
                            {
                              (headerViewerEntry as H2HLeaderboardEntry)
                                .totalPicks
                            }{' '}
                            correct)
                          </span>
                        )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          }
        />

        {/* Tab bar */}
        <div
          className="reveal-up reveal-delay-1 mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-1.5"
          aria-label="Leaderboard filters"
        >
          {/* Row 1: Time scope */}
          <TabSwitch
            value={timeScope}
            onChange={(v) =>
              navigate({
                search: (prev) => ({ ...prev, time: v }),
                replace: true,
              })
            }
            options={[...TIME_SCOPE_OPTIONS]}
            className="flex gap-1"
            buttonClassName="flex-1"
            ariaLabel="Leaderboard time scope"
          />

          {/* Race selector (weekend tab only) */}
          {timeScope === 'weekend' && selectableRaces.length > 1 && (
            <div className="relative">
              <select
                value={selectedRaceId ?? ''}
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

          {/* Row 2: Scope + game mode */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {isAuthLoaded && isSignedIn && (
              <div className="sm:border-r sm:border-border sm:pr-4">
                <TabSwitch
                  value={scope}
                  onChange={(v) =>
                    navigate({
                      search: (prev) => ({ ...prev, scope: v }),
                      replace: true,
                    })
                  }
                  options={[...SCOPE_OPTIONS]}
                  className="flex gap-1"
                  buttonClassName="flex-1 sm:flex-initial"
                  ariaLabel="Leaderboard scope"
                />
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
              options={[...GAME_MODE_OPTIONS]}
              className="flex flex-1 gap-1"
              buttonClassName="flex-1"
              ariaLabel="Leaderboard game mode"
            />
          </div>
        </div>

        {/* Content */}
        {timeScope === 'weekend' ? (
          <WeekendContent
            key={activeViewKey}
            defaultRace={selectedRace}
            scope={scope}
            gameMode={gameMode}
            isSignedIn={isSignedIn}
            activeData={activeWeekendData}
          />
        ) : (
          <SeasonContent
            key={activeViewKey}
            scope={scope}
            gameMode={gameMode}
            seasonEntries={seasonEntries}
            seasonHasMore={seasonHasMore}
            isLoadingMore={isLoadingMore}
            activeTotalCount={activeTotalCount ?? 0}
            loadMoreSeason={() => void loadMoreSeason()}
            seasonTop5Global={stickySeasonTop5Global}
            seasonH2HGlobal={stickySeasonH2HGlobal}
            seasonCombinedFollowing={stickySeasonCombinedFollowing}
            seasonTop5Following={stickySeasonTop5Following}
            seasonH2HFollowing={stickySeasonH2HFollowing}
          />
        )}
      </div>
    </div>
  );
}
