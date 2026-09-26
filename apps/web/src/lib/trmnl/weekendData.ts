import { api } from '@convex-generated/api';
import type { ConvexHttpClient } from 'convex/browser';

import type { TrmnlInput } from './payload';

type Race = NonNullable<TrmnlInput['race']>;

/** Everything the payload builder needs about one race, as the site has it now. */
export type TrmnlWeekendData = Pick<
  TrmnlInput,
  'race' | 'news' | 'results' | 'practice' | 'weather' | 'standings'
> & { race: Race };

/**
 * One race's data for the TRMNL payload, used by the polling endpoint and by
 * the `/trmnl` page, so the page cannot show a screen the endpoint would
 * build differently.
 *
 * Top fives are enough everywhere except the race and sprint results, which
 * the layouts show to tenth, so those two sessions read the full
 * classification. `weather` picks the forecast query: the endpoint wants the
 * live one, which goes quiet once the race is over; a replay of a finished
 * weekend wants the write-up's, which keeps the forecast the sessions ran in.
 */
export async function loadTrmnlWeekend(
  convex: Pick<ConvexHttpClient, 'query'>,
  race: Race,
  now: number,
  weather: 'live' | 'writeup' = 'live',
): Promise<TrmnlWeekendData> {
  const [news, top5, practice, forecast, raceResult, sprintResult, standings] =
    await Promise.all([
      convex.query(api.raceNews.list, { raceSlug: race.slug }),
      convex.query(api.results.getEnrichedTop5BySessionForRaceSlug, {
        raceSlug: race.slug,
      }),
      convex.query(api.practiceResults.getPracticeSessionSummariesForRace, {
        raceId: race._id,
      }),
      weather === 'live'
        ? convex.query(api.weather.getByRaceSlug, { raceSlug: race.slug, now })
        : convex.query(api.weather.getForWriteup, { raceSlug: race.slug, now }),
      convex.query(api.results.getResultForRace, {
        raceId: race._id,
        sessionType: 'race',
      }),
      race.hasSprint
        ? convex.query(api.results.getResultForRace, {
            raceId: race._id,
            sessionType: 'sprint',
          })
        : null,
      convex.query(api.f1Standings.getF1Championship, {
        season: race.season,
      }),
    ]);

  return {
    race,
    news: news.items,
    results: {
      ...top5,
      ...(raceResult ? { race: raceResult.enrichedClassification } : {}),
      ...(sprintResult ? { sprint: sprintResult.enrichedClassification } : {}),
    },
    practice: practice?.sessions ?? [],
    weather: forecast,
    standings,
  };
}

/**
 * What the off-season screen needs: the season's championship tables and the
 * site's race-independent news. Used by the polling endpoint, and by the
 * `/trmnl` page for its standings.
 */
export async function loadTrmnlOffSeason(
  convex: Pick<ConvexHttpClient, 'query'>,
  season: number,
): Promise<Pick<TrmnlInput, 'standings' | 'news'>> {
  const [championship, news] = await Promise.all([
    convex.query(api.f1Standings.getF1Championship, { season }),
    convex.query(api.globalNews.listRecent, { limit: 4 }),
  ]);
  return {
    standings: championship,
    news,
  };
}
