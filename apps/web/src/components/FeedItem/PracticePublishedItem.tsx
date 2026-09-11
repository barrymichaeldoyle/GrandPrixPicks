import { api } from '@convex-generated/api';
import { useState } from 'react';
import { useQuery } from '@/integrations/convex/query';
import { DriverBadge } from '@/components/DriverBadge';
import { PracticeClassificationDialog } from '@/components/PracticeClassificationDialog';
import { practiceGapOrLap } from '@/components/PracticeResultsCard';
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
              <li
                key={entry.driverNumber}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 py-2"
              >
                <span className="gpp-mono text-xs text-text-muted">
                  P{entry.position}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <DriverBadge
                    code={entry.code}
                    displayName={entry.displayName}
                    team={entry.team ?? undefined}
                    size="sm"
                  />
                  <span className="truncate text-sm text-text">
                    {entry.displayName}
                  </span>
                </div>
                <span className="gpp-mono text-xs text-text">
                  {practiceGapOrLap(entry)}
                </span>
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
