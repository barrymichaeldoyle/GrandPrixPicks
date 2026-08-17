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

  it('puts the whole 2026 grid in championship order, not name order', () => {
    // The feed's session header strip and a feed item's expanded picks both
    // run through here. They used to be alphabetical, which put Alpine above
    // Mercedes and read as arbitrary next to the duel grid the picks were made
    // in. Shuffled input, so passing by luck is not an option.
    const shuffled = [
      { team: 'Williams' },
      { team: 'Ferrari' },
      { team: 'Cadillac' },
      { team: 'Alpine' },
      { team: 'Red Bull Racing' },
      { team: 'Haas' },
      { team: 'Mercedes' },
      { team: 'Aston Martin' },
      { team: 'Racing Bulls' },
      { team: 'Audi' },
      { team: 'McLaren' },
    ];

    expect(sortByConstructorStanding(shuffled).map((t) => t.team)).toEqual([
      'McLaren',
      'Mercedes',
      'Red Bull Racing',
      'Ferrari',
      'Williams',
      'Racing Bulls',
      'Aston Martin',
      'Haas',
      'Audi',
      'Alpine',
      'Cadillac',
    ]);
  });

  it('does not reorder teams that are already in championship order', () => {
    const ordered = [
      { team: 'McLaren' },
      { team: 'Mercedes' },
      { team: 'Red Bull Racing' },
    ];

    expect(sortByConstructorStanding(ordered).map((t) => t.team)).toEqual([
      'McLaren',
      'Mercedes',
      'Red Bull Racing',
    ]);
  });

  it('follows this season once points exist, not last season', () => {
    // The whole point of passing the live table: a team that has climbed shows
    // where it has climbed to, without anyone editing a constant.
    const teams = [
      { team: 'McLaren' },
      { team: 'Alpine' },
      { team: 'Ferrari' },
    ];
    const livePoints = new Map([
      ['Alpine', 300],
      ['Ferrari', 200],
      ['McLaren', 10],
    ]);

    expect(
      sortByConstructorStanding(teams, livePoints).map((t) => t.team),
    ).toEqual(['Alpine', 'Ferrari', 'McLaren']);
  });

  it('breaks ties on last season rather than falling back to the alphabet', () => {
    // Before a wheel turns, every team is level on nothing. Sorting on points
    // alone would collapse to alphabetical here, which is the arbitrary order
    // the whole helper exists to avoid.
    const teams = [
      { team: 'Alpine' },
      { team: 'McLaren' },
      { team: 'Mercedes' },
    ];
    const noneScoredYet = new Map<string, number>();

    expect(
      sortByConstructorStanding(teams, noneScoredYet).map((t) => t.team),
    ).toEqual(['McLaren', 'Mercedes', 'Alpine']);
  });

  it('sorts a team with points ahead of one the live table has never seen', () => {
    const teams = [{ team: 'Cadillac' }, { team: 'Alpine' }];
    const livePoints = new Map([['Alpine', 1]]);

    expect(
      sortByConstructorStanding(teams, livePoints).map((t) => t.team),
    ).toEqual(['Alpine', 'Cadillac']);
  });

  it('leaves the input array untouched', () => {
    // feed.ts assigns the result rather than sorting in place; this is what
    // makes that safe.
    const input = [{ team: 'Alpine' }, { team: 'Mercedes' }];
    sortByConstructorStanding(input);

    expect(input.map((t) => t.team)).toEqual(['Alpine', 'Mercedes']);
  });
});
