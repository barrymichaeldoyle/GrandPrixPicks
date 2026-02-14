import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { Calendar } from 'lucide-react';

import { api } from '../../../convex/_generated/api';
import { RaceCard } from '../../components/RaceCard';
import { canonicalMeta, ogBaseUrl } from '../../lib/site';

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
        { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function RacesPage() {
  const { races, nextRace } = Route.useLoaderData();

  const upcomingRaces = races.filter((r) => r.status === 'upcoming');
  const lockedRaces = races.filter((r) => r.status === 'locked');
  const finishedRaces = races.filter((r) => r.status === 'finished');

  // When predictions open for a race = previous race's start (same season, round - 1)
  const getPredictionOpenAt = (race: (typeof races)[0]) => {
    if (race.round <= 1) return null;
    const prev = races.find(
      (r) => r.season === race.season && r.round === race.round - 1,
    );
    return prev?.raceStartAt ?? null;
  };

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-8 flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h1 className="text-3xl font-bold text-text">2026 Season</h1>
          <p className="text-text-muted md:text-base">
            Predict the top 5 finishers for each Grand Prix
          </p>
        </header>

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
          <div className="space-y-8">
            {upcomingRaces.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                  <span
                    className="h-2 w-2 rounded-full bg-success"
                    aria-hidden="true"
                  ></span>
                  Upcoming Races
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {upcomingRaces.map((race) => (
                    <RaceCard
                      key={race._id}
                      race={race}
                      isNext={
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nextRace can be undefined at runtime
                        nextRace != null && nextRace._id === race._id
                      }
                      predictionOpenAt={getPredictionOpenAt(race)}
                    />
                  ))}
                </div>
              </section>
            )}

            {lockedRaces.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                  <span
                    className="h-2 w-2 rounded-full bg-warning"
                    aria-hidden="true"
                  ></span>
                  In Progress
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lockedRaces.map((race) => (
                    <RaceCard key={race._id} race={race} />
                  ))}
                </div>
              </section>
            )}

            {finishedRaces.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                  <span
                    className="h-2 w-2 rounded-full bg-text-muted"
                    aria-hidden="true"
                  ></span>
                  Completed
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {finishedRaces.map((race) => (
                    <RaceCard key={race._id} race={race} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
