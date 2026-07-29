import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import type { TeammateSessionOutcome } from './teammateBattles';
import {
  sortByConstructorStanding,
  tallyTeammateBattles,
} from './teammateBattles';

function matchup(id: string): Id<'h2hMatchups'> {
  return id as Id<'h2hMatchups'>;
}

function driver(code: string): Id<'drivers'> {
  return code as unknown as Id<'drivers'>;
}

const FERRARI = matchup('ferrari');
const LEC = driver('LEC');
const HAM = driver('HAM');

function outcome(
  sessionType: TeammateSessionOutcome['sessionType'],
  winnerId: Id<'drivers'>,
  matchupId = FERRARI,
): TeammateSessionOutcome {
  return { matchupId, sessionType, winnerId };
}

describe('tallyTeammateBattles', () => {
  it('keeps Grand Prix and sprint sessions separate', () => {
    const tallies = tallyTeammateBattles([
      outcome('quali', LEC),
      outcome('sprint_quali', LEC),
      outcome('race', HAM),
      outcome('sprint', HAM),
      outcome('race', LEC),
    ]);

    const ferrari = tallies.get(FERRARI)!;
    expect(ferrari.get(LEC)).toEqual({
      qualifying: 1,
      race: 1,
      sprintQualifying: 1,
      sprint: 0,
      total: 3,
    });
    expect(ferrari.get(HAM)).toEqual({
      qualifying: 0,
      race: 1,
      sprintQualifying: 0,
      sprint: 1,
      total: 2,
    });
  });

  it('keeps teams separate', () => {
    const mclaren = matchup('mclaren');
    const NOR = driver('NOR');

    const tallies = tallyTeammateBattles([
      outcome('race', LEC),
      outcome('race', NOR, mclaren),
    ]);

    expect(tallies.get(FERRARI)!.get(LEC)!.total).toBe(1);
    expect(tallies.get(mclaren)!.get(NOR)!.total).toBe(1);
    expect(tallies.get(FERRARI)!.get(NOR)).toBeUndefined();
  });

  it('counts nothing for a pair with no settled sessions', () => {
    // Both drivers failing to start voids the matchup, so no outcome is
    // recorded and the pair simply has no record yet.
    expect(tallyTeammateBattles([]).get(FERRARI)).toBeUndefined();
  });
});

describe('sortByConstructorStanding', () => {
  it('uses the shared championship order instead of team name', () => {
    const teams = [
      { team: 'Alpine' },
      { team: 'Ferrari' },
      { team: 'Mercedes' },
    ];

    expect(sortByConstructorStanding(teams).map((team) => team.team)).toEqual([
      'Mercedes',
      'Ferrari',
      'Alpine',
    ]);
  });

  it('falls back to team name for unknown entries', () => {
    const teams = [
      { team: 'Zulu Racing' },
      { team: 'Mercedes' },
      { team: 'Alpha Racing' },
    ];

    expect(sortByConstructorStanding(teams).map((team) => team.team)).toEqual([
      'Mercedes',
      'Alpha Racing',
      'Zulu Racing',
    ]);
  });
});
