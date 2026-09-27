/// <reference types="vite/client" />
import {
  weekendStarts,
  groupFeedEvents,
} from '@grandprixpicks/shared/feedGroups';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { buildFilteredFeedPage } from './feed';
import { insertFeedEvent } from './lib/feedSort';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function insertRace(ctx: MutationCtx, round: number, slug: string) {
  return await ctx.db.insert('races', {
    season: 2026,
    round,
    name: slug,
    slug,
    raceStartAt: round * 1000,
    predictionLockAt: round * 1000,
    status: 'upcoming',
    createdAt: 1,
    updatedAt: 1,
  });
}

function news(raceId: Id<'races'> | undefined, key: string, createdAt: number) {
  return {
    type: 'race_news' as const,
    ...(raceId ? { raceId } : {}),
    newsKey: key,
    newsHeadline: key,
    createdAt,
  };
}

describe('feed order', () => {
  it('keeps a late story with its own weekend instead of between the next one', async () => {
    const t = convexTest(schema, modules);
    const keys = await t.run(async (ctx) => {
      const baku = await insertRace(ctx, 15, 'azerbaijan-2026');
      const sepang = await insertRace(ctx, 16, 'bahrain-2026');
      await insertFeedEvent(ctx, news(baku, 'baku-qualifying', 100));
      await insertFeedEvent(ctx, news(sepang, 'sepang-penalty', 200));
      // Baku news published after Sepang coverage has started.
      await insertFeedEvent(ctx, news(baku, 'baku-grand-slam', 300));
      await insertFeedEvent(ctx, news(sepang, 'sepang-tyres', 400));
      // A story about no race joins the weekend at the top of the feed.
      await insertFeedEvent(ctx, news(undefined, 'global', 500));
      return { baku, sepang };
    });

    const { page } = await t.run((ctx) =>
      buildFilteredFeedPage(ctx, new Set(), null),
    );
    expect(page.map((event) => event.newsKey)).toEqual([
      'global',
      'sepang-tyres',
      'sepang-penalty',
      'baku-grand-slam',
      'baku-qualifying',
    ]);
    // One chequered split, between the two weekends.
    expect(weekendStarts(groupFeedEvents(page))).toEqual([false, true]);
    expect(page[3]).toMatchObject({ raceId: keys.baku, createdAt: 300 });
  });

  it('backfills the same order onto events written without a key', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const baku = await insertRace(ctx, 15, 'azerbaijan-2026');
      const sepang = await insertRace(ctx, 16, 'bahrain-2026');
      await ctx.db.insert('feedEvents', news(baku, 'baku-qualifying', 100));
      await ctx.db.insert('feedEvents', news(sepang, 'sepang-penalty', 200));
      await ctx.db.insert('feedEvents', news(baku, 'baku-grand-slam', 300));
      await ctx.db.insert('feedEvents', news(undefined, 'global', 400));
    });

    const first = await t.mutation(internal.feed.backfillFeedSort, {});
    expect(first).toEqual({ scanned: 4, patched: 4 });
    expect(await t.mutation(internal.feed.backfillFeedSort, {})).toEqual({
      scanned: 4,
      patched: 0,
    });

    const { page } = await t.run((ctx) =>
      buildFilteredFeedPage(ctx, new Set(), null),
    );
    expect(page.map((event) => event.newsKey)).toEqual([
      'global',
      'sepang-penalty',
      'baku-grand-slam',
      'baku-qualifying',
    ]);
  });
});
