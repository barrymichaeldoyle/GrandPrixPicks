import { useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { CompactColumns } from '@/components/PracticeResultsCard';

export type StartingGridEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
  /** Absent on grids frozen into a feed event before numbers were resolved. */
  number?: number | null;
  note?: string;
  /** The news item that explains `note`, by key. Never rendered on its own. */
  newsKey?: string;
};

/**
 * Where a row's note should send the reader, and what to call the destination.
 *
 * A function rather than a URL on the entry, because the answer belongs to the
 * surface: the write-up page has the explaining card a few hundred pixels away
 * and links to it, and any surface that does not carry the item passes nothing
 * and gets a plain caption back.
 */
export type GridNewsLink = (
  newsKey: string,
) => { href: string; headline: string } | undefined;

/**
 * A pit lane start is not a grid slot: the driver lines up behind every car
 * that qualified, and the row's `position` only exists here because the
 * schema numbers the field 1..N with no gaps. Reading `note` is what a real
 * grid does too — there is no separate flag for it — so this is the one
 * place that decides what counts as one, and both row renderers below call it
 * rather than each matching the string their own way.
 */
function isPitLaneStart(note?: string): boolean {
  return /pit lane/i.test(note ?? '');
}

/**
 * "P21" beside "Pit lane start" reads as a grid slot with a caption, and a
 * reader scanning positions for a number skips straight past the muted text
 * beside it — which is exactly the case a grid penalty is not: Stroll's P21
 * is a real slot, Bearman's is not a slot at all. "PL" in the position's own
 * spot says so without the reader ever reaching the note.
 */
function PositionLabel({ entry }: { entry: StartingGridEntry }) {
  if (isPitLaneStart(entry.note)) {
    return (
      <span className="gpp-mono w-7 shrink-0 text-xs font-semibold text-warning">
        PL
      </span>
    );
  }
  return (
    <span className="gpp-mono w-7 shrink-0 text-xs font-semibold text-text-muted">
      P{entry.position}
    </span>
  );
}

/**
 * The confirmed grid, as published on the news item that announced it.
 *
 * One component for both surfaces because the two must not disagree: the feed
 * card and the write-up page render the same rows from the same record, and a
 * second implementation is how one of them ends up a row short after a
 * correction.
 *
 * A row is a slot number, a driver badge, and a name. The badge is the
 * point of the table: a grid read as twenty-two names is a list, and read as
 * codes with team bars it shows you at a glance that Ferrari has locked out
 * the second row and that both Mercedes are split across the field.
 */
