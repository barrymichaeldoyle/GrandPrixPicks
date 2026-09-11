import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';

import { PracticeClassification } from '@/components/PracticeClassification';
import type {
  PracticeResults,
  TrackSessionSchedule,
} from '@/lib/practiceSessions';

/**
 * The weekend write-up's practice classification, named for where it sits.
 *
 * The section is styled for an article rather than a dashboard, so it reads
 * next to {@link WeekendNewsSection} at the same type scale. Renders nothing
 * until a session is published.
 */
export function WeekendPracticeSection({
  results,
  raceSlug,
  schedule,
}: {
  results: PracticeResults;
  raceSlug: string;
  schedule?: TrackSessionSchedule;
}) {
  const liveResults = useQuery(
    api.practiceResults.getPracticeResultsForRaceSlug,
    { raceSlug },
  );
  return (
    <PracticeClassification
      results={liveResults ?? results}
      raceSlug={raceSlug}
      schedule={schedule}
    />
  );
}
