import { PracticeClassification } from '@/components/PracticeClassification';
import type { PracticeResults } from '@/lib/practiceSessions';

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
}: {
  results: PracticeResults;
  raceSlug: string;
}) {
  return <PracticeClassification results={results} raceSlug={raceSlug} />;
}