export function StartingGridTable({
  entries,
  collapsedRows,
  columns = 1,
  compact = false,
  newsLink,
  onNoteSelect,
}: {
  entries: StartingGridEntry[];
  /**
   * Rows to show before the reader asks for the rest. Omit for the whole grid.
   *
   * The write-up shows all of it: it is a public page, the grid is the reason
   * somebody searched for it, and a crawler does not press buttons.
   *
   * Meaningless on `compact`, which exists to show the whole field without
   * this: dropping the button is the point, not a side effect.
   */
  collapsedRows?: number;
  /** Split into this many columns from `sm` up. Ignored under `compact`. */
  columns?: 1 | 2;
  /**
   * Top-to-bottom in two columns (P1..P11 | P12..P22), cut by the same house
   * stripe `CompactColumns` uses for a practice sheet, and driver names
   * dropped in favour of the badge's own code and its tooltip. This is what
   * lets the feed show the whole field without a disclosure: a name-less row
   * is short enough that eleven of them is a column, not a scroll.
   */
  compact?: boolean;
  /**
   * Resolves a row's `newsKey` to somewhere the reader can go. Omit on a
   * surface that has no way to show the story, and the notes stay plain.
   */
  newsLink?: GridNewsLink;
  /**
   * Takes over a note's click instead of the plain anchor jump, e.g. to
   * smooth-scroll to the card and focus its source link rather than snap to
   * it. Omit to fall back to a normal same-page `<a href>`.
   */
  onNoteSelect?: (newsKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-3">
        <CompactColumns
          entries={entries}
          getKey={(entry) => entry.code}
          renderRow={(entry) => (
            <CompactGridRow
              entry={entry}
              newsLink={newsLink}
              onNoteSelect={onNoteSelect}
            />
          )}
        />
      </div>
    );
  }

  const collapsible =
    collapsedRows !== undefined && entries.length > collapsedRows;
  const shown =
    collapsible && !expanded ? entries.slice(0, collapsedRows) : entries;

  return (
    <div>
      <ol
        className={`mt-3 ${
          columns === 2 ? 'sm:grid sm:grid-cols-2 sm:gap-x-6' : ''
        }`}
      >
        {shown.map((entry) => (
          <GridRow
            key={entry.code}
            entry={entry}
            newsLink={newsLink}
            onNoteSelect={onNoteSelect}
          />
        ))}
      </ol>

      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="gpp-touch-target mt-2 text-xs font-semibold text-accent hover:text-accent-hover"
        >
          {expanded
            ? 'Show the top of the grid'
            : `Show all ${entries.length} places`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A row's clickable note, resolved once and shared between the full and the
 * compact row: the link, the a11y label and the fallback-to-plain-text
 * behaviour must stay identical between them, or a correction reads
 * differently depending on which surface a reader is on.
 */
function GridRowNote({
  entry,
  newsLink,
  onNoteSelect,
  className,
}: {
  entry: StartingGridEntry;
  newsLink?: GridNewsLink;
  onNoteSelect?: (newsKey: string) => void;
  className: string;
}) {
  if (!entry.note) {
    return null;
  }
  const newsKey = entry.newsKey;
  const link = newsKey ? newsLink?.(newsKey) : undefined;

  // The note is the caption and, where we published the story behind it, the
  // way to it: "3-place penalty" is exactly the point at which a reader asks
  // why. Linked rather than expanded in place, because a grid is read as a
  // shape and twenty-two rows carrying prose is a list of paragraphs. The
  // label spells out whose row it is, since "Pit lane" on its own tells a
  // screen reader nothing about where it leads.
  if (!link) {
    return <span className={className}>{entry.note}</span>;
  }
  return (
    <a
      href={link.href}
      onClick={
        onNoteSelect && newsKey
          ? (event) => {
              event.preventDefault();
              onNoteSelect(newsKey);
            }
          : undefined
      }
      aria-label={`Why ${entry.displayName} starts P${entry.position}: ${link.headline}`}
      className={`gpp-touch-target underline decoration-border-strong underline-offset-4 hover:text-accent ${className}`}
    >
      {entry.note}
    </a>
  );
}

function GridRow({
  entry,
  newsLink,
  onNoteSelect,
}: {
  entry: StartingGridEntry;
  newsLink?: GridNewsLink;
  onNoteSelect?: (newsKey: string) => void;
}) {
  const pitLane = isPitLaneStart(entry.note);
  return (
    <li className="flex items-center gap-2.5 border-b border-border py-1.5 last:border-0">
      <PositionLabel entry={entry} />
      <DriverBadge
        code={entry.code}
        team={entry.team}
        displayName={entry.displayName}
        number={entry.number}
        size="sm"
        prerenderTooltip={false}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {entry.displayName}
      </span>
      <GridRowNote
        entry={entry}
        newsLink={newsLink}
        onNoteSelect={onNoteSelect}
        className={`shrink-0 text-xs ${pitLane ? 'font-semibold text-warning' : 'text-text-muted'}`}
      />
    </li>
  );
}

/**
 * The compact row `CompactColumns` renders inside its own two-column, house
 * striped shell: no `<li>` or border of its own, since the shell's
 * `divide-y` already draws the rule between rows.
 */
function CompactGridRow({
  entry,
  newsLink,
  onNoteSelect,
}: {
  entry: StartingGridEntry;
  newsLink?: GridNewsLink;
  onNoteSelect?: (newsKey: string) => void;
}) {
  const pitLane = isPitLaneStart(entry.note);
  return (
    <div className="flex items-center gap-2 py-1.5">
      <PositionLabel entry={entry} />
      <DriverBadge
        code={entry.code}
        team={entry.team}
        displayName={entry.displayName}
        number={entry.number}
        size="sm"
        prerenderTooltip={false}
      />
      {/* The visible name drops here: the badge's code plus its tooltip
          already carry it, and this is the row space that buys two columns.
          A screen reader still gets it, just silently rather than as a
          second line of visible text. */}
      <span className="sr-only">{entry.displayName}</span>
      <GridRowNote
        entry={entry}
        newsLink={newsLink}
        onNoteSelect={onNoteSelect}
        className={`min-w-0 flex-1 text-right text-xs ${pitLane ? 'font-semibold text-warning' : 'text-text-muted'}`}
      />
    </div>
  );
}
