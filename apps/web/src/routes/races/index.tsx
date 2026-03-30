import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { Calendar } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { DevNowPanel } from '../../components/DevNowPanel';
import { PageHero } from '../../components/PageHero';
import { RaceCard } from '../../components/RaceCard';
import { canonicalMeta, defaultOgImage } from '../../lib/site';
import { useNow } from '../../lib/testing/now';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/races/')({
  component: RacesPage,
  loader: async () => {
    const [races, nextRace] = await Promise.all([
      convex.query(api.races.listRaces, { season: 2026 }),
      convex.query(api.races.getNextRace),
    ]);
    return { races, nextRace };
  },
  head: () => {
    const title = '2026 F1 Race Calendar & Predictions | Grand Prix Picks';
    const description =
      'Browse the full 2026 Formula 1 calendar. Make your top 5 predictions for upcoming Grands Prix, track results, and climb the season leaderboard.';
    const canonical = canonicalMeta('/races');
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

function RacesPage() {
  const { races, nextRace } = Route.useLoaderData();
  const now = useNow(0);
  const nextRaceRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToNextRaceRef = useRef(false);
  const orderedRaces = [...races].sort((a, b) => a.round - b.round);

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

  useEffect(() => {
    if (hasScrolledToNextRaceRef.current || nextRaceRef.current == null) {
      return;
    }
    nextRaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    hasScrolledToNextRaceRef.current = true;
  }, []);

  const featuredRace =
    nextRace ??
    orderedRaces.find((race) => race.status !== 'cancelled') ??
    null;

  return (
    <>
      <div className="min-h-screen bg-page">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <PageHero
            eyebrow="Race Calendar"
            title="2026 Season"
            subtitle="Predict the top 5 finishers for each Grand Prix"
          />

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {orderedRaces.map((race) => (
                  <div
                    key={race._id}
                    ref={
                      nextRace != null && nextRace._id === race._id
                        ? nextRaceRef
                        : null
                    }
                    className="scroll-mt-24"
                  >
                    <RaceCard
                      race={race}
                      isNext={nextRace != null && nextRace._id === race._id}
                      predictionOpenAt={getPredictionOpenAt(race)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {import.meta.env.DEV ? (
        <DevNowPanel race={featuredRace} now={now} />
      ) : null}
    </>
  );
}
