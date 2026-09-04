import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from '@/integrations/convex/query';

import {
  PracticeClassification,
  type PracticeResults,
} from '@/components/PracticeClassification';

import { liveOrSsr } from './dashboardState';

export type { PracticeResults };
export { latestPracticeResult } from '@/components/PracticeClassification';

/**
 * The latest free practice classification, between the picks card and the
 * feed.
 *
 * Practice times already exist on the race page, but a returning player lands
 * here, and "what happened in FP2 while I was away" was a page away.
 *
 * Renders from the SSR seed (`home.getDashboardPageData`) so it neither pops
 * in under the feed after hydration nor holds the auth curtain; the live
 * query then keeps it current while a session is being published.
 */
export function DashboardPracticeCard({
  raceId,
  raceSlug,
  initialResults,
}: {
  raceId: Id<'races'>;
  raceSlug: string;
  initialResults?: PracticeResults;
}) {
  const results = liveOrSsr(
    useQuery(api.practiceResults.getPracticeResultsForRace, { raceId }),
    initialResults,
  );
  return (
    <PracticeClassification
      results={results}
      raceSlug={raceSlug}
      layout="card"
      analyticsSurface="dashboard"
    />
  );
}
