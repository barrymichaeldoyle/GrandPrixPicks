import { SignInButton, useAuth } from '@clerk/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronDown,
  Globe,
  Layers,
  Loader2,
  Medal,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { PageHero } from '@/components/PageHero';
import { TabSwitch } from '@/components/TabSwitch';

import { isRaceSelectableForLeaderboard } from '../lib/raceSessions';
import { canonicalMeta, defaultOgImage } from '../lib/site';

const playerCountFormatter = new Intl.NumberFormat('en-US');

const PAGE_SIZE = 50;

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
  head: () => {
    const title =
      '2026 Season Leaderboard - F1 Prediction Rankings | Grand Prix Picks';
    const description =
      'See who tops the 2026 F1 prediction standings. Track your ranking, compare scores, and compete with friends across every race weekend.';
    const canonical = canonicalMeta('/leaderboard');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

// ─────────────────────────── Types ───────────────────────────

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  raceCount?: number;
  isViewer?: boolean;
};

type CombinedLeaderboardEntry = LeaderboardEntry & {
  top5Points: number;
  h2hPoints: number;
};

type H2HLeaderboardEntry = LeaderboardEntry & {
  correctPicks: number;
  totalPicks: number;
};

type TimeScope = 'weekend' | 'season';
type GameMode = 'combined' | 'top5' | 'h2h';
type Scope = 'global' | 'following';

// ─────────────────────────── Tab options ───────────────────────────

const TIME_SCOPE_OPTIONS = [
  { value: 'weekend', label: 'Race Weekend', leftIcon: CalendarDays },
  { value: 'season', label: 'Season', leftIcon: Trophy },
] as const;

const GAME_MODE_OPTIONS = [
  { value: 'combined', label: 'Combined', leftIcon: Layers },
  { value: 'top5', label: 'Top 5', leftIcon: Trophy },
  { value: 'h2h', label: 'H2H', leftIcon: Swords },
] as const;

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global', leftIcon: Globe },
  { value: 'following', label: 'Following', leftIcon: Users },
] as const;

// ─────────────────────────── Page ───────────────────────────

// Retains the last non-undefined value so tabs show cached data instead of a
// loader when their query is re-activated after being skipped.
function useStickyValue<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value !== undefined) {
    ref.current = value;
  }
  return ref.current;
}

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

// ─────────────────────────── Weekend Content ───────────────────────────

type RaceLeaderboardResult =
  | { status: 'visible'; reason: null; entries: LeaderboardEntry[] }
  | {
      status: 'locked';
      reason: 'sign_in' | 'no_prediction';
      entries: LeaderboardEntry[];
    }
  | undefined;

/**
 * Podium + ranked table shared by every leaderboard view. The season board
 * hides the consolation mini-board while more pages exist and appends its
 * load-more footer.
 */
