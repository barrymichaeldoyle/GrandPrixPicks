import { describe, expect, it } from 'vitest';

import type { Id } from './_generated/dataModel';
import { rankBeforeLastScoredRace } from './home';

function user(id: string) {
  return id as Id<'users'>;
}

function row(id: string, top5Points: number, h2hPoints = 0) {
  return { userId: user(id), top5Points, h2hPoints };
}

describe('rankBeforeLastScoredRace', () => {
  it('ranks on the season total minus the last race, not on the total', () => {
    // Before the last race: b 100, a 90, c 80. The race then moved a to the
    // front, so a climbed one and b dropped one.
    const ranks = rankBeforeLastScoredRace(
      [row('a', 120), row('b', 110), row('c', 85)],
      new Map([
        ['a', 30],
        ['b', 10],
        ['c', 5],
      ]),
    );

    expect(ranks.get(user('b'))).toBe(1);
    expect(ranks.get(user('a'))).toBe(2);
    expect(ranks.get(user('c'))).toBe(3);
  });

  it('counts H2H points toward the previous total', () => {
    const ranks = rankBeforeLastScoredRace(
      [row('a', 50, 40), row('b', 80, 5)],
      new Map([
        ['a', 5],
        ['b', 30],
      ]),
    );

    // a: 90 - 5 = 85, b: 85 - 30 = 55.
    expect(ranks.get(user('a'))).toBe(1);
    expect(ranks.get(user('b'))).toBe(2);
  });

  it('omits players who had no points before the last race', () => {
    const ranks = rankBeforeLastScoredRace(
      [row('veteran', 60), row('debutant', 25)],
      new Map([
        ['veteran', 10],
        ['debutant', 25],
      ]),
    );

    expect(ranks.get(user('veteran'))).toBe(1);
    // Entered the table at this race, so there is no previous rank to move from.
    expect(ranks.has(user('debutant'))).toBe(false);
  });

  it('gives players level on previous points the same rank', () => {
    const ranks = rankBeforeLastScoredRace(
      [row('a', 70), row('b', 60), row('c', 55)],
      new Map([
        ['a', 20],
        ['b', 10],
        ['c', 5],
      ]),
    );

    // All three sat on 50 before the race, so none of them can report a move.
    expect(ranks.get(user('a'))).toBe(1);
    expect(ranks.get(user('b'))).toBe(1);
    expect(ranks.get(user('c'))).toBe(1);
  });

  it('reports no movement when nobody scored in the last race', () => {
    const rows = [row('a', 30), row('b', 20), row('c', 10)];
    const ranks = rankBeforeLastScoredRace(rows, new Map());

    for (const [index, r] of rows.entries()) {
      expect(ranks.get(r.userId)).toBe(index + 1);
    }
  });
});
