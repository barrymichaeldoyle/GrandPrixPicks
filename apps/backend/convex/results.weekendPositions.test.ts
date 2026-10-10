/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('getWeekendSessionPositions', () => {
  it('lists each published session in running order with statuses', async () => {
    const t = convexTest(schema, modules);
    const { raceId, ver, had } = await t.run(async (ctx) => {
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 18,
        name: 'Singapore Grand Prix',
        slug: 'singapore-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_000,
        status: 'upcoming',
        hasSprint: true,
        createdAt: 100,
        updatedAt: 100,
      });
      function driver(code: string) {
        return ctx.db.insert('drivers', {
          code,
          displayName: code,
          createdAt: 100,
          updatedAt: 100,
        });
      }
      const ver = await driver('VER');
      const had = await driver('HAD');
      // Inserted out of weekend order on purpose.
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'sprint',
        classification: [ver, had],
        driverStatuses: [{ driverId: had, status: 'dnf' }],
        publishedAt: 300,
        updatedAt: 300,
      });
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'sprint_quali',
        classification: [had, ver],
        publishedAt: 200,
        updatedAt: 200,
      });
      return { raceId, ver, had };
    });

    const sessions = await t.query(api.results.getWeekendSessionPositions, {
      raceId,
    });

    expect(sessions).toEqual([
      {
        sessionType: 'sprint_quali',
        entries: [
          { driverId: had, position: 1, status: null },
          { driverId: ver, position: 2, status: null },
        ],
      },
      {
        sessionType: 'sprint',
        entries: [
          { driverId: ver, position: 1, status: null },
          { driverId: had, position: 2, status: 'dnf' },
        ],
      },
    ]);
  });
});
