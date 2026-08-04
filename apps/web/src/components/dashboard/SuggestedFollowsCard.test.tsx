import { describe, expect, it } from 'vitest';

import { reasonText } from './SuggestedFollowsCard';

type Suggestion = Parameters<typeof reasonText>[0];

function mutual(displayName: string) {
  return {
    username: displayName.toLowerCase(),
    displayName,
    avatarUrl: undefined,
  };
}

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    _id: 'user_1',
    username: 'oscarp',
    displayName: 'Oscar Piastri',
    avatarUrl: undefined,
    sharedLeagueCount: 1,
    sharedLeagueNames: ['Monaco Masters'],
    mutualFollowerCount: 0,
    mutualFollowers: [],
    ...overrides,
  } as Suggestion;
}

describe('suggested follow reason', () => {
  it('names a single mutual follower without a count', () => {
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 1,
          mutualFollowers: [mutual('Lando')],
        }),
      ),
    ).toBe('Followed by Lando');
  });

  it('names every mutual when the backend returned them all', () => {
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 3,
          mutualFollowers: [
            mutual('Lando'),
            mutual('George'),
            mutual('Carlos'),
          ],
        }),
      ),
    ).toBe('Followed by Lando, George and Carlos');
  });

  it('counts the unnamed remainder against the real total, not the named list', () => {
    // The backend names at most 3. With 12 mutuals the line has to say 11
    // others, not 2 — getting this wrong under-reports the social proof.
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 12,
          mutualFollowers: [
            mutual('Lando'),
            mutual('George'),
            mutual('Carlos'),
          ],
        }),
      ),
    ).toBe('Followed by Lando and 11 others you follow');
  });

  it('falls back to a bare count when no mutual could be named', () => {
    // Incomplete profiles get filtered out server-side, so the count can
    // outlive the names. Without this branch the copy reads "Followed by
    // undefined".
    expect(
      reasonText(suggestion({ mutualFollowerCount: 2, mutualFollowers: [] })),
    ).toBe('Followed by 2 players you follow');
    expect(
      reasonText(suggestion({ mutualFollowerCount: 1, mutualFollowers: [] })),
    ).toBe('Followed by 1 player you follow');
  });

  it('falls back to shared leagues when there are no mutuals', () => {
    expect(reasonText(suggestion())).toBe('In Monaco Masters');
    expect(
      reasonText(
        suggestion({
          sharedLeagueNames: ['Monaco Masters', 'Office GP'],
          sharedLeagueCount: 2,
        }),
      ),
    ).toBe('In Monaco Masters and Office GP');
  });

  it('falls back to a league count when the names are unavailable', () => {
    expect(
      reasonText(suggestion({ sharedLeagueNames: [], sharedLeagueCount: 4 })),
    ).toBe('In 4 leagues with you');
  });
});
