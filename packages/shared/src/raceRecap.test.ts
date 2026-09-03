import { describe, expect, it } from 'vitest';

import { promotedRaceRecap } from './raceRecap';

describe('promotedRaceRecap', () => {
  const recap = { race: { id: 'race_1' } };

  it('promotes a scored race the weekend card has already moved past', () => {
    expect(promotedRaceRecap(recap, 'race_2', true)).toBe(recap);
  });

  it('holds the recap back while the picks card still shows that race', () => {
    // Every Grand Prix passes through this: the race is running, nothing is
    // published, so `getCurrentWeekend` still returns it. Promoting here would
    // put two cards for one race on top of each other.
    expect(promotedRaceRecap(recap, 'race_1', true)).toBeNull();
  });

  it('holds the recap back once the window has closed', () => {
    expect(promotedRaceRecap(recap, 'race_2', false)).toBeNull();
  });

  it('handles no recap and no open weekend', () => {
    expect(promotedRaceRecap(null, 'race_2', true)).toBeNull();
    expect(promotedRaceRecap(undefined, undefined, true)).toBeNull();
    // A recap with no weekend card below it still leads.
    expect(promotedRaceRecap(recap, undefined, true)).toBe(recap);
  });
});
