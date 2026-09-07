import { describe, expect, it } from 'vitest';

import type { BakuCrash } from '@/lib/bakuCrashes';
import { BAKU_CRASHES } from '@/lib/bakuCrashes';

import {
  bucketOf,
  countsByCorner,
  filterCrashes,
  heatStep,
  markerRadius,
  rankedCorners,
  unplacedCount,
} from './bakuCrashMapModel';

function crash(overrides: Partial<BakuCrash> = {}): BakuCrash {
  return {
    id: 'test',
    year: 2024,
    event: 'Azerbaijan Grand Prix',
    session: 'Race',
    drivers: ['VER'],
    corner: 3,
    outcome: 'dnf',
    confidence: 'high',
    note: 'Test.',
    source: 'https://example.com',
    ...overrides,
  };
}

describe('baku crash map model', () => {
  describe('session buckets', () => {
    it('folds sprint sessions into the neighbouring bucket', () => {
      // Baku has held one sprint weekend and 2026 is not one, so a Sprint
      // filter would be a near-empty tab for a format that is not running.
      expect(bucketOf('SprintQualifying')).toBe('qualifying');
      expect(bucketOf('Sprint')).toBe('race');
    });

    it('groups the three practice sessions together', () => {
      expect(bucketOf('FP1')).toBe('practice');
      expect(bucketOf('FP2')).toBe('practice');
      expect(bucketOf('FP3')).toBe('practice');
    });

    it('keeps a folded incident labelled with its real session', () => {
      const sprint = BAKU_CRASHES.find((c) => c.session === 'Sprint');
      expect(sprint?.session).toBe('Sprint');
      expect(bucketOf('Sprint')).toBe('race');
    });
  });

  describe('filtering', () => {
    it('returns everything for the all filter', () => {
      expect(filterCrashes(BAKU_CRASHES, 'all')).toHaveLength(
        BAKU_CRASHES.length,
      );
    });

    it('splits the whole dataset across the three session buckets', () => {
      const parts = (['practice', 'qualifying', 'race'] as const).map(
        (f) => filterCrashes(BAKU_CRASHES, f).length,
      );
      expect(parts.reduce((a, b) => a + b, 0)).toBe(BAKU_CRASHES.length);
    });
  });

  describe('counting', () => {
    it('tallies incidents per corner', () => {
      const counts = countsByCorner([
        crash({ corner: 3 }),
        crash({ corner: 3 }),
        crash({ corner: 15 }),
      ]);
      expect(counts.get(3)).toBe(2);
      expect(counts.get(15)).toBe(1);
    });

    it('never places an incident whose corner is unknown', () => {
      // Putting an unplaced incident on a corner would invent the one fact
      // the map exists to show.
      const counts = countsByCorner([crash({ corner: null })]);
      expect(counts.size).toBe(0);
      expect(unplacedCount([crash({ corner: null }), crash()])).toBe(1);
    });

    it('ranks corners busiest first, then by corner number', () => {
      const ranked = rankedCorners(
        new Map([
          [15, 4],
          [3, 4],
          [2, 9],
        ]),
      );
      expect(ranked).toEqual([
        { corner: 2, count: 9 },
        { corner: 3, count: 4 },
        { corner: 15, count: 4 },
      ]);
    });
  });

  describe('heat steps', () => {
    it('puts the busiest corner on the top step and the quietest on the first', () => {
      expect(heatStep(11, 11)).toBe(5);
      expect(heatStep(1, 11)).toBe(1);
    });

    it('gives an absent corner no step at all', () => {
      expect(heatStep(0, 11)).toBe(0);
    });

    it('rescales to the filtered maximum', () => {
      // Pinned to the all-sessions maximum, every corner under a narrow
      // filter would render at the bottom step and the map would look empty
      // rather than quiet.
      expect(heatStep(2, 2)).toBe(5);
      expect(heatStep(2, 11)).toBe(1);
    });

    it('handles a filter that leaves one incident anywhere', () => {
      expect(heatStep(1, 1)).toBe(5);
    });
  });

  describe('marker radius', () => {
    it('scales by area rather than radius', () => {
      // A circle whose radius doubles looks four times bigger, which would
      // overstate a corner with twice the incidents.
      const min = markerRadius(1, 101);
      const mid = markerRadius(26, 101);
      const max = markerRadius(101, 101);
      expect(mid - min).toBeGreaterThan((max - min) * 0.4);
      expect(mid).toBeLessThan(max);
    });

    it('keeps every drawn marker above the 8px minimum', () => {
      expect(markerRadius(1, 11)).toBeGreaterThanOrEqual(8);
    });

    it('draws nothing for a corner with no incidents', () => {
      expect(markerRadius(0, 11)).toBe(0);
    });
  });
});
