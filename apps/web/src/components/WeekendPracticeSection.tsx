import type { PracticeResults } from '@/components/PracticeClassification';
import { PracticeClassification } from '@/components/PracticeClassification';

/**
 * The weekend write-up's practice classification.
 *
 * Same table as the dashboard card, at the write-up's type scale, so it sits
 * next to {@link WeekendNewsSection} rather than looking like a dashboard
 * block dropped into an article. Renders nothing until a session is published.
 */
export function WeekendPracticeSection({
  results,
  raceSlug,
}: {
  results: PracticeResults;
  raceSlug: string;
}) {
  return (
    <PracticeClassification
      results={results}
      raceSlug={raceSlug}
      layout="section"
      analyticsSurface="writeup"
    />
  );
}
