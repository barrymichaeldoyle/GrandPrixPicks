import type { SessionType } from '@grandprixpicks/shared/sessions';

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
  /** Qualifying and sprint qualifying, where the battle is over one lap. */
  qualifying: number;
  /** Races and sprints, where it is over a full distance. */
  race: number;
  total: number;
};

export function emptyTally(): TeammateTally {
  return { qualifying: 0, race: 0, total: 0 };
}

function isQualifying(sessionType: SessionType): boolean {
  return sessionType === 'quali' || sessionType === 'sprint_quali';
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

    if (isQualifying(outcome.sessionType)) {
      tally.qualifying += 1;
    } else {
      tally.race += 1;
    }
    tally.total += 1;
  }

  return byMatchup;
}
