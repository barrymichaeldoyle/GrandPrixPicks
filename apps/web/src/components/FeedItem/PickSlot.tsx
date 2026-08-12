import type { CSSProperties } from 'react';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

/*
 * A pick reads as a timing-screen sector: the driver code sits in a plain cell
 * and the score is the bar beneath it. That keeps the badge itself calm (one
 * 3px team bar on the left, as everywhere else) and puts the result where the
 * eye already scans on an F1 timing sheet.
 *
 * The bar is its own element, detached from the cell rather than a bottom
 * border on it. A border reads as part of the box — trim, the same family as
 * the frame around the code. Separated by a hairline of background it reads as
 * a mark *about* the box, which is what a sector band is.
 *
 * Colours are the scoring bands from lib/scoring.ts. Note the 0-point bar is
 * red here rather than the system's usual grey miss — a deliberate exception so
 * the five slots read as a sector row (purple / green / yellow / red).
 *
 * That red is `racing-red`, not `error`: the `error` token is amber in this
 * palette, which put a miss one hue away from the 1-point yellow beside it.
 */
const SCORE_BAND: Record<number, string> = {
  5: 'bg-result-exact',
  3: 'bg-result-near',
  1: 'bg-result-top5',
  0: 'bg-racing-red',
};

/*
 * Picks and the published result are the same five columns, so they are told
 * apart the way a form tells an answer from an entry: outlined versus filled.
 * A pick is an outlined cell on the row's flat background; the result is a
 * solid, taller, unbordered block on the raised header, with the code carrying
 * a little more weight. Same grid, no doubt about which row is the fact.
 */
const CELL_BASE = 'gpp-team-bar flex w-full items-center justify-center';
const PICK_CELL = `${CELL_BASE} h-7 border border-border bg-surface-elevated`;
const RESULT_CELL = `${CELL_BASE} h-8 bg-surface-sunken`;
const CODE_BASE = 'gpp-mono pl-1 leading-none tracking-data uppercase';
const PICK_CODE = `${CODE_BASE} text-xs text-text`;
const RESULT_CODE = `${CODE_BASE} text-[13px] font-semibold text-text`;
/*
 * Sector-band weight, set off from the cell by a hairline of page behind it.
 *
 * It starts where the driver code does, not at the cell's left edge: running it
 * under the team bar made the two colours read as one misaligned stack. Inset
 * by the bar plus the cell's 1px border so the band lines up with the field.
 */
const BAND = 'h-1 ms-[calc(var(--team-bar-width)+1px)]';
const BAND_GAP = 'gap-[3px]';

function teamStyle(team?: string | null) {
  return {
    '--team-colour': (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR,
  } as CSSProperties;
}

/** A player's pick in one of the five slots, banded with its score colour. */
export function PickSlot({
  code,
  team,
  displayName,
  points,
  predictedPosition,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  points?: number;
  predictedPosition: number;
}) {
  const label = displayName ?? code;

  return (
    <span
      title={
        points === undefined
          ? `P${predictedPosition}: ${label}`
          : `P${predictedPosition}: ${label} — ${points} ${points === 1 ? 'point' : 'points'}`
      }
      className={`flex w-full flex-col ${BAND_GAP}`}
    >
      <span className={PICK_CELL} style={teamStyle(team)}>
        <span className={PICK_CODE}>{code}</span>
      </span>
      <span
        className={`${BAND} ${points === undefined ? 'bg-border' : (SCORE_BAND[points] ?? SCORE_BAND[0])}`}
        aria-hidden
      />
    </span>
  );
}

/**
 * The published finishing position, above the players' picks.
 *
 * Deliberately unbanded: a bar under this row would read as a score, and the
 * result is the thing being scored against.
 */
export function ResultSlot({
  code,
  team,
  displayName,
  position,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  position: number;
}) {
  return (
    <span
      title={`P${position}: ${displayName ?? code}`}
      className={RESULT_CELL}
      style={teamStyle(team)}
    >
      <span className={RESULT_CODE}>{code}</span>
    </span>
  );
}

/** Empty slot, so a partial set of picks still lines up with the result row. */
export function EmptySlot() {
  return (
    <span className={`flex w-full flex-col ${BAND_GAP}`} aria-hidden>
      <span className="h-7 w-full border border-dashed border-border/60" />
      <span className={`${BAND} bg-border/40`} />
    </span>
  );
}
