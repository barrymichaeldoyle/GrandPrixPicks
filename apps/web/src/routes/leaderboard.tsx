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

import { RaceFlag } from '@/components/RaceFlag';
import { TabSwitch } from '@/components/TabSwitch';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { isRaceSelectableForLeaderboard } from '@/lib/raceSessions';
import {
  breadcrumbSchema,
  CURRENT_SEASON,
  pageMeta,
  siteConfig,
} from '@/lib/site';

import { withLoaderSpan } from '@/lib/loaderSpan';
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
  // Two waves, and both earn their place: the second needs `selectedRace` from
  // the first. Note the season leaderboard deliberately stays in the second
  // wave even though it depends on nothing — it is the slowest query here, so
  // moving it up would make the cheap metadata wave wait for it and then still
  // pay for the race leaderboard afterwards.
  loader: ({ context, deps }) =>
    withLoaderSpan('/leaderboard', 2, async () => {
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
    }),
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
      // Fresh page-one data replaces the imperative pagination accumulator.
      // oxlint-disable-next-line react/set-state-in-effect
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
  // The card is a rank badge, so it only exists once there is a rank. Someone
  // who has not scored this weekend got "Not ranked this weekend" next to a
  // dash, which reads as a status report on a player who has done nothing
  // wrong; the board below already tells them they are not on it.
  // Username, not display name, and on every tab. This card labels the
  // viewer's own row in a table that now names everyone by username; resolving
  // a display name here would print their real name above a board of handles,
  // and reading a different name on the league tab than on the season tab
  // makes the card look like it is describing someone else.
  const standingName =
    headerViewerEntry?.username ?? viewer?.username ?? 'Your standing';

  const playerCountSuffix =
    activeTotalCount && activeTotalCount > 0
      ? ` · ${playerCountFormatter.format(activeTotalCount)} ${activeTotalCount === 1 ? 'player' : 'players'}`
      : '';

  // The weekend board is about one venue, so it gets that venue's flag — the
  // same mark the race pages and the rail's latest result carry, so "which
  // race am I looking at" is answerable without reading. The season board has
  // no single country to show and stays text.
  const weekendCountryCode =
    timeScope === 'weekend' && selectedRace
      ? getCountryCodeForRace({ slug: selectedRace.slug })
      : null;

  const heroSubtitle =
    timeScope === 'weekend' && selectedRace ? (
      <span className="inline-flex items-center gap-2">
        {weekendCountryCode ? (
          <RaceFlag
            countryCode={weekendCountryCode}
            size="sm"
            className="shrink-0 overflow-hidden rounded-sm border border-border"
          />
        ) : null}
        <span>
          {selectedRace.season} {selectedRace.name}
          {playerCountSuffix}
        </span>
      </span>
    ) : (
      `${season} Season Standings${playerCountSuffix}`
    );

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
          title="Leaderboard"
          subtitle={
            <>
              <p>{heroSubtitle}</p>
              <p className="mt-1">
                Looking for the real-world points?{' '}
                <Link
                  to="/f1-standings"
                  className="inline-block font-medium whitespace-nowrap text-accent underline-offset-2 hover:underline"
                >
                  F1 championship standings
                </Link>
              </p>
            </>
          }
          actionsPlacement="trailing"
          actions={
            isSignedIn && headerViewerEntry ? (
              <div className="min-h-14">
                <AnimatePresence mode="wait">
                  <m.div
                    key={timeScope}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="flex shrink-0 items-center gap-3 rounded-lg bg-accent-muted px-3 py-2"
                  >
                    <span className="gpp-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-sm font-semibold text-text-on-accent">
                      {headerViewerEntry.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
                        Your standing
                      </div>
                      <div className="truncate text-sm font-semibold text-text">
                        {standingName}
                      </div>
                      <div className="text-sm font-semibold text-accent">
                        {headerViewerEntry.points} pts
                      </div>
                    </div>
                  </m.div>
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
          {/* Row 1: which board, and whose. Two different questions, but the
              scope switch only ever needs ~14rem, so it rides on the end of the
              time-scope row instead of spending a whole line to sit half-empty.
              Stacked on mobile, where there is no width to share. */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <TabSwitch
              value={timeScope}
              onChange={(v) =>
                navigate({
                  search: (prev) => ({ ...prev, time: v }),
                  replace: true,
                })
              }
              options={[...TIME_SCOPE_OPTIONS]}
              className="flex gap-1 rounded-lg bg-surface-muted/55 p-1 sm:flex-1"
              buttonClassName="flex-1"
              ariaLabel="Leaderboard time scope"
            />

            {isSignedIn && (
              <TabSwitch
                value={scope}
                onChange={(v) =>
                  navigate({
                    search: (prev) => ({ ...prev, scope: v }),
                    replace: true,
                  })
                }
                options={[...SCOPE_OPTIONS]}
                className="flex shrink-0 gap-1 rounded-lg bg-surface-muted/40 p-1 sm:w-56"
                buttonClassName="flex-1"
                ariaLabel="Leaderboard scope"
              />
            )}
          </div>

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

        <LeaderboardExplainer />
      </div>
    </AppPageLayout>
  );
}

/**
 * Editorial footer for the standings. The table above is the point of the page,
 * but a ranked list of names explains nothing on its own: a visitor who has not
 * played cannot tell what a points total means, why two players can tie, or
 * what separates the weekend view from the season view. This answers that in
 * prose rather than sending people to /how-to-play to find out.
 */
function LeaderboardExplainer() {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-title text-2xl font-semibold text-text">
        How these standings are scored
      </h2>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Every player ranks the five drivers they expect to finish at the front
        of each session of a race weekend. Scoring is order-sensitive, so where
        you put a driver matters as much as whether you picked them at all. An
        exact position match is worth 5 points. Being off by a single position
        is worth 3, which is also what you get for a driver you placed fifth who
        finished sixth. A driver who does finish in the actual top five but two
        or more places away from where you put them is worth 1 point. Everything
        else scores nothing.
      </p>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        That caps a perfect session at 25 points. Head-to-Head picks are scored
        separately and more simply. You earn one point when the driver you chose
        finishes ahead of their team-mate. The totals here combine both games.
      </p>
      <h2 className="font-title mt-10 text-2xl font-semibold text-text">
        Weekend and season views
      </h2>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The weekend view ranks players on a single race weekend, added up across
        every session that weekend held. Because qualifying, the sprint and the
        race are each scored on their own, a player can lose the race badly and
        still finish the weekend high. The season view is the running total of
        every session scored so far, which is the standing that decides who
        finishes the year in front.
      </p>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Ties are shown as shared ranks rather than broken arbitrarily, so two
        players on the same total both hold the position and the next rank skips
        accordingly. Scores appear here once an{' '}
        <Link
          to="/results-policy"
          className="font-medium text-accent hover:underline"
        >
          official classification
        </Link>{' '}
        is published for a session, which means the standings can move after the
        flag if a stewards' decision changes the result.
      </p>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        New to it?{' '}
        <Link
          to="/how-to-play"
          className="font-medium text-accent hover:underline"
        >
          How to play
        </Link>{' '}
        walks through a full weekend, and the{' '}
        <Link to="/guides" className="font-medium text-accent hover:underline">
          F1 guides
        </Link>{' '}
        cover the sport itself rather than the game.
      </p>
    </section>
  );
}
