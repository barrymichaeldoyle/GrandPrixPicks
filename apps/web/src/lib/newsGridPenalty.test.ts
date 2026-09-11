import { describe, expect, it } from 'vitest';

import {
  newsListMentionsGridPenalty,
  newsMentionsGridPenalty,
} from './newsGridPenalty';

describe('newsMentionsGridPenalty', () => {
  it('matches a dedicated penalty item by key', () => {
    expect(newsMentionsGridPenalty({ key: 'antonelli-grid-penalty' })).toBe(
      true,
    );
  });

  it('matches a dedicated penalty item by headline', () => {
    expect(
      newsMentionsGridPenalty({
        headline: 'Antonelli takes a grid penalty at Monza',
      }),
    ).toBe(true);
  });

  it('matches a grid whose caption names a penalty', () => {
    expect(
      newsMentionsGridPenalty({
        headline: 'The Monza grid is set',
        startingGrid: [
          { note: undefined },
          { note: '3-place penalty' },
          { note: 'Rear axle problem' },
        ],
      }),
    ).toBe(true);
  });

  it('ignores a grid with no penalty caption', () => {
    expect(
      newsMentionsGridPenalty({
        headline: 'The Madrid grid is set',
        startingGrid: [{ note: 'Pit lane' }, { note: 'Rear axle problem' }],
      }),
    ).toBe(false);
  });

  it('ignores a story that is not about a penalty', () => {
    expect(
      newsMentionsGridPenalty({
        key: 'williams-1981-livery',
        headline: 'Williams run their 1981 colours in Madrid',
      }),
    ).toBe(false);
  });

  it('reads feed-event field names', () => {
    expect(
      newsMentionsGridPenalty({
        newsKey: 'piastri-monza-grid-penalty',
        newsHeadline: 'Piastri drops to sixth on the Monza grid',
        newsStartingGrid: [{ note: '3-place penalty' }],
      }),
    ).toBe(true);
  });
});

describe('newsListMentionsGridPenalty', () => {
  it('is true when any item in the run is a penalty', () => {
    expect(
      newsListMentionsGridPenalty([
        { key: 'williams-1981-livery', headline: 'Williams 1981 colours' },
        { key: 'antonelli-grid-penalty' },
      ]),
    ).toBe(true);
  });

  it('is false when the run has none', () => {
    expect(
      newsListMentionsGridPenalty([
        { key: 'williams-1981-livery' },
        { headline: 'The Madrid grid is set', startingGrid: [] },
      ]),
    ).toBe(false);
  });
});
