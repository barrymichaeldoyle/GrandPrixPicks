import { describe, expect, it } from 'vitest';

import { BAKU_CORNERS } from './bakuCircuitGeometry';
import { BAKU_CRASHES } from './bakuCrashes';

/**
 * Invariants for the hand-maintained crash archive.
 *
 * These exist because the file is edited by a person about once a year, which
 * is exactly the cadence at which nobody remembers the rules. The citation
 * check is the important one: an uncited incident on a page whose whole claim
 * is that it can be checked would be worse than no incident at all.
 */
describe('baku crash data', () => {
  it('has a unique id for every incident', () => {
    const ids = new Set(BAKU_CRASHES.map((crash) => crash.id));
    expect(ids.size).toBe(BAKU_CRASHES.length);
  });

  it('cites every incident', () => {
    for (const crash of BAKU_CRASHES) {
      expect(
        crash.source.startsWith('https://') ||
          crash.source.startsWith('openf1:'),
        `${crash.id} needs a source`,
      ).toBe(true);
    }
  });

  it('only places incidents on corners the circuit actually has', () => {
    const known = new Set(BAKU_CORNERS.map((corner) => corner.number));
    for (const crash of BAKU_CRASHES) {
      if (crash.corner !== null) {
        expect(known.has(crash.corner), `${crash.id} corner`).toBe(true);
      }
    }
  });

  it('names at least one driver, or explicitly none', () => {
    for (const crash of BAKU_CRASHES) {
      expect(Array.isArray(crash.drivers)).toBe(true);
      for (const driver of crash.drivers) {
        expect(driver, `${crash.id} driver code`).toMatch(/^[A-Z]{3}$/);
      }
    }
  });

  it('covers every weekend the circuit has held, and no cancelled one', () => {
    const years = [...new Set(BAKU_CRASHES.map((crash) => crash.year))].sort();
    expect(years).toEqual([
      2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025,
    ]);
    // 2020 was cancelled; a row for it would mean a fabricated weekend.
    expect(years).not.toContain(2020);
  });

  it('calls 2016 by the name it ran under', () => {
    // The circuit's first Formula 1 race was the European Grand Prix, not the
    // Azerbaijan Grand Prix. Race identity and circuit are separate facts.
    const first = BAKU_CRASHES.filter((crash) => crash.year === 2016);
    expect(first.length).toBeGreaterThan(0);
    for (const crash of first) {
      expect(crash.event).toBe('European Grand Prix');
    }
  });

  it('rates confidence on every row, with nothing left unverified', () => {
    for (const crash of BAKU_CRASHES) {
      expect(['high', 'medium']).toContain(crash.confidence);
    }
  });

  it('writes notes without em dashes', () => {
    // House style: em dashes read as generic AI copy in player-facing text.
    for (const crash of BAKU_CRASHES) {
      expect(crash.note, `${crash.id} note`).not.toMatch(/—/);
    }
  });
});
