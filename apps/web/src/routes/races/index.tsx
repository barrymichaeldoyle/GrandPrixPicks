import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { RaceCard } from '@/components/RaceCard';
import { convexHttp as convex } from '@/integrations/convex/client';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { withRetry } from '@/lib/retry';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/races/')({
  component: RacesPage,
  loader: async () => {
    // The practice slugs drive the practice-results index below. Those pages
    // are in the sitemap but the only in-app link to them lives in a
    // client-only Convex card, so without this list they have no
    // server-rendered inbound link at all and read as orphans to a crawler.
    const [races, nextRace, practiceSlugs] = await Promise.all([
      withRetry(() => convex.query(api.races.listRaces, { season: 2026 })),
      withRetry(() => convex.query(api.races.getNextRace)),
      withRetry(() =>
        convex.query(api.practiceResults.listRaceSlugsWithPracticeResults),
      ),
    ]);
    return { races, nextRace, practiceSlugs };
  },
  head: ({ loaderData }) => {
    const meta = pageMeta({
      title: '2026 F1 Race Calendar & Predictions | Grand Prix Picks',
      description:
        'Browse the full 2026 Formula 1 calendar. Make your top 5 predictions for upcoming Grands Prix, track results, and climb the season leaderboard.',
      path: '/races',
    });

    // Only the selected tab's races are in the markup, so the ItemList is the
    // one place a crawler sees the whole calendar from this page.
    const races = [...(loaderData?.races ?? [])].sort(
      (a, b) => a.round - b.round,
    );

    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'CollectionPage',
                '@id': `${siteConfig.url}/races#page`,
                url: `${siteConfig.url}/races`,
                name: '2026 F1 race calendar',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/races', [{ name: 'Races', path: '/races' }]),
              {
                '@type': 'ItemList',
                '@id': `${siteConfig.url}/races#calendar`,
                name: '2026 Formula 1 race calendar',
                numberOfItems: races.length,
                itemListElement: races.map((race, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: race.name,
                  url: `${siteConfig.url}/races/${race.slug}`,
                })),
              },
            ],
          }),
        },
      ],
    };
  },
});

function RacesPage() {
  const { races, nextRace, practiceSlugs } = Route.useLoaderData();
  const now = useNow(0);
  const [view, setView] = useState<'upcoming' | 'completed' | 'all'>(
    'upcoming',
  );
  const orderedRaces = [...races].sort((a, b) => a.round - b.round);
  // Rendered independently of the Upcoming/Completed filter so the links are
  // always in the SSR markup, not just when a crawler happens to see the
  // completed tab.
  const practiceSlugSet = new Set(practiceSlugs);
  const practiceRaces = orderedRaces.filter((race) =>
    practiceSlugSet.has(race.slug),
  );
  const displayedRaces = orderedRaces.filter((race) => {
    if (view === 'all') {
      return true;
    }
    const isCompleted =
      race.status === 'finished' || race.status === 'cancelled';
    if (view === 'completed') {
      return isCompleted;
    }
    return !isCompleted && (nextRace == null || race.round >= nextRace.round);
  });
  const completedCount = orderedRaces.filter(
    (race) => race.status === 'finished' || race.status === 'cancelled',
  ).length;
  const upcomingCount = orderedRaces.filter(
    (race) =>
      race.status !== 'finished' &&
      race.status !== 'cancelled' &&
      (nextRace == null || race.round >= nextRace.round),
  ).length;

  // When predictions open for a race = previous non-cancelled race's start
  function getPredictionOpenAt(race: (typeof races)[0]) {
    if (race.round <= 1) {
      return null;
    }
    const prev = races
      .filter(
        (r) =>
          r.season === race.season &&
          r.round < race.round &&
          r.status !== 'cancelled',
      )
      .sort((a, b) => b.round - a.round)
      .at(0);
    return prev !== undefined ? prev.raceStartAt : null;
  }

  const featuredRace =
    nextRace ??
    orderedRaces.find((race) => race.status !== 'cancelled') ??
    null;
  const displayedFeaturedRace = displayedRaces.find(
    (race) => race._id === nextRace?._id,
  );
  const compactRaces = displayedFeaturedRace
    ? displayedRaces.filter((race) => race._id !== displayedFeaturedRace._id)
    : displayedRaces;

  return (
    <>
      <div className="min-h-screen bg-page">
        <div className="mx-auto max-w-(--page-max) px-4 py-6">
          {races.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto mb-4 h-16 w-16 text-text-muted" />
              <h2 className="mb-2 text-xl font-semibold text-text">
                No races scheduled yet
              </h2>
              <p className="text-text-muted">
                Check back soon for the 2026 race calendar
              </p>
            </div>
          ) : (
            <div className="reveal-up reveal-delay-2">
              <PageHeader
                eyebrow="2026 season"
                title="Race calendar"
                subtitle="Pick the top five before each session locks."
                actionsPlacement="trailing"
                actions={
                  <div
                    className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted/55 p-1 sm:w-auto sm:min-w-md"
                    role="group"
                    aria-label="Filter races"
                  >
                    <Button
                      type="button"
                      variant="tab"
                      size="tab"
                      active={view === 'upcoming'}
                      aria-pressed={view === 'upcoming'}
                      onClick={() => setView('upcoming')}
                    >
                      Upcoming
                      <span className="ml-1 hidden text-xs opacity-75 sm:inline">
                        {upcomingCount}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="tab"
                      size="tab"
                      active={view === 'completed'}
                      aria-pressed={view === 'completed'}
                      onClick={() => setView('completed')}
                    >
                      Completed
                      <span className="ml-1 hidden text-xs opacity-75 sm:inline">
                        {completedCount}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="tab"
                      size="tab"
                      active={view === 'all'}
                      aria-pressed={view === 'all'}
                      onClick={() => setView('all')}
                    >
                      All
                      <span className="ml-1 hidden text-xs opacity-75 sm:inline">
                        {orderedRaces.length}
                      </span>
                    </Button>
                  </div>
                }
              />
              {displayedFeaturedRace ? (
                <div className="mb-6 max-w-3xl">
                  <p className="mb-2 text-xs font-semibold tracking-label text-text-muted uppercase">
                    Next event
                  </p>
                  <RaceCard
                    race={displayedFeaturedRace}
                    isNext
                    predictionOpenAt={getPredictionOpenAt(
                      displayedFeaturedRace,
                    )}
                  />
                </div>
              ) : null}

              {compactRaces.length > 0 ? (
                <div className="divide-y divide-border/35">
                  {compactRaces.map((race) => (
                    <RaceCard
                      key={race._id}
                      race={race}
                      compact
                      predictionOpenAt={getPredictionOpenAt(race)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {practiceRaces.length > 0 ? (
            <nav
              aria-label="Practice results by round"
              className="mt-10 border-t border-border pt-6"
            >
              <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
                Practice results
              </p>
              <h2 className="font-title mt-1 text-xl font-semibold text-text">
                Free practice classifications
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                FP1, FP2 and FP3 lap times and gaps for every round that has
                run.
              </p>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {practiceRaces.map((race) => (
                  <li key={race._id}>
                    <Link
                      to="/races/$raceSlug/practice"
                      params={{ raceSlug: race.slug }}
                      className="text-accent hover:text-accent-hover"
                    >
                      Round {race.round}: {race.name} practice results
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={featuredRace} now={now} />
      ) : null}
    </>
  );
}
