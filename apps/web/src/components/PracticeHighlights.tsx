import {
  CompactColumns,
  CompactPracticeRow,
} from '@/components/PracticeResultsCard';
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
  return <CompactPracticeRow entry={entry} size="md" fill="sunken" />;
}

function SessionColumn({
  result,
  index,
  span,
  labelled,
}: {
  result: PracticeResult;
  /** Position in the grid: the first cell of a row takes no left border. */
  index: number;
  /** A lone trailing session takes the whole row rather than half of one. */
  span: boolean;
  /** False when the card header already names the only session. */
  labelled: boolean;
}) {
  const dividers = [
    index === 0 ? '' : 'border-t border-border',
    // Right-hand cells swap the stacked divider for one down their left edge.
    index % 2 === 1 ? 'sm:border-t-0 sm:border-l' : '',
    span ? 'sm:col-span-2' : '',
  ].join(' ');
  const top = result.entries.slice(0, HIGHLIGHT_ROWS);
  const rows = labelled ? (
    <div className="divide-y divide-border">
      {top.map((entry) => (
        <HighlightRow key={entry.driverNumber} entry={entry} />
      ))}
    </div>
  ) : (
    // One session, full width: the compact row is a badge and a time, which
    // is a two-column list, not a six-row empty middle.
    <CompactColumns
      entries={top}
      getKey={(entry) => entry.driverNumber}
      renderRow={(entry) => <HighlightRow entry={entry} />}
    />
  );
  return (
    <div className={dividers}>
      {labelled ? (
        <p className="gpp-label px-4 py-1.5 text-text-muted">
          {PRACTICE_SESSION_LABELS[result.sessionType]}
        </p>
      ) : null}
      {rows}
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
 *
 * On a phone it bleeds like the picks card and the news block, and sits
 * flush against them: a nested frame here was a card sitting in the gutter
 * between two full-bleed neighbours. `-mt-px` collapses the two hairlines
 * that would otherwise stack where this block meets the one above it.
 */
export function PracticeHighlights({
  results,
}: {
  results: PracticeResults | undefined;
}) {
  const sessions = publishedPracticeSessions(results);
  const latest = latestPracticeResult(results);
  if (!latest) {
    return null;
  }

  // Two sessions to a row, never three: a third of a dashboard column is not
  // a timing row.
  const multi = sessions.length > 1;
  const columns = multi ? 'sm:grid-cols-2' : '';

  return (
    <section
      aria-labelledby="dashboard-practice-heading"
      data-testid="dashboard-practice"
      className="overflow-hidden border-y border-border/80 bg-surface max-md:-mx-4 max-md:-mt-px md:rounded-sm md:border"
    >
      {/* No rule under the heading: the classification already divides on
          every row, and a second line between the title and P1 was one HR
          more than the block needed. */}
      <div className="px-4 py-2.5">
        <h2 id="dashboard-practice-heading" className="min-w-0">
          <span className="gpp-label block text-accent">Practice</span>
          {/* Wraps rather than truncates: "FP2 · George RUSS…" was the header
              cutting off the one fact it exists to state. */}
          <span className="mt-0.5 block text-sm font-semibold text-text">
            {practiceSessionFact(latest)}
          </span>
        </h2>
      </div>
      <div className={`grid ${columns}`}>
        {sessions.map((result, index) => (
          <SessionColumn
            key={result.sessionType}
            result={result}
            index={index}
            span={index === sessions.length - 1 && index % 2 === 0}
            labelled={multi}
          />
        ))}
      </div>
    </section>
  );
}
