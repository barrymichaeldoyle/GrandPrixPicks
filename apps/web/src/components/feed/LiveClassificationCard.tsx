import { api } from '@convex-generated/api';
import { PRACTICE_SESSION_LABELS } from '@grandprixpicks/shared/practice';

import {
  CompactColumns,
  CompactPracticeRow,
} from '@/components/PracticeResultsCard';
import { useQuery } from '@/integrations/convex/query';

/**
 * Session names, in full. The practice three come from the shared map so this
 * card and the practice block cannot drift on what FP2 is called.
 */
const SESSION_LABELS: Record<string, string> = {
  ...PRACTICE_SESSION_LABELS,
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

/** The scoring-relevant top of a running order, and all a highlight shows. */
const LIVE_ROWS = 6;

type LiveEntry = {
  driverNumber: number;
  position: number;
  code: string;
  displayName: string;
  team?: string | null;
  bestLapSeconds: number | null;
};

/**
 * The running order, told the way the timing sheet tells it: P1 carries the
 * lap, everyone else carries the gap to it.
 *
 * The card used to print `92.079` in every row — raw seconds, six of them, with
 * nothing to compare against. The interval is the fact a reader wants, and
 * `practiceGapOrLap` already owns that rule, so the rows only have to arrive in
 * the shape it reads.
 *
 * A row with no lap yet keeps its place and shows an em dash: on the live feed
 * that means "out on track", which is worth seeing, and dropping the row would
 * renumber the order underneath it.
 */
function withGaps(entries: LiveEntry[]) {
  const leader = entries.find((entry) => entry.bestLapSeconds != null);
  return entries.map((entry) => ({
    position: entry.position,
    code: entry.code,
    displayName: entry.displayName,
    team: entry.team ?? null,
    driverNumber: entry.driverNumber,
    // Nobody is a reserve on a live order: the field is whoever is on track.
    isReserve: false,
    bestLapSeconds: entry.bestLapSeconds ?? undefined,
    gapToLeaderSeconds:
      entry.bestLapSeconds == null || leader?.bestLapSeconds == null
        ? undefined
        : entry.bestLapSeconds - leader.bestLapSeconds,
  }));
}

/**
 * The session currently on track, above the feed.
 *
 * Deliberately the practice block's card: same chrome, same eyebrow, the same
 * `CompactPracticeRow` with its team bar and driver badge, the same two-column
 * split. A classification is a classification whether it is final or still
 * moving, and the previous card said otherwise — a plain grey list of names and
 * unformatted seconds, with no team colour anywhere on it, sitting directly
 * above a practice block built the other way.
 *
 * What is different is the one thing that actually differs: this order is not
 * final. That is the accent dot beside the session name, and the line under
 * the rows.
 */
export function LiveClassificationCard() {
  const live = useQuery(api.liveClassification.current, {});
  if (!live?.entries.length) {
    return null;
  }
  const entries = withGaps((live.entries as LiveEntry[]).slice(0, LIVE_ROWS));
  const label = SESSION_LABELS[live.sessionType] ?? live.sessionType;

  return (
    <section
      aria-labelledby="dashboard-live-heading"
      data-testid="dashboard-live"
      className="overflow-hidden border-y border-border/80 bg-surface max-md:-mx-4 max-md:pt-2 md:rounded-sm md:border"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <h2
          id="dashboard-live-heading"
          className="text-xs font-medium text-accent"
        >
          {label}
        </h2>
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
          {/* The one mark that says this order is still moving. `motion-safe`
              because a pulsing dot beside live figures is exactly what someone
              who asked for reduced motion did not want. */}
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse"
          />
          Live
        </p>
      </div>
      <CompactColumns
        entries={entries}
        getKey={(entry) => entry.driverNumber}
        renderRow={(entry) => (
          <CompactPracticeRow
            entry={entry}
            size="md"
            fill="sunken"
            gutter="card"
          />
        )}
      />
      <p className="px-4 py-2 text-xs text-text-muted">
        Live timing can change, including after the flag.
      </p>
    </section>
  );
}
