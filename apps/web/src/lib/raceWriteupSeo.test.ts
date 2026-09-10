import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { listRaceWriteups } from './raceWriteups';
import {
  circuitPageRedirectTarget,
  racePageWriteupHeadOptions,
} from './raceWriteupSeo';

describe('racePageWriteupHeadOptions', () => {
  it('canonicalises a race page with a write-up to the write-up, noindexed', () => {
    expect(racePageWriteupHeadOptions('italy-2026')).toEqual({
      canonicalPath: '/f1-2026-italian-grand-prix-predictions',
      noIndex: true,
    });
    expect(racePageWriteupHeadOptions('madrid-2026')).toEqual({
      canonicalPath: '/f1-2026-madrid-grand-prix-predictions',
      noIndex: true,
    });
  });

  it('leaves a race page without a write-up self-canonical and indexable', () => {
    expect(racePageWriteupHeadOptions('miami-2026')).toBeNull();
  });
});

describe('circuitPageRedirectTarget', () => {
  it('sends a circuit with a write-up to that write-up', () => {
    expect(circuitPageRedirectTarget('madring')).toBe(
      '/f1-2026-madrid-grand-prix-predictions',
    );
    expect(circuitPageRedirectTarget('monza')).toBe(
      '/f1-2026-italian-grand-prix-predictions',
    );
    expect(circuitPageRedirectTarget('sepang')).toBe(
      '/f1-2026-bahrain-grand-prix-predictions',
    );
  });

  it('leaves circuits without a write-up on the calendar', () => {
    // Barcelona is the other Spanish round; its slug is still spain-2026.
    expect(circuitPageRedirectTarget('barcelona')).toBe('/races');
    expect(circuitPageRedirectTarget('sakhir')).toBe('/races');
    expect(circuitPageRedirectTarget('unknown-circuit')).toBe('/races');
  });
});

/**
 * Every write-up route on disk is in the registry.
 *
 * The checks around write-ups all iterate `listRaceWriteups()`, so they read
 * outward from the registry and a route file that was never registered is
 * invisible to all of them. That file is the one shape that puts two
 * indexable pages on the same query: `getRaceWriteup` returns null for the
 * weekend, so the race page keeps asking to be indexed and stays in the
 * sitemap, while the new write-up asks to be indexed too. It is also an orphan
 * on the day it ships, which is the bug `raceWriteups.ts` was written to end.
 *
 * Reading the directory is what makes this catch the omission: deriving the
 * list from the registry would be the same blind spot in a second place.
 */
describe('write-up route registration', () => {
  const ROUTE_FILE = /^f1-\d{4}-.+-grand-prix-predictions\.tsx$/;

  it('registers every write-up route file in RACE_WRITEUPS', () => {
    const onDisk = readdirSync(`${process.cwd()}/src/routes`)
      .filter((file) => ROUTE_FILE.test(file))
      .map((file) => `/${file.replace(/\.tsx$/, '')}`);
    const registered = new Set(listRaceWriteups().map((writeup) => writeup.to));

    expect(onDisk.length).toBeGreaterThan(0);
    expect(
      onDisk.filter((route) => !registered.has(route)),
      'unregistered write-up routes compete with their own race page',
    ).toEqual([]);
  });
});
