import { describe, expect, it } from 'vitest';

import type { BakuCrash } from '@/lib/bakuCrashes';
import { BAKU_CRASHES } from '@/lib/bakuCrashes';

import {
  bucketOf,
  countsByCorner,
  countsByDriver,
  driverName,
  driversLabel,
  driverSurname,
  filterCrashes,
  heatStep,
  markerRadius,
  rankedCorners,
  rankedDrivers,
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

  describe('driver breakdown', () => {
    it('counts every car involved, not just the one at fault', () => {
      const counts = countsByDriver([
        crash({ drivers: ['VER', 'RIC'] }),
        crash({ drivers: ['VER'] }),
      ]);
      expect(counts.get('VER')).toBe(2);
      expect(counts.get('RIC')).toBe(1);
    });

    it('keeps drivers who have left Formula 1', () => {
      // This is circuit history, not form. Ricciardo and Raikkonen are part of
      // what the place is, and filtering to the current grid would say less.
      const counts = countsByDriver(BAKU_CRASHES);
      expect(counts.get('RIC')).toBeGreaterThan(0);
      expect(counts.get('RAI')).toBeGreaterThan(0);
    });

    it('ranks busiest first, then alphabetically for a stable tie', () => {
      const ranked = rankedDrivers(
        new Map([
          ['STR', 6],
          ['HUL', 6],
          ['RIC', 5],
        ]),
      );
      expect(ranked).toEqual([
        { driver: 'HUL', count: 6 },
        { driver: 'STR', count: 6 },
        { driver: 'RIC', count: 5 },
      ]);
    });
  });

  describe('driver names', () => {
    it('writes incidents with full names rather than codes', () => {
      expect(driversLabel(['HUL'])).toBe('Nico Hülkenberg');
      expect(driversLabel(['HUL', 'OCO'])).toBe(
        'Nico Hülkenberg and Esteban Ocon',
      );
      expect(driversLabel(['SIR', 'ALO', 'HUL'])).toBe(
        'Sergey Sirotkin, Fernando Alonso and Nico Hülkenberg',
      );
    });

    it('says so when nobody was named', () => {
      expect(driversLabel([])).toBe('Unattributed');
    });

    it('takes the surname for a table row, keeping multi-word ones whole', () => {
      expect(driverSurname('HUL')).toBe('Hülkenberg');
      expect(driverSurname('DEV')).toBe('de Vries');
    });

    it('falls back to the code rather than rendering undefined', () => {
      expect(driverName('ZZZ')).toBe('ZZZ');
      expect(driverSurname('ZZZ')).toBe('ZZZ');
    });
  });
});
