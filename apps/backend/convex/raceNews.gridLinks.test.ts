/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';
import { beforeEach, describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const RACE = 'italy-2026';

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 13,
      name: 'Italian Grand Prix',
      slug: RACE,
      raceStartAt: 2_000,
      predictionLockAt: 1_000,
      status: 'upcoming',
      createdAt: 100,
      updatedAt: 100,
    });
    for (const code of ['GAS', 'PIA']) {
      await ctx.db.insert('drivers', {
        code,
        displayName: `Driver ${code}`,
        team: 'Alpine',
        createdAt: 0,
        updatedAt: 0,
      });
    }
  });
}

const penalty = {
  raceSlug: RACE,
  key: 'piastri-monza-grid-penalty',
  headline: 'Piastri drops to sixth on the Monza grid',
  body: 'Three places for impeding Lawson in Q2.',
  affectsSessions: ['race' as const],
  sourceName: 'Example',
  sourceUrl: 'https://example.com/penalty',
};

function gridItem(newsKey?: string) {
  return {
    raceSlug: RACE,
    key: 'monza-starting-grid',
    headline: 'The Monza grid is set',
    body: 'Gasly starts his maiden pole.',
    affectsSessions: ['race' as const],
    sourceName: 'Example',
    sourceUrl: 'https://example.com/grid',
    startingGrid: [
      { position: 1, code: 'GAS' },
      {
        position: 2,
        code: 'PIA',
        note: '3-place penalty',
        ...(newsKey ? { newsKey } : {}),
      },
    ],
  };
}

let t: ReturnType<typeof convexTest>;

beforeEach(async () => {
  t = convexTest(schema, modules);
  await seed(t);
});

describe('linking a grid row to the story behind it', () => {
  it('refuses a key this weekend has no item for', async () => {
    // The same loudness as an unknown driver code: a row whose link goes
    // nowhere looks exactly like every other row until somebody taps it.
    await t.mutation(internal.raceNews.publish, penalty);
    const error = await t
      .mutation(internal.raceNews.publish, gridItem('no-such-story'))
      .catch((caught: unknown) => caught);

    // An operator mistake, not a fault: a ConvexError stays out of Sentry.
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data).toMatchObject({
      code: 'GRID_NEWS_KEY_MISSING',
      missing: [
        {
          position: 2,
          code: 'PIA',
          newsKey: 'no-such-story',
          reason: 'unpublished',
        },
      ],
      activeKeys: [penalty.key],
    });
    expect((error as ConvexError<{ message: string }>).data.message).toMatch(
      /P2 PIA -> "no-such-story"/,
    );
  });

  it('reports missing links on a dry run instead of throwing', async () => {
    const preview = await t.mutation(internal.raceNews.publish, {
      ...gridItem('no-such-story'),
      dryRun: true,
    });
    expect(preview).toMatchObject({
      dryRun: true,
      missingNewsKeys: [
        {
          position: 2,
          code: 'PIA',
          newsKey: 'no-such-story',
          reason: 'unpublished',
        },
      ],
    });
  });

  it('refuses a key that was retracted', async () => {
    await t.mutation(internal.raceNews.publish, penalty);
    await t.mutation(internal.raceNews.retract, {
      raceSlug: RACE,
      key: penalty.key,
    });
    await expect(
      t.mutation(internal.raceNews.publish, gridItem(penalty.key)),
    ).rejects.toThrow(/Retracted on italy-2026/);
  });

  it('refuses a grid that points at itself', async () => {
    await expect(
      t.mutation(internal.raceNews.publish, gridItem('monza-starting-grid')),
    ).rejects.toThrow(/carrying the grid/);
  });

  it('carries the key through to the reader', async () => {
    await t.mutation(internal.raceNews.publish, penalty);
    await t.mutation(internal.raceNews.publish, gridItem(penalty.key));

    const { items } = await t.query(api.raceNews.list, { raceSlug: RACE });
    const grid = items.find((item) => item.key === 'monza-starting-grid');
    expect(grid?.startingGrid?.[1]).toMatchObject({
      position: 2,
      code: 'PIA',
      note: '3-place penalty',
      newsKey: penalty.key,
    });
    // Only the key travels. The headline and body stay on the item they belong
    // to, so correcting the penalty story corrects the grid caption with it.
    expect(grid?.startingGrid?.[1]).not.toHaveProperty('headline');
  });

  it('leaves an unlinked row alone', async () => {
    await t.mutation(internal.raceNews.publish, gridItem());
    const { items } = await t.query(api.raceNews.list, { raceSlug: RACE });
    const grid = items.find((item) => item.key === 'monza-starting-grid');
    expect(grid?.startingGrid?.[1]?.newsKey).toBeUndefined();
    expect(grid?.startingGrid?.[1]?.note).toBe('3-place penalty');
  });
});
