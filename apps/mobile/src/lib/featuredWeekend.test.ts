import { describe, expect, it } from 'vitest';

import { getFeatured } from './featuredWeekend';
import type { RaceWeekend } from '../types';

function weekend(
  overrides: Partial<RaceWeekend> & Pick<RaceWeekend, 'slug' | 'round'>,
): RaceWeekend {
  return {
    country: 'Italy',
    hasSprint: false,
    name: 'Italian Grand Prix',
    sessions: [
      { startsAt: '2026-09-05T13:00:00.000Z', type: 'quali' },
      { startsAt: '2026-09-06T13:00:00.000Z', type: 'race' },
    ],
    weekendStart: '2026-09-04T10:00:00.000Z',
    ...overrides,
  };
}

describe('getFeatured', () => {
  it('names the next weekend that still has a session ahead', () => {
    const races = [
      weekend({
        slug: 'dutch-grand-prix',
        round: 12,
        weekendStart: '2026-08-28T10:00:00.000Z',
        sessions: [
          { startsAt: '2026-08-29T13:00:00.000Z', type: 'quali' },
          { startsAt: '2026-08-30T13:00:00.000Z', type: 'race' },
        ],
      }),
      weekend({ slug: 'italian-grand-prix', round: 13 }),
    ];
    const featured = getFeatured(races, Date.parse('2026-09-01T12:00:00.000Z'));
    expect(featured?.race.slug).toBe('italian-grand-prix');
    expect(featured?.round).toBe(13);
    expect(featured?.nextSession?.type).toBe('quali');
  });

  it('returns null once every weekend is complete', () => {
    expect(
      getFeatured(
        [weekend({ slug: 'italian-grand-prix', round: 13 })],
        Date.parse('2026-09-07T12:00:00.000Z'),
      ),
    ).toBeNull();
  });
});
