import { api } from '@convex-generated/api';
import { useState } from 'react';
import { useQuery } from '@/integrations/convex/query';
import { PracticeClassificationDialog } from '@/components/PracticeClassificationDialog';
import { CompactPracticeRow } from '@/components/PracticeResultsCard';
import type { FeedEvent } from './types';

export function PracticePublishedItem({ event }: { event: FeedEvent }) {
  const [open, setOpen] = useState(false);
  const results = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    event.raceId ? { raceId: event.raceId } : 'skip',
  );
  const result = results?.find(
    (item) => item.sessionType === event.practiceSessionType,
  );
  return (
    <section
      aria-label={`${event.raceName} ${event.practiceSessionType?.toUpperCase()} results`}
    >
      <h3 className="px-1 pb-3 text-sm font-semibold text-text">
        {event.raceName} · {event.practiceSessionType?.toUpperCase()} results
      </h3>
      {result ? (
        <>
          <ol className="divide-y divide-border">
            {result.entries.slice(0, 6).map((entry) => (
              <li key={entry.driverNumber}>
                <CompactPracticeRow
                  entry={entry}
                  size="md"
                  showNumber
                  fill="sunken"
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className="gpp-touch-target mt-2 min-h-11 w-full border-t border-border text-sm text-text-muted hover:text-text"
          >
            View full results
          </button>
          <PracticeClassificationDialog
            open={open}
            onClose={() => setOpen(false)}
            results={results ?? []}
            initialSession={result.sessionType}
          />
        </>
      ) : (
        <p className="text-sm text-text-muted">
          {results === undefined
            ? 'Loading practice results…'
            : 'Practice results are unavailable.'}
        </p>
      )}
    </section>
  );
}
