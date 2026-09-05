import { useState } from 'react';
import type { CSSProperties } from 'react';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

export type StartingGridEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
  note?: string;
};

/**
 * The confirmed grid, as published on the news item that announced it.
 *
 * One component for both surfaces because the two must not disagree: the feed
 * card and the write-up page render the same rows from the same record, and a
 * second implementation is how one of them ends up a row short after a
 * correction.
 *
 * A row is a slot number, the team's colour, and a name. The colour is the
 * point of the table: a grid read as twenty-two names is a list, and read as
 * blocks of colour it shows you at a glance that Ferrari has locked out the
 * second row and that both Mercedes are split across the field.
 */
export function StartingGridTable({
  entries,
  collapsedRows,
  columns = 1,
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
          <GridRow key={entry.code} entry={entry} />
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

function GridRow({ entry }: { entry: StartingGridEntry }) {
  const colour =
    (entry.team ? TEAM_COLORS[entry.team] : null) ?? FALLBACK_TEAM_COLOR;

  return (
    <li
      className="flex items-center gap-3 border-b border-border py-1.5 last:border-0"
      style={{ '--team-colour': colour } as CSSProperties}
    >
      <span className="gpp-mono w-7 shrink-0 text-xs font-semibold text-text-muted">
        P{entry.position}
      </span>
      <span
        aria-hidden
        className="h-4 w-[3px] shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {entry.displayName}
      </span>
      {entry.note ? (
        <span className="shrink-0 text-xs text-text-muted">{entry.note}</span>
      ) : null}
    </li>
  );
}
