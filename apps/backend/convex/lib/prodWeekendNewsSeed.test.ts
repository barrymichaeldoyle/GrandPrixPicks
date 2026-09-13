import { describe, expect, it } from 'vitest';

import {
  ITALY_2026_GRID_AND_WEEKEND_NEWS,
  MADRID_2026_NEWS,
} from './prodWeekendNewsSeed';

function gridOf(items: typeof ITALY_2026_GRID_AND_WEEKEND_NEWS, key: string) {
  const item = items.find((entry) => entry.key === key);
  if (!item?.startingGrid) {
    throw new Error(`missing grid ${key}`);
  }
  return item.startingGrid;
}

describe('prodWeekendNewsSeed', () => {
  it('publishes linked Monza stories before the grid that points at them', () => {
    const keys = ITALY_2026_GRID_AND_WEEKEND_NEWS.map((item) => item.key);
    expect(keys.at(-1)).toBe('monza-starting-grid');

    const linked = gridOf(
      ITALY_2026_GRID_AND_WEEKEND_NEWS,
      'monza-starting-grid',
    ).flatMap((entry) => (entry.newsKey ? [entry.newsKey] : []));
    expect(linked).toEqual([
      'verstappen-rear-axle-monza',
      'piastri-monza-grid-penalty',
      'antonelli-grid-penalty',
      'albon-grid-penalty',
      'alonso-pit-lane-start',
      'lawson-grid-penalty',
    ]);
    for (const newsKey of linked) {
      if (newsKey === 'antonelli-grid-penalty') {
        continue;
      }
      expect(keys.indexOf(newsKey)).toBeGreaterThan(-1);
      expect(keys.indexOf(newsKey)).toBeLessThan(
        keys.indexOf('monza-starting-grid'),
      );
    }
  });

  it('publishes linked Madrid stories before the grid that points at them', () => {
    const keys = MADRID_2026_NEWS.map((item) => item.key);
    expect(keys.at(-1)).toBe('madrid-starting-grid');

    const linked = gridOf(MADRID_2026_NEWS, 'madrid-starting-grid').flatMap(
      (entry) => (entry.newsKey ? [entry.newsKey] : []),
    );
    expect(linked).toEqual([
      'sainz-madrid-grid-penalty',
      'bearman-madrid-fp3-crash',
      'stroll-madrid-grid-penalty',
    ]);
    for (const newsKey of linked) {
      expect(keys.indexOf(newsKey)).toBeLessThan(
        keys.indexOf('madrid-starting-grid'),
      );
    }
  });
});
