import { describe, expect, it } from 'vitest';

import {
  liveRaceGap,
  qualifyingSegmentLabel,
  splitLiveOrder,
} from './liveSessionBoard';

describe('qualifyingSegmentLabel', () => {
  it('prefixes sprint qualifying segments with S', () => {
    expect(qualifyingSegmentLabel('quali', 2)).toBe('Q2');
    expect(qualifyingSegmentLabel('sprint_quali', 1)).toBe('SQ1');
  });
});

describe('splitLiveOrder', () => {
  it('keeps the running top and groups knockouts, latest segment first', () => {
    const entries = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd', knockedOutIn: 2 as const },
      { id: 'e', knockedOutIn: 1 as const },
      { id: 'f', knockedOutIn: 1 as const },
    ];

    const { top, knockouts } = splitLiveOrder(entries, 2);

    expect(top.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(
      knockouts.map((group) => [
        group.segment,
        group.entries.map((entry) => entry.id),
      ]),
    ).toEqual([
      [2, ['d']],
      [1, ['e', 'f']],
    ]);
  });

  it('has no knockouts for practice', () => {
    expect(splitLiveOrder([{ id: 'a' }], 6).knockouts).toEqual([]);
  });
});

describe('liveRaceGap', () => {
  it('names the leader and formats gaps and lapped cars', () => {
    expect(liveRaceGap({ position: 1, gapToLeaderSeconds: 0 })).toBe('Leader');
    expect(liveRaceGap({ position: 2, gapToLeaderSeconds: 1.2 })).toBe(
      '+1.200',
    );
    expect(liveRaceGap({ position: 18, lapsBehind: 1 })).toBe('+1 lap');
    expect(liveRaceGap({ position: 20, lapsBehind: 2 })).toBe('+2 laps');
    expect(liveRaceGap({ position: 5 })).toBe('—');
  });
});
