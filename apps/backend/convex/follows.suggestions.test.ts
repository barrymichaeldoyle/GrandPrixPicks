import { describe, expect, it } from 'vitest';

import type { Id } from './_generated/dataModel';
import { intersectMutualFollowers, rankSuggestionsByMutuals } from './follows';

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

function candidate(
  displayName: string,
  mutualFollowerCount: number,
  sharedLeagueCount: number,
) {
  return { displayName, mutualFollowerCount, sharedLeagueCount };
}

describe('intersectMutualFollowers', () => {
  it('keeps only followers the viewer already follows', () => {
    const mutuals = intersectMutualFollowers(
      [userId('lando'), userId('stranger'), userId('george')],
      new Set([userId('lando'), userId('george'), userId('carlos')]),
    );

    expect(mutuals).toEqual([userId('lando'), userId('george')]);
  });

  it('preserves follow order, since the first three become the named ones', () => {
    const mutuals = intersectMutualFollowers(
      [userId('george'), userId('lando')],
      new Set([userId('lando'), userId('george')]),
    );

    expect(mutuals).toEqual([userId('george'), userId('lando')]);
  });

  it('de-duplicates, so a doubled follow edge cannot inflate the count', () => {
    const mutuals = intersectMutualFollowers(
      [userId('lando'), userId('lando')],
      new Set([userId('lando')]),
    );

    expect(mutuals).toEqual([userId('lando')]);
  });

  it('returns nothing when the viewer follows nobody', () => {
    expect(intersectMutualFollowers([userId('lando')], new Set())).toEqual([]);
  });
});

describe('rankSuggestionsByMutuals', () => {
  it('puts mutual followers ahead of shared leagues', () => {
    // The whole point of the feature: one mutual beats three shared leagues.
    const ranked = rankSuggestionsByMutuals([
      candidate('Leaguemate', 0, 3),
      candidate('Mutual', 1, 1),
    ]);

    expect(ranked.map((c) => c.displayName)).toEqual(['Mutual', 'Leaguemate']);
  });

  it('falls back to shared leagues when mutuals tie', () => {
    const ranked = rankSuggestionsByMutuals([
      candidate('Fewer leagues', 2, 1),
      candidate('More leagues', 2, 4),
    ]);

    expect(ranked.map((c) => c.displayName)).toEqual([
      'More leagues',
      'Fewer leagues',
    ]);
  });

  it('breaks full ties by name so the card does not reshuffle on every tick', () => {
    const ranked = rankSuggestionsByMutuals([
      candidate('Zoe', 1, 1),
      candidate('Adam', 1, 1),
    ]);

    expect(ranked.map((c) => c.displayName)).toEqual(['Adam', 'Zoe']);
  });

  it('does not mutate the input', () => {
    const input = [candidate('Zoe', 0, 1), candidate('Adam', 5, 1)];
    rankSuggestionsByMutuals(input);

    expect(input.map((c) => c.displayName)).toEqual(['Zoe', 'Adam']);
  });
});
