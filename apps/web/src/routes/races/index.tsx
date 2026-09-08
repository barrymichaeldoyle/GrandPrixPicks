import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';

import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { RaceCard } from '@/components/RaceCard';
import { getRaceWriteup } from '@/lib/raceWriteups';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { routeQuery } from '@/lib/routeQuery';
import {
  breadcrumbSchema,
  CURRENT_SEASON,
  pageMeta,
  siteConfig,
} from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/races/')({
  component: RacesPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();

    const [currentSeason, nextRace] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.races.listCurrentSeason),
      ),
      context.queryClient.ensureQueryData(routeQuery(api.races.getNextRace)),
    ]);
    return {
      races: currentSeason.races,
      season: currentSeason.season,
      nextRace,
    };
  },
  head: ({ loaderData }) => {
    // The year is loader data, not a literal. This page used to announce 2026
    // in its title, description and structured data, which meant a season
    // rollover silently shipped a calendar labelled with last year.
    const season = loaderData?.season ?? CURRENT_SEASON;
    const meta = pageMeta({
      title: `${season} F1 Race Calendar & Predictions | Grand Prix Picks`,
      description: `Browse the full ${season} Formula 1 calendar. Make your top 5 predictions for upcoming Grands Prix, track results, and climb the season leaderboard.`,
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
                name: `${season} F1 race calendar`,
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/races', [{ name: 'Races', path: '/races' }]),
              {
                '@type': 'ItemList',
                '@id': `${siteConfig.url}/races#calendar`,
                name: `${season} Formula 1 race calendar`,
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
  const {
    races: initialRaces,
    season: initialSeason,
    nextRace: initialNextRace,
  } = Route.useLoaderData();
  // These are also the observers that keep the loader's cache entries
  // subscribed; without them the entries would sit unwatched behind an
  // infinite stale time.
  const { data: liveSeason } = useQuery(
    routeQuery(api.races.listCurrentSeason),
  );
  const { data: liveNextRace } = useQuery(routeQuery(api.races.getNextRace));
  const races = liveSeason?.races ?? initialRaces;
  const season = liveSeason?.season ?? initialSeason;
  const nextRace = liveNextRace ?? initialNextRace;
  const now = useNow(0);
  const [view, setView] = useState<'upcoming' | 'completed' | 'all'>(
    'upcoming',
  );
  const orderedRaces = [...races].sort((a, b) => a.round - b.round);
  /*
   * The calendar is where a write-up gets found.
   *
   * Each one used to have exactly one inbound link, from its own race page,
   * which is a page Google visits rarely. That is why URL Inspection reported
   * "Referring page: None detected" for them: not because the link was missing,
   * but because nothing Google crawls often enough was pointing at it. The
   * same shape once fixed the orphaned practice pages; those are 301s now, so
   * the all-rounds list below is the only one of its kind left.
   */
  const previewRaces = orderedRaces.flatMap((race) => {
    const writeup = getRaceWriteup(race.slug);
    return writeup ? [{ race, writeup }] : [];
  });

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
                Check back soon for the {season} race calendar
              </p>
            </div>
          ) : (
            <div className="reveal-up reveal-delay-2">
              <PageHeader
                title={`${season} race calendar`}
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

          {/*
            Every round, linked, regardless of which tab is showing. The card
            grid above renders the selected filter only, so on a default load a
            crawler sees the upcoming races and nothing else, and a completed
            round would drop out of the crawlable site. It used to lean on the
            practice pages for that, which is one reason they were kept long
            after nobody read them; this list does the job on its own.
          */}
          {orderedRaces.length > 0 ? (
            <nav
              aria-label="All rounds"
              className="mt-10 border-t border-border pt-6"
            >
              <h2 className="font-title text-xl font-semibold text-text">
                Every round of the {season} season
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Session times, results and the picks you made, round by round.
              </p>
              <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {orderedRaces.map((race) => (
                  <li key={race._id}>
                    <Link
                      to="/races/$raceSlug"
                      params={{ raceSlug: race.slug }}
                      className="text-accent hover:text-accent-hover"
                    >
                      Round {race.round}: {race.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {previewRaces.length > 0 ? (
            <nav
              aria-label="Weekend previews"
              className="mt-10 border-t border-border pt-6"
            >
              <h2 className="font-title text-xl font-semibold text-text">
                Read up before you pick
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                What matters at the circuit, who is driving and what to watch in
                practice, for the rounds we have written up.
              </p>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {previewRaces.map(({ race, writeup }) => (
                  <li key={race._id}>
                    <Link
                      to={writeup.to}
                      className="text-accent hover:text-accent-hover"
                    >
                      Round {race.round}: {race.name} preview
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <nav
            aria-label="Plan your predictions"
            className="mt-10 border-t border-border pt-6"
          >
            <h2 className="font-title text-xl font-semibold text-text">
              Read the track before you pick
            </h2>
            {/* This used to open on the circuit index and offer it first.
                Venue character is written per weekend now, in the round's own
                preview above, so the block points at the method instead. */}
            <p className="gpp-reading-copy mt-2 max-w-3xl text-text-muted">
              Circuit character changes how closely the race tends to follow
              qualifying. Each round&rsquo;s preview above covers the track it
              is run on.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'how-to-predict-f1-top-five' }}
                className="font-medium text-accent hover:text-accent-hover"
              >
                Build a Top 5 prediction
              </Link>
            </div>
          </nav>
        </div>
      </div>
      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={featuredRace} now={now} />
      ) : null}
    </>
  );
}
