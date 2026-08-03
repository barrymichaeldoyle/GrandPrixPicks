import type { SessionType } from '@grandprixpicks/shared/sessions';
import { teamStandingsIndex } from '@grandprixpicks/shared/teams';

import type { Id } from '../_generated/dataModel';

/**
 * Which of a teammate pair finished ahead in one session. Derived from the
 * official classification, so this is real Formula 1 data rather than anything
 * about how players predicted it.
 */
export type TeammateSessionOutcome = {
  matchupId: Id<'h2hMatchups'>;
  sessionType: SessionType;
  winnerId: Id<'drivers'>;
};

export type TeammateTally = {
  /** Grand Prix qualifying sessions. */
  qualifying: number;
  /** Grand Prix races. */
  race: number;
  /** Sprint qualifying sessions. */
  sprintQualifying: number;
  /** Sprint races. */
  sprint: number;
  total: number;
};

export function emptyTally(): TeammateTally {
  return {
    qualifying: 0,
    race: 0,
    sprintQualifying: 0,
    sprint: 0,
    total: 0,
  };
}

/**
 * Tally each teammate pair's head-to-head record across a season.
 *
 * Sessions where neither driver started produce no outcome at all (see the
 * void rule in results.summarizeH2HScore), so they simply never appear here and
 * the totals stay honest about how many battles actually happened.
 */
export function tallyTeammateBattles(
  outcomes: ReadonlyArray<TeammateSessionOutcome>,
): Map<Id<'h2hMatchups'>, Map<Id<'drivers'>, TeammateTally>> {
  const byMatchup = new Map<
    Id<'h2hMatchups'>,
    Map<Id<'drivers'>, TeammateTally>
  >();

  for (const outcome of outcomes) {
    let drivers = byMatchup.get(outcome.matchupId);
    if (!drivers) {
      drivers = new Map();
      byMatchup.set(outcome.matchupId, drivers);
    }

    let tally = drivers.get(outcome.winnerId);
    if (!tally) {
      tally = emptyTally();
      drivers.set(outcome.winnerId, tally);
    }

    switch (outcome.sessionType) {
      case 'quali':
        tally.qualifying += 1;
        break;
      case 'race':
        tally.race += 1;
        break;
      case 'sprint_quali':
        tally.sprintQualifying += 1;
        break;
      case 'sprint':
        tally.sprint += 1;
        break;
    }
    tally.total += 1;
  }

  return byMatchup;
}

/**
 * Order teammate rows by the shared Constructors' Championship order used
 * across the prediction pool and H2H views.
 */
export function sortByConstructorStanding<T extends { team: string }>(
  teams: ReadonlyArray<T>,
): T[] {
  return [...teams].sort(
    (a, b) =>
      teamStandingsIndex(a.team) - teamStandingsIndex(b.team) ||
      a.team.localeCompare(b.team),
  );
}
