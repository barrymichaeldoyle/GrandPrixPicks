import { describe, expect, it } from 'vitest';

import { findRaceBySlugOrLegacyRef } from './races';

describe('findRaceBySlugOrLegacyRef', () => {
  const races = [
    { _id: 'j57abc', slug: 'australia-2026' },
    { _id: 'j57def', slug: 'china-2026' },
  ];

  it('matches a canonical slug', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'china-2026')).toEqual(races[1]);
  });

  it('matches a legacy race document id', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'j57def')).toEqual(races[1]);
  });

  it('returns null when no race matches', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'missing-race')).toBeNull();
  });
});
