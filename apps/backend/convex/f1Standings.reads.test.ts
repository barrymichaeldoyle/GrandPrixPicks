/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { expect, it } from 'vitest';
import {
  CHAMPIONSHIP_SESSIONS,
  loadChampionship,
  loadSeasonResults,
  rankChampionship,
} from './f1Standings';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

it('scopes official standings to scoring sessions while keeping the qualifying comparison complete', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const driverId = await ctx.db.insert('drivers', {
      code: 'AAA',
      displayName: 'Driver',
      team: 'McLaren',
      createdAt: 0,
      updatedAt: 0,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Race',
      slug: 'race',
      hasSprint: true,
      raceStartAt: 1,
      predictionLockAt: 1,
      status: 'finished',
      createdAt: 0,
      updatedAt: 0,
    });
    for (const sessionType of [
      'race',
      'sprint',
      'quali',
      'sprint_quali',
    ] as const) {
      await ctx.db.insert('results', {
        raceId,
        sessionType,
        classification: [driverId],
        publishedAt: 1,
        updatedAt: 1,
      });
    }
    const all = await loadSeasonResults(ctx, 2026);
    const scoring = await loadSeasonResults(ctx, 2026, CHAMPIONSHIP_SESSIONS);
    expect(all.sessions).toHaveLength(4);
    expect(scoring.sessions.map((session) => session.sessionType)).toEqual([
      'race',
      'sprint',
    ]);
    const old = {
      season: 2026,
      ...rankChampionship(all, {
        sessionTypes: CHAMPIONSHIP_SESSIONS,
        headlineSession: 'race',
        podiumDepth: 3,
        includeHistory: true,
      }),
    };
    expect(await loadChampionship(ctx, 2026, true)).toEqual(old);
  });
  const comparison = await t.query(
    api.qualifyingChampionship.getQualifyingChampionship,
    { season: 2026 },
  );
  expect(comparison.roundsScored).toBe(1);
  expect(comparison.drivers).toHaveLength(1);
});