function LeaderboardBoard({
  entries,
  gameMode,
  showSmallBoard = true,
  footer,
}: {
  entries: LeaderboardEntry[];
  gameMode: GameMode;
  showSmallBoard?: boolean;
  footer?: ReactNode;
}) {
  const podiumEntries = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  return (
    <div className="space-y-3">
      {podiumEntries.length >= 3 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PodiumCard
            entry={podiumEntries[0]}
            place={1}
            className="order-1 sm:order-2"
          />
          <PodiumCard
            entry={podiumEntries[1]}
            place={2}
            className="order-2 sm:order-1"
          />
          <PodiumCard entry={podiumEntries[2]} place={3} className="order-3" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Player
              </th>
              {gameMode === 'combined' && (
                <>
                  <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                    Top 5
                  </th>
                  <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                    H2H
                  </th>
                </>
              )}
              {gameMode === 'h2h' && (
                <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                  Accuracy
                </th>
              )}
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {tableEntries.map((entry) =>
              gameMode === 'combined' ? (
                <CombinedTableRow
                  key={entry.userId}
                  entry={entry as CombinedLeaderboardEntry}
                />
              ) : gameMode === 'h2h' ? (
                <H2HTableRow
                  key={entry.userId}
                  entry={entry as H2HLeaderboardEntry}
                />
              ) : (
                <LeaderboardRow key={entry.userId} entry={entry} />
              ),
            )}
          </tbody>
        </table>

        {showSmallBoard && entries.length <= 3 && entries.length > 0 && (
          <SmallLeaderboard entries={entries} />
        )}
      </div>

      {footer}
    </div>
  );
}

function WeekendContent({
  defaultRace,
  scope,
  gameMode,
  isSignedIn,
  activeData,
}: {
  defaultRace: { _id: string; name: string; status: string } | null;
  scope: Scope;
  gameMode: GameMode;
  isSignedIn: boolean | undefined;
  activeData: RaceLeaderboardResult | null;
}) {
  if (!defaultRace) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <CalendarDays className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No races yet</h2>
        <p className="text-text-muted">
          Weekend leaderboards will appear once the season begins.
        </p>
      </div>
    );
  }

  if (scope === 'following') {
    return (
      <FollowingGuard>
        <WeekendFollowingContent
          defaultRace={defaultRace}
          gameMode={gameMode}
          isSignedIn={isSignedIn}
          activeData={activeData ?? undefined}
        />
      </FollowingGuard>
    );
  }

  if (activeData === undefined) {
    return <LeaderboardContentLoader />;
  }

  if (activeData === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Layers className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          Scores will appear once race results are published.
        </p>
      </div>
    );
  }

  const entries = activeData.entries;

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        {gameMode === 'h2h' ? (
          <Swords className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        ) : (
          <Trophy className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        )}
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          {defaultRace.status === 'finished'
            ? 'No predictions were submitted for this weekend.'
            : 'Scores will appear once race results are published.'}
        </p>
      </div>
    );
  }

  return <LeaderboardBoard entries={entries} gameMode={gameMode} />;
}

function WeekendFollowingContent({
  defaultRace,
  gameMode,
  isSignedIn,
  activeData,
}: {
  defaultRace: { _id: string; name: string; status: string };
  gameMode: GameMode;
  isSignedIn: boolean | undefined;
  activeData: RaceLeaderboardResult;
}) {
  // Treat as loading if: query pending OR Convex returned locked but Clerk says signed in
  // (transient state while auth token propagates to the Convex client)
  if (
    activeData === undefined ||
    (activeData.status === 'locked' &&
      activeData.reason === 'sign_in' &&
      isSignedIn)
  ) {
    return <LeaderboardContentLoader />;
  }

  if (activeData.status === 'locked') {
    return null;
  }

  const entries = activeData.entries;

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          No one here yet
        </h2>
        <p className="mb-4 text-text-muted">
          {defaultRace.status === 'finished'
            ? 'None of the people you follow submitted predictions for this weekend.'
            : 'Follow other players from their profile to see them here.'}
        </p>
        <p className="text-sm text-text-muted">
          Browse the global leaderboard to find players to follow.
        </p>
      </div>
    );
  }

  return <LeaderboardBoard entries={entries} gameMode={gameMode} />;
}

// ─────────────────────────── Season Content ───────────────────────────

function SeasonContent({
  scope,
  gameMode,
  seasonEntries,
  seasonHasMore,
  isLoadingMore,
  activeTotalCount,
  loadMoreSeason,
  seasonTop5Global,
  seasonH2HGlobal,
  seasonCombinedFollowing,
  seasonTop5Following,
  seasonH2HFollowing,
}: {
  scope: Scope;
  gameMode: GameMode;
  seasonEntries: CombinedLeaderboardEntry[];
  seasonHasMore: boolean;
  isLoadingMore: boolean;
  activeTotalCount: number;
  loadMoreSeason: () => void;
  seasonTop5Global:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: LeaderboardEntry | null;
      }
    | undefined;
  seasonH2HGlobal:
    | {
        entries: H2HLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: H2HLeaderboardEntry | null;
      }
    | undefined;
  seasonCombinedFollowing:
    | {
        entries: CombinedLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: CombinedLeaderboardEntry | null;
      }
    | undefined;
  seasonTop5Following:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: LeaderboardEntry | null;
      }
    | undefined;
  seasonH2HFollowing:
    | {
        entries: H2HLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: H2HLeaderboardEntry | null;
      }
    | undefined;
}) {
  if (scope === 'following') {
    const data =
      gameMode === 'combined'
        ? seasonCombinedFollowing
        : gameMode === 'top5'
          ? seasonTop5Following
          : seasonH2HFollowing;
    return (
      <FollowingGuard>
        <FollowingSeasonContent data={data} gameMode={gameMode} />
      </FollowingGuard>
    );
  }

  // Global season
  if (gameMode === 'top5') {
    if (seasonTop5Global === undefined) {
      return <LeaderboardContentLoader />;
    }
    return (
      <SeasonLeaderboardLayout
        entries={seasonTop5Global.entries}
        hasMore={seasonTop5Global.hasMore}
        totalCount={seasonTop5Global.totalCount}
        gameMode="top5"
        isLoadingMore={false}
        onLoadMore={() => {}}
      />
    );
  }

  if (gameMode === 'h2h') {
    if (seasonH2HGlobal === undefined) {
      return <LeaderboardContentLoader />;
    }
    return (
      <SeasonLeaderboardLayout
        entries={seasonH2HGlobal.entries as LeaderboardEntry[]}
        hasMore={seasonH2HGlobal.hasMore}
        totalCount={seasonH2HGlobal.totalCount}
        gameMode="h2h"
        isLoadingMore={false}
      />
    );
  }

  // Combined global (default) — supports pagination
  return (
    <SeasonLeaderboardLayout
      entries={seasonEntries}
      hasMore={seasonHasMore}
      totalCount={activeTotalCount}
      gameMode="combined"
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreSeason}
    />
  );
}

