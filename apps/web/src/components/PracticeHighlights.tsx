import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { practiceGapOrLap } from '@/components/PracticeResultsCard';
import {
  latestPracticeResult,
  PRACTICE_SESSION_LABELS,
  practiceSessionFact,
  publishedPracticeSessions,
  type PracticeResult,
  type PracticeResults,
} from '@/lib/practiceSessions';

/** The scoring-relevant top of a classification, and all a highlight shows. */
const HIGHLIGHT_ROWS = 6;

function HighlightRow({ entry }: { entry: PracticeResult['entries'][number] }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5">
      <span className="gpp-mono text-xs font-semibold text-text-muted">
        P{entry.position}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <DriverBadge
          code={entry.code}
          displayName={entry.displayName}
          team={entry.team ?? undefined}
          size="sm"
          prerenderTooltip={false}
        />
        <span className="min-w-0 truncate text-sm text-text">
          {entry.displayName}
        </span>
      </div>
      <span className="gpp-mono text-right text-xs font-semibold text-text">
        {practiceGapOrLap(entry)}
      </span>
    </div>
  );
}

function SessionColumn({
  result,
  index,
  span,
}: {
  result: PracticeResult;
  /** Position in the grid: the first cell of a row takes no left border. */
  index: number;
  /** A lone trailing session takes the whole row rather than half of one. */
  span: boolean;
}) {
  const dividers = [
    index === 0 ? '' : 'border-t border-border',
    // Right-hand cells swap the stacked divider for one down their left edge.
    index % 2 === 1 ? 'sm:border-t-0 sm:border-l' : '',
    span ? 'sm:col-span-2' : '',
  ].join(' ');
  return (
    <div className={dividers}>
      <p className="gpp-label border-b border-border px-3 py-1.5 text-text-muted">
        {PRACTICE_SESSION_LABELS[result.sessionType]}
      </p>
      <div className="divide-y divide-border">
        {result.entries.slice(0, HIGHLIGHT_ROWS).map((entry) => (
          <HighlightRow key={entry.driverNumber} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/**
 * Every published practice session's top six, side by side, on the dashboard.
 *
 * This block sits between the picks card and the feed, where a player is
 * scanning rather than studying, so it answers one question per session: who
 * was quick. The full 22-car classification, lap counts and times are one link
 * away on the practice page, which is the page that owns them.
 *
 * It used to show the newest session only, disclosing the rest of that field
 * in place. That was two problems: FP1 was invisible on Friday evening even
 * though it had been published for hours, and the disclosed half of the field
 * ran as two columns inside an already-narrow card, which truncated driver
 * names to "Arvi…". A highlight per session fixes both by not trying to be the
 * timing sheet.
 */
export function PracticeHighlights({
  results,
  raceSlug,
}: {
  results: PracticeResults | undefined;
  raceSlug: string;
}) {
  const sessions = publishedPracticeSessions(results);
  const latest = latestPracticeResult(results);
  if (!latest) {
    return null;
  }

  // Two sessions to a row, never three: a third of a dashboard column is not
  // enough for a driver's name, and truncating those is what this replaced.
  const columns = sessions.length > 1 ? 'sm:grid-cols-2' : '';

  return (
    <section
      aria-labelledby="dashboard-practice-heading"
      data-testid="dashboard-practice"
      className="overflow-hidden rounded-sm border border-border bg-surface-elevated"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id="dashboard-practice-heading" className="min-w-0">
          <span className="gpp-label block text-text-muted">Practice</span>
          {/* Wraps rather than truncates: "FP2 · George RUSS…" was the header
              cutting off the one fact it exists to state. */}
          <span className="mt-0.5 block text-sm font-semibold text-text">
            {practiceSessionFact(latest)}
          </span>
        </h2>
        <Link
          to="/races/$raceSlug/practice"
          params={{ raceSlug }}
          className="gpp-touch-target inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover sm:text-sm"
        >
          Full lap times and gaps
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className={`grid ${columns}`}>
        {sessions.map((result, index) => (
          <SessionColumn
            key={result.sessionType}
            result={result}
            index={index}
            span={index === sessions.length - 1 && index % 2 === 0}
          />
        ))}
      </div>
    </section>
  );
}
