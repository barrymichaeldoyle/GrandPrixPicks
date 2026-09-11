import { useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';

export type StartingGridEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
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
  newsLink,
}: {
  entries: StartingGridEntry[];
  /**
   * Rows to show before the reader asks for the rest. Omit for the whole grid.
   *
   * The write-up shows all of it: it is a public page, the grid is the reason
   * somebody searched for it, and a crawler does not press buttons. The feed
   * closes on the scoring-relevant top, because a card that is twenty-two rows
   * tall pushes the rest of the weekend off the screen.
   */
  collapsedRows?: number;
  /** Split into this many columns from `sm` up. */
  columns?: 1 | 2;
  /**
   * Resolves a row's `newsKey` to somewhere the reader can go. Omit on a
   * surface that has no way to show the story, and the notes stay plain.
   */
  newsLink?: GridNewsLink;
}) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return null;
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
          <GridRow key={entry.code} entry={entry} newsLink={newsLink} />
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

function GridRow({
  entry,
  newsLink,
}: {
  entry: StartingGridEntry;
  newsLink?: GridNewsLink;
}) {
  const link = entry.newsKey ? newsLink?.(entry.newsKey) : undefined;

  return (
    <li className="flex items-center gap-2.5 border-b border-border py-1.5 last:border-0">
      <span className="gpp-mono w-7 shrink-0 text-xs font-semibold text-text-muted">
        P{entry.position}
      </span>
      <DriverBadge
        code={entry.code}
        team={entry.team}
        displayName={entry.displayName}
        size="sm"
        prerenderTooltip={false}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {entry.displayName}
      </span>
      {/* The note is the caption and, where we published the story behind it,
          the way to it: "3-place penalty" is exactly the point at which a
          reader asks why. Linked rather than expanded in place, because a grid
          is read as a shape and twenty-two rows carrying prose is a list of
          paragraphs. The label spells out whose row it is, since "Pit lane" on
          its own tells a screen reader nothing about where it leads. */}
      {link && entry.note ? (
        <a
          href={link.href}
          aria-label={`Why ${entry.displayName} starts P${entry.position}: ${link.headline}`}
          className="gpp-touch-target shrink-0 text-xs text-text-muted underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          {entry.note}
        </a>
      ) : entry.note ? (
        <span className="shrink-0 text-xs text-text-muted">{entry.note}</span>
      ) : null}
    </li>
  );
}
