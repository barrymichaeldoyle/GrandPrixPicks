import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';

import { displayTeamName } from '@/lib/display';

/**
 * The championship tables as the page reads them.
 *
 * Taken straight off the query rather than restated here: every field on these
 * rows (the round history, the gaps, the countback note) is computed on the
 * server so the tables and the charts can never tell two different stories,
 * and a local copy of the shape would be the first thing to drift.
 */
export type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
export type DriverRow = Championship['drivers'][number];
export type ConstructorRow = Championship['constructors'][number];
export type CalendarRound = Championship['calendar'][number];
export type CountbackNote = DriverRow['countback'];

/**
 * The three-letter round label the charts put on their x-axis.
 *
 * Formula 1's own abbreviations are a published list we do not hold, so this
 * takes the first word of the Grand Prix name, which is the word a fan would
 * say out loud: "Bahrain Grand Prix" is BAH, "Las Vegas Grand Prix" is LAS.
 * The full name stays in the readout under every chart, so the label only has
 * to be recognisable, not authoritative.
 */
export function roundCode(raceName: string): string {
  const word = raceName
    .replace(/\s*Grand Prix\s*/i, ' ')
    .trim()
    .split(/\s+/)[0];
  return (word ?? '').slice(0, 3).toUpperCase();
}

/** "+59", or "—" for the leader. */
export function gapLabel(gap: number | null): string {
  if (gap === null || gap === 0) {
    return '—';
  }
  return `+${gap}`;
}

const ORDINALS = [
  'win',
  'second place',
  'third place',
  'fourth place',
  'fifth place',
  'sixth place',
  'seventh place',
  'eighth place',
  'ninth place',
  'tenth place',
];

/** "wins", "second places", or "P12 finishes" once past the words we have. */
export function countbackLabel(finishPosition: number, count: number): string {
  const word = ORDINALS[finishPosition - 1];
  if (!word) {
    return `P${finishPosition} finishes`;
  }
  return count === 1 ? word : `${word}s`;
}

export type TieGroup = {
  points: number;
  /** Every entry level on those points, in the order the table ranks them. */
  names: string[];
  /** How the countback separated them, when it did. */
  note: string | null;
};

type TiedEntry = { points: number; countback: CountbackNote };

/**
 * The groups of entries level on points, with the finish that split each one.
 *
 * A table that puts one of two drivers on 183 points above the other owes the
 * reader the reason, and "countback" is a rule most people know exists without
 * knowing how it runs. Ties that the countback cannot separate get no note:
 * the order there really is arbitrary and inventing a reason would be worse
 * than admitting one is missing.
 */
export function tieGroups<T extends TiedEntry>(
  rows: readonly T[],
  nameOf: (row: T) => string,
): TieGroup[] {
  const groups: TieGroup[] = [];

  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    while (end < rows.length && rows[end].points === rows[start].points) {
      end += 1;
    }
    const group = rows.slice(start, end);
    if (group.length > 1 && group[0].points > 0) {
      groups.push({
        points: group[0].points,
        names: group.map(nameOf),
        note: countbackSentence(group, nameOf),
      });
    }
    start = end;
  }

  return groups;
}

function countbackSentence<T extends TiedEntry>(
  group: readonly T[],
  nameOf: (row: T) => string,
): string | null {
  const leader = group[0];
  const note = leader.countback;
  if (!note) {
    return null;
  }
  const label = countbackLabel(note.finishPosition, note.count);
  if (group.length === 2) {
    const behind = group[1].countback?.count ?? 0;
    return `${nameOf(leader)} is ahead on countback: ${note.count} ${label} to ${behind}.`;
  }
  return `${nameOf(leader)} is ahead on countback with ${note.count} ${label}.`;
}

/**
 * A driver's seats this season, for the footnote under a mid-season move.
 * Returns null for the ordinary case of one seat all year.
 */
export function teamHistoryNote(driver: DriverRow): string | null {
  if (driver.teamHistory.length < 2) {
    return null;
  }
  const spans = driver.teamHistory.map((stint) => {
    const team = displayTeamName(stint.team);
    if (stint.toRound === null) {
      return `round ${stint.fromRound} onwards at ${team}`;
    }
    if (stint.fromRound === stint.toRound) {
      return `round ${stint.fromRound} at ${team}`;
    }
    return `rounds ${stint.fromRound}–${stint.toRound} at ${team}`;
  });
  const sentence = spans.join(', ');
  return `${driver.displayName}: ${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}

/**
 * The sentence under the page title: who leads, by how much, and how much of
 * the season is left to change it.
 */
export function summarySentence(standings: Championship): string | null {
  const [leader, second] = standings.drivers;
  if (!leader || standings.roundsScored === 0) {
    return null;
  }
  const rounds = standings.roundsTotal
    ? `After ${standings.roundsScored} of ${standings.roundsTotal} rounds`
    : `After ${standings.roundsScored} ${standings.roundsScored === 1 ? 'round' : 'rounds'}`;

  const driverGap =
    second && second.gapToLeader > 0
      ? `${rounds}, ${leader.displayName} leads ${second.displayName} by ${second.gapToLeader} ${second.gapToLeader === 1 ? 'point' : 'points'}.`
      : `${rounds}, ${leader.displayName} leads on ${leader.points} ${leader.points === 1 ? 'point' : 'points'}.`;

  const [topTeam, secondTeam] = standings.constructors;
  if (!topTeam) {
    return driverGap;
  }
  const teamGap =
    secondTeam && secondTeam.gapToLeader > 0
      ? ` ${displayTeamName(topTeam.team)} lead ${displayTeamName(secondTeam.team)} by ${secondTeam.gapToLeader} in the constructors' championship.`
      : ` ${displayTeamName(topTeam.team)} lead the constructors' championship on ${topTeam.points} points.`;

  return driverGap + teamGap;
}