function SeasonLeaderboardLayout({
  entries,
  hasMore,
  totalCount,
  gameMode,
  isLoadingMore,
  onLoadMore,
}: {
  entries: LeaderboardEntry[];
  hasMore: boolean;
  totalCount: number;
  gameMode: GameMode;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div
        className="rounded-xl border border-border bg-surface p-8 text-center"
        data-testid="leaderboard-empty"
      >
        <Trophy className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          The leaderboard will populate once race results are published.
        </p>
      </div>
    );
  }

  return (
    <LeaderboardBoard
      entries={entries}
      gameMode={gameMode}
      showSmallBoard={!hasMore}
      footer={
        <div className="flex min-h-[3rem] flex-col items-center justify-center py-4">
          {hasMore && (
            <button
              type="button"
              disabled={isLoadingMore}
              onClick={onLoadMore}
              className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-surface-muted disabled:hover:text-text-muted"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                'Load more'
              )}
            </button>
          )}
          {!hasMore && entries.length > PAGE_SIZE && (
            <p className="text-sm text-text-muted">
              You've reached the end · {playerCountFormatter.format(totalCount)}{' '}
              players
            </p>
          )}
        </div>
      }
    />
  );
}

// ─────────────────────────── Following wrappers ───────────────────────────

function FollowingGuard({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LeaderboardContentLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          Sign in to see your friends
        </h2>
        <p className="mb-4 text-text-muted">
          Follow other players to compete against them on a private leaderboard.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return children;
}

function FollowingSeasonContent({
  data,
  gameMode,
}: {
  data:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
      }
    | undefined;
  gameMode: GameMode;
}) {
  if (data === undefined) {
    return <LeaderboardContentLoader />;
  }

  if (data.entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          No one here yet
        </h2>
        <p className="mb-4 text-text-muted">
          Follow other players from their profile to see them on this
          leaderboard.
        </p>
        <p className="text-sm text-text-muted">
          Browse the global leaderboard to find players to follow.
        </p>
      </div>
    );
  }

  return (
    <SeasonLeaderboardLayout
      entries={data.entries}
      hasMore={data.hasMore}
      totalCount={data.totalCount}
      gameMode={gameMode}
      isLoadingMore={false}
      onLoadMore={() => {}}
    />
  );
}

// ─────────────────────────── Shared Row Components ───────────────────────────

