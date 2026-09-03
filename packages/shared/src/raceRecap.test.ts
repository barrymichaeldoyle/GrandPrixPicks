import { describe, expect, it } from 'vitest';

import { promotedRaceRecap } from './raceRecap';

const scored = { race: { id: 'race_1' }, status: 'scored' as const };
const live = { race: { id: 'race_1' }, status: 'live' as const };
const pending = { race: { id: 'race_1' }, status: 'pending' as const };

describe('promotedRaceRecap', () => {
  it('promotes a scored race the weekend card has already moved past', () => {
    expect(promotedRaceRecap(scored, 'race_2', true)).toBe(scored);
  });

  it('promotes a running race over the picker for the same weekend', () => {
    // The picker can only show saved picks. The provisional standing is news.
    expect(promotedRaceRecap(live, 'race_1', true)).toBe(live);
  });

  it('holds a pending recap back while the picker still shows that race', () => {
    // Same race name and nothing else, so this would be pure repetition.
    expect(promotedRaceRecap(pending, 'race_1', true)).toBeNull();
  });

  it('promotes a pending recap once the picker has moved on without it', () => {
    // A race that left the picker unscored: saying so beats saying nothing.
    expect(promotedRaceRecap(pending, 'race_2', true)).toBe(pending);
  });

  it('holds the recap back once the window has closed', () => {
    expect(promotedRaceRecap(scored, 'race_2', false)).toBeNull();
    expect(promotedRaceRecap(live, 'race_1', false)).toBeNull();
  });

  it('handles no recap and no open weekend', () => {
    expect(promotedRaceRecap(null, 'race_2', true)).toBeNull();
    expect(promotedRaceRecap(undefined, undefined, true)).toBeNull();
    expect(promotedRaceRecap(scored, undefined, true)).toBe(scored);
  });
});
