import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from '@/integrations/convex/query';

import { PracticeHighlights } from '@/components/PracticeHighlights';
import type {
  PracticeResults,
  TrackSessionSchedule,
} from '@/lib/practiceSessions';
import type { RaceWeather } from '@/lib/weatherPresentation';

import { liveOrSsr } from './dashboardState';

export type { PracticeResults };

/**
 * Every published free practice session's top six, between the picks card and
 * the feed.
 *
 * Practice times already exist on the race page, but a returning player lands
 * here, and "what happened in FP1 and FP2 while I was away" was a page away.
 *
 * Renders from the SSR seed (`home.getDashboardPageData`) so it neither pops
 * in under the feed after hydration nor holds the auth curtain; the live
 * query then keeps it current while a session is being published.
 */
export function DashboardPracticeCard({
  raceId,
  raceName,
  raceSlug,
  race,
  weather,
  initialResults,
}: {
  raceId: Id<'races'>;
  raceName?: string;
  raceSlug?: string;
  race?: TrackSessionSchedule;
  weather?: RaceWeather | null;
  initialResults?: PracticeResults;
}) {
  const results = liveOrSsr(
    useQuery(api.practiceResults.getPracticeResultsForRace, { raceId }),
    initialResults,
  );
  return (
    <PracticeHighlights
      results={results}
      raceName={raceName}
      raceSlug={raceSlug}
      race={race}
      weather={weather}
    />
  );
}
