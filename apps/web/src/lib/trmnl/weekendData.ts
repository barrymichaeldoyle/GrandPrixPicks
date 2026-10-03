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
 * Every session reads its full classification: the race and sprint results
 * show to tenth and beyond, and the full screen's timeline shows each
 * session's first six, one past the top five a pick is scored on. `weather` picks the forecast query: the endpoint wants the
 * live one, which goes quiet once the race is over; a replay of a finished
 * weekend wants the write-up's, which keeps the forecast the sessions ran in.
 *
 * `news` here is always `race`'s own pool. The polling endpoint swaps it for
 * the next round's once `race` has a result (see `weekend.get.ts`); a replay
 * on the `/trmnl` page filters this same pool down to a moment in the past
 * instead, so it must stay tied to `race`.
 */
export async function loadTrmnlWeekend(
  convex: Pick<ConvexHttpClient, 'query'>,
  race: Race,
  now: number,
  weather: 'live' | 'writeup' = 'live',
): Promise<TrmnlWeekendData> {
  const [
    news,
    practice,
    forecast,
    qualiResult,
    raceResult,
    sprintQualiResult,
    sprintResult,
    standings,
  ] = await Promise.all([
    convex.query(api.raceNews.list, { raceSlug: race.slug }),
    convex.query(api.practiceResults.getPracticeSessionSummariesForRace, {
      raceId: race._id,
    }),
    weather === 'live'
      ? convex.query(api.weather.getByRaceSlug, { raceSlug: race.slug, now })
      : convex.query(api.weather.getForWriteup, { raceSlug: race.slug, now }),
    convex.query(api.results.getResultForRace, {
      raceId: race._id,
      sessionType: 'quali',
    }),
    convex.query(api.results.getResultForRace, {
      raceId: race._id,
      sessionType: 'race',
    }),
    race.hasSprint
      ? convex.query(api.results.getResultForRace, {
          raceId: race._id,
          sessionType: 'sprint_quali',
        })
      : null,
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
      ...(qualiResult ? { quali: qualiResult.enrichedClassification } : {}),
      ...(sprintQualiResult
        ? { sprint_quali: sprintQualiResult.enrichedClassification }
        : {}),
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
