/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import { loadNewsHeadlines } from './raceNews';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const base = {
  raceSlug: 'las-vegas-2026',
  body: 'Body.',
  affectsSessions: [],
  category: 'general' as const,
  sourceName: 'Example',
  sourceUrl: 'https://example.com/story',
};

describe('loadNewsHeadlines', () => {
  it('gives a story a team only when every driver it names drives for it', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 21,
        name: 'Las Vegas Grand Prix',
        slug: 'las-vegas-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_900,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
      for (const [code, team] of [
        ['RUS', 'Mercedes'],
        ['ANT', 'Mercedes'],
        ['NOR', 'McLaren'],
      ] as const) {
        await ctx.db.insert('drivers', {
          code,
          displayName: `Driver ${code}`,
          team,
          createdAt: 0,
          updatedAt: 0,
        });
      }
    });

    for (const story of [
      {
        key: 'mercedes',
        headline: 'Mercedes story',
        driverCodes: ['RUS', 'ANT'],
      },
      { key: 'mixed', headline: 'Two-team story', driverCodes: ['RUS', 'NOR'] },
      { key: 'tyres', headline: 'Tyre story', driverCodes: [] },
    ]) {
      await t.mutation(internal.raceNews.publish, { ...base, ...story });
    }

    const headlines = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'las-vegas-2026'))
        .unique();
      return await loadNewsHeadlines(ctx, race!, 5);
    });

    const byKey = new Map(headlines.items.map((item) => [item.key, item]));
    expect(byKey.get('mercedes')).toMatchObject({
      team: 'Mercedes',
      driverCodes: ['RUS', 'ANT'],
    });
    expect(byKey.get('mixed')).toMatchObject({
      team: null,
      driverCodes: ['RUS', 'NOR'],
    });
    expect(byKey.get('tyres')).toMatchObject({ team: null, driverCodes: [] });
  });
});
