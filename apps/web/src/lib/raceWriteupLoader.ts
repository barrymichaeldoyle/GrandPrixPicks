import { api } from '@convex-generated/api';
import type { QueryClient } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';

import { setRaceDataCacheHeaders } from './publicPageCacheHeaders';
import { routeQuery } from './routeQuery';
import { bucketWeatherNow } from './weatherNow';

/**
 * Everything a race write-up reads, in one round trip.
 *
 * Each write-up route used to carry its own copy of this: the same seven
 * queries, the same 404, the same return shape, so a fix to one (the weather
 * cache key, say) had to be made eleven times and was not always.
 *
 * `weatherNow` is the exact render time: the page derives its phase (open,
 * locked, finished) from it. Only the weather query's argument is bucketed to
 * the hour, so that query has a cache key that repeats.
 */
export async function loadRaceWriteup(
  queryClient: QueryClient,
  raceSlug: string,
) {
  await setRaceDataCacheHeaders();
  const weatherNow = Date.now();
  const [
    race,
    championship,
    weather,
    news,
    season,
    practice,
    nextRace,
    consensus,
    top5,
  ] = await Promise.all([
    queryClient.ensureQueryData(
      routeQuery(api.races.getRaceBySlug, { slug: raceSlug }),
    ),
    queryClient.ensureQueryData(
      routeQuery(api.f1Standings.getF1Championship, {}),
    ),
    queryClient.ensureQueryData(
      routeQuery(api.weather.getForWriteup, {
        raceSlug,
        now: bucketWeatherNow(weatherNow),
      }),
    ),
    queryClient.ensureQueryData(routeQuery(api.raceNews.list, { raceSlug })),
    queryClient.ensureQueryData(routeQuery(api.races.listCurrentSeason, {})),
    queryClient.ensureQueryData(
      routeQuery(api.practiceResults.getPracticeResultsForRaceSlug, {
        raceSlug,
      }),
    ),
    queryClient.ensureQueryData(routeQuery(api.races.getNextRace, {})),
    // How the field picked, and the official Top 5 it was scored against.
    // Both are what a finished write-up is an archive of, and both have to
    // be in the SSR HTML: the race page that also shows them is noindexed
    // and canonicalised here. The consensus is empty before a session locks.
    queryClient.ensureQueryData(
      routeQuery(api.consensus.getWeekendConsensusForRaceSlug, { raceSlug }),
    ),
    queryClient.ensureQueryData(
      routeQuery(api.results.getEnrichedTop5BySessionForRaceSlug, {
        raceSlug,
      }),
    ),
  ]);
  if (!race) {
    throw notFound();
  }
  return {
    race,
    championship,
    weather,
    weatherNow,
    news,
    season,
    practice,
    nextRace,
    consensus,
    top5,
  };
}

export type RaceWriteupData = Awaited<ReturnType<typeof loadRaceWriteup>>;
