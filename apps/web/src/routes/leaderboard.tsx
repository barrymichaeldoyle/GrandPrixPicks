import { AppPageLayout, RailItem } from '@/components/AppPageLayout';
import { MyLeaguesCard } from '@/components/dashboard/MyLeaguesCard';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { RailFooterLinks } from '@/components/dashboard/RailFooterLinks';
import { SuggestedFollowsCard } from '@/components/dashboard/SuggestedFollowsCard';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { TabSwitch } from '@/components/TabSwitch';
import { isRaceSelectableForLeaderboard } from '@/lib/raceSessions';
import {
  breadcrumbSchema,
  CURRENT_SEASON,
  pageMeta,
  siteConfig,
} from '@/lib/site';

import { PAGE_SIZE, playerCountFormatter } from './-leaderboard/constants';
import { SCOPE_OPTIONS, TIME_SCOPE_OPTIONS } from './-leaderboard/options';
import { SeasonContent } from './-leaderboard/SeasonContent';
import type { LeaderboardEntry, Scope, TimeScope } from './-leaderboard/types';
import { useStickyValue } from '@/hooks/useStickyValue';
import { WeekendContent } from './-leaderboard/WeekendContent';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { time?: TimeScope; scope?: Scope; raceId?: string } => {
    const time =
      search.time === 'weekend' || search.time === 'season'
        ? search.time
        : undefined;
    const scope =
      search.scope === 'global' || search.scope === 'following'
        ? search.scope
        : undefined;
    const raceId =
      typeof search.raceId === 'string' ? search.raceId : undefined;
    return { time, scope, raceId };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const [defaultRace, currentSeason] = await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.races.getWeekendLeaderboardRace, {}),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.races.listCurrentSeason),
      ),
    ]);
    const allRaces = currentSeason.races;
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
    return {
      defaultRace,
      allRaces,
      season: currentSeason.season,
      initialSeason,
      initialWeekend,
    };
  },
  head: () => {
    const meta = pageMeta({
      title: `${CURRENT_SEASON} F1 Prediction Leaderboard | Grand Prix Picks`,
      description: `See who tops the ${CURRENT_SEASON} F1 prediction standings. Track your ranking, compare scores, and compete with friends across every race weekend.`,
      path: '/leaderboard',
    });
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${siteConfig.url}/leaderboard#page`,
                url: `${siteConfig.url}/leaderboard`,
                name: `${CURRENT_SEASON} F1 prediction leaderboard`,
                description:
                  'Season standings for the Grand Prix Picks F1 prediction game, with Top 5 and Head-to-Head points combined into one total.',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/leaderboard', [
                { name: 'Leaderboard', path: '/leaderboard' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function LeaderboardPage() {
  const { defaultRace, allRaces, season, initialSeason, initialWeekend } =
    Route.useLoaderData();
  // SSR-resolved so the signed-in-only scope selector is present on the first
  // paint instead of popping in (and shifting the row) once Clerk boots.
  const { isSignedIn } = useViewerSession();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: viewer } = useQuery(
    convexQuery(api.users.me, isSignedIn ? {} : 'skip'),
  );
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
  const [seasonEntries, setSeasonEntries] = useState<LeaderboardEntry[]>(
    initialSeason.entries as LeaderboardEntry[],
  );
  const [seasonOffset, setSeasonOffset] = useState(PAGE_SIZE);
  const [seasonHasMore, setSeasonHasMore] = useState(initialSeason.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: clientSeasonCombined } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedSeasonLeaderboard,
      timeScope === 'season' && scope === 'global'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );
  const { data: seasonCombinedFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getFriendsCombinedLeaderboard,
      timeScope === 'season' && scope === 'following'
        ? { limit: PAGE_SIZE }
        : 'skip',
    ),
  );

  const { data: weekendGlobal } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedRaceLeaderboard,
      timeScope === 'weekend' && scope === 'global' && selectedRaceId
        ? { raceId: selectedRaceId }
        : 'skip',
    ),
  );
  const { data: weekendFollowing } = useQuery(
    convexQuery(
      api.leaderboards.getCombinedRaceLeaderboard,
      timeScope === 'weekend' && scope === 'following' && selectedRaceId
        ? { raceId: selectedRaceId, friendsOnly: true }
        : 'skip',
    ),
  );

  const stickySeasonCombinedFollowing = useStickyValue(seasonCombinedFollowing);
  const stickyWeekendGlobal = useStickyValue(weekendGlobal);
  const stickyWeekendFollowing = useStickyValue(weekendFollowing);

  const seasonCombinedData = clientSeasonCombined ?? initialSeason;

  // Sync season combined entries on fresh client data
  useEffect(() => {
    if (clientSeasonCombined && seasonOffset === PAGE_SIZE) {
      setSeasonEntries(clientSeasonCombined.entries as LeaderboardEntry[]);
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
        ...(more.entries as LeaderboardEntry[]),
      ]);
      setSeasonOffset((prev) => prev + PAGE_SIZE);
      setSeasonHasMore(more.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // One canonical total-points board. Scope only changes whose totals appear.
  const activeWeekendData =
    scope === 'global'
      ? (stickyWeekendGlobal ??
        (selectedRaceId === selectedRace?._id ? initialWeekend : null))
      : stickyWeekendFollowing;
  const activeSeasonData =
    scope === 'global' ? seasonCombinedData : stickySeasonCombinedFollowing;

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
          (e) => e.isViewer || e.userId === viewer?._id,
        ) ?? null
      );
    }
    return activeSeasonData?.viewerEntry ?? null;
  })();

  const activeTotalCount =
    timeScope === 'weekend'
      ? (activeWeekendData?.entries.length ?? 0)
      : (activeSeasonData?.totalCount ?? 0);

  const activeViewKey = `${timeScope}:${scope}`;
  const showStandingCard =
    headerViewerEntry != null || (timeScope === 'weekend' && isSignedIn);
  const standingName =
    (headerViewerEntry as LeaderboardEntry | null)?.displayName ??
    headerViewerEntry?.username ??
    viewer?.displayName ??
    viewer?.username ??
    'Your standing';

  const heroSubtitle =
    timeScope === 'weekend' && selectedRace
      ? `${selectedRace.season} ${selectedRace.name}${
          activeTotalCount > 0
            ? ` · ${playerCountFormatter.format(activeTotalCount)} ${activeTotalCount === 1 ? 'player' : 'players'}`
            : ''
        }`
      : `${season} Season Standings${
          activeTotalCount && activeTotalCount > 0
            ? ` · ${playerCountFormatter.format(activeTotalCount)} ${activeTotalCount === 1 ? 'player' : 'players'}`
            : ''
        }`;

  return (
    <AppPageLayout
      // Public route: logged-out visitors (and crawlers) get the board on its
      // own, full width, with none of the signed-in furniture around it.
      leftLabel={isSignedIn ? 'Profile and quick links' : undefined}
      left={
        isSignedIn ? (
          <>
            <RailItem hideOnMobile>
              <ProfileCard me={viewer} />
            </RailItem>
            <RailItem order={3}>
              <QuickLinksCard />
            </RailItem>
          </>
        ) : undefined
      }
      rightLabel={isSignedIn ? 'Leagues and suggestions' : undefined}
      right={
        isSignedIn ? (
          <>
            <RailItem order={1}>
              <MyLeaguesCard />
            </RailItem>
            <RailItem order={2}>
              <SuggestedFollowsCard />
            </RailItem>
            <RailItem order={4}>
              <RailFooterLinks />
            </RailItem>
          </>
        ) : undefined
      }
    >
      <div>
        <PageHeader
          eyebrow={timeScope === 'weekend' ? 'Race weekend' : 'Season rankings'}
          title="Leaderboard"
          subtitle={
            <>
              <p>{heroSubtitle}</p>
              <p className="mt-1">
                Looking for the real-world points?{' '}
                <Link
                  to="/f1-standings"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  F1 championship standings
                </Link>
              </p>
            </>
          }
          actionsPlacement="trailing"
          actions={
            isSignedIn ? (
              <div className="min-h-14">
                <AnimatePresence mode="wait">
                  {showStandingCard ? (
                    <m.div
                      key={timeScope}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="flex shrink-0 items-center gap-3 rounded-lg bg-accent-muted px-3 py-2"
                    >
                      <span className="gpp-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-sm font-semibold text-text-on-accent">
                        {headerViewerEntry?.rank ?? '—'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
                          Your standing
                        </div>
                        <div className="truncate text-sm font-semibold text-text">
                          {standingName}
                        </div>
                        {headerViewerEntry ? (
                          <div className="text-sm font-semibold text-accent">
                            {headerViewerEntry.points} pts
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-text-muted">
                            Not ranked this weekend
                          </div>
                        )}
                      </div>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : undefined
          }
        />

        {/* Filters */}
        <div
          className="reveal-up reveal-delay-1 mb-6 flex flex-col gap-2.5"
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
            className="flex gap-1 rounded-lg bg-surface-muted/55 p-1"
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

          {isSignedIn && (
            <div className="sm:w-56">
              <TabSwitch
                value={scope}
                onChange={(v) =>
                  navigate({
                    search: (prev) => ({ ...prev, scope: v }),
                    replace: true,
                  })
                }
                options={[...SCOPE_OPTIONS]}
                className="flex gap-1 rounded-lg bg-surface-muted/40 p-1"
                buttonClassName="flex-1"
                ariaLabel="Leaderboard scope"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {timeScope === 'weekend' ? (
          <WeekendContent
            key={activeViewKey}
            defaultRace={selectedRace}
            scope={scope}
            isSignedIn={isSignedIn}
            activeData={activeWeekendData}
          />
        ) : (
          <SeasonContent
            key={activeViewKey}
            scope={scope}
            seasonEntries={seasonEntries}
            seasonHasMore={seasonHasMore}
            isLoadingMore={isLoadingMore}
            activeTotalCount={activeTotalCount ?? 0}
            loadMoreSeason={() => void loadMoreSeason()}
            seasonCombinedFollowing={stickySeasonCombinedFollowing}
          />
        )}
      </div>
    </AppPageLayout>
  );
}