function CombinedTableRow({ entry }: { entry: CombinedLeaderboardEntry }) {
  return (
    <tr
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
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">{entry.top5Points}</span>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">{entry.h2hPoints}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

function H2HTableRow({ entry }: { entry: H2HLeaderboardEntry }) {
  return (
    <tr
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
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">
          {entry.correctPicks}/{entry.totalPicks}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
      data-testid="leaderboard-entry"
    >
      <td className="px-4 py-3" data-testid="position">
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="px-4 py-3" data-testid="username">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 text-right" data-testid="points">
        <span className="font-bold text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

function LeaderboardContentLoader() {
  return (
    <div className="py-15.25">
      <InlineLoader />
    </div>
  );
}

function SmallLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="p-4">
      {entries.map((entry) => (
        <Link
          key={entry.userId}
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className={`flex cursor-pointer items-center justify-between border-b border-border py-2 transition-colors last:border-0 hover:opacity-90 ${
            entry.isViewer ? 'rounded-lg bg-accent-muted px-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                entry.isViewer
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {entry.rank}
            </span>
            <span className="flex items-center gap-2 font-medium text-text">
              <span className="font-semibold text-accent">
                {entry.displayName ?? entry.username}
              </span>
              {entry.isViewer && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  YOU
                </span>
              )}
            </span>
          </div>
          <div className="text-right">
            <div className="font-bold text-accent">{entry.points} pts</div>
            {entry.raceCount !== undefined && (
              <div className="text-xs text-text-muted">
                {entry.raceCount} race{entry.raceCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  className = '',
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  className?: string;
}) {
  const podiumRank: 1 | 2 | 3 =
    entry.rank === 1 || entry.rank === 2 || entry.rank === 3
      ? entry.rank
      : place;
  const marginTop =
    podiumRank === 1 ? '' : podiumRank === 2 ? 'sm:mt-8' : 'sm:mt-12';
  const isFirst = podiumRank === 1;

  const borderStyle = entry.isViewer
    ? 'border-accent ring-2 ring-accent bg-surface'
    : isFirst
      ? 'border-warning/30 bg-surface'
      : 'border-border bg-surface';

  const Icon = isFirst ? Trophy : Medal;
  const glowColor = isFirst
    ? '#eab308'
    : podiumRank === 2
      ? '#C0C0C0'
      : '#cd7f32';
  const iconColor = isFirst
    ? 'text-warning'
    : podiumRank === 2
      ? 'text-[#C0C0C0]'
      : 'text-[#cd7f32]';
  const bgColor = isFirst
    ? 'bg-warning/20'
    : podiumRank === 2
      ? 'bg-[#C0C0C0]/20'
      : 'bg-[#cd7f32]/20';
  const badgeRing = isFirst
    ? 'ring-1 ring-warning/50'
    : podiumRank === 2
      ? 'ring-1 ring-[#C0C0C0]/50'
      : 'ring-1 ring-[#cd7f32]/50';
  const textColor = isFirst
    ? 'text-warning'
    : podiumRank === 2
      ? 'text-[#C0C0C0]'
      : 'text-[#cd7f32]';
  const placeLabels = { 1: '1st', 2: '2nd', 3: '3rd' };

  return (
    <Link
      to="/p/$username"
      params={{ username: entry.username }}
      search={{ from: undefined, fromLabel: undefined }}
      className={`${className} ${marginTop} relative block cursor-pointer rounded-xl border p-3 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${borderStyle}`}
    >
      {/* Desktop: YOU badge top-right */}
      {entry.isViewer && (
        <span className="absolute top-2 right-2 hidden rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
          YOU
        </span>
      )}

      {/* Mobile: horizontal layout */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${badgeRing}`}
            style={{ filter: `drop-shadow(0 0 10px ${glowColor}cc)` }}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div
            className={`text-base font-bold ${textColor}`}
            style={{ textShadow: `0 0 12px ${glowColor}99` }}
          >
            {placeLabels[podiumRank]}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {entry.isViewer && (
              <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                YOU
              </span>
            )}
            <span className="truncate text-sm font-semibold text-accent">
              {entry.displayName ?? entry.username}
            </span>
          </div>
          <div className="text-sm font-bold text-text">
            {entry.points} points
          </div>
        </div>
      </div>

      {/* Desktop: vertical centered layout */}
      <div className="hidden sm:block">
        <div
          className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${badgeRing}`}
          style={{ filter: `drop-shadow(0 0 10px ${glowColor}cc)` }}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div
          className={`text-center text-xl font-bold ${textColor}`}
          style={{ textShadow: `0 0 12px ${glowColor}99` }}
        >
          {placeLabels[podiumRank]}
        </div>
        <div className="mt-1 truncate text-center text-sm font-semibold text-accent">
          {entry.displayName ?? entry.username}
        </div>
        <div className="text-center text-sm font-bold text-text">
          {entry.points} points
        </div>
      </div>
    </Link>
  );
}
