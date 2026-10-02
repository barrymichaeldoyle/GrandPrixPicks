/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

describe('feed detail URL references', () => {
  it.each(['', 'not-an-id', 'j970sgdd1kgk2c0134x5tmsk3h8fggr6'])(
    'returns not found for an invalid reference: %s',
    async (ref) => {
      const t = convexTest(schema, modules);
      expect(await t.query(api.feed.getFeedEventByRef, { ref })).toBeNull();
    },
  );

  it('handles a prediction ID without treating its picks as a feed event', async () => {
    const t = convexTest(schema, modules);
    const predictionId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'viewer',
        createdAt: 0,
        updatedAt: 0,
      });
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Australian Grand Prix',
        slug: 'australia-2026',
        raceStartAt: 0,
        predictionLockAt: 0,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      return ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: 'race',
        picks: [],
        submittedAt: 0,
        updatedAt: 0,
      });
    });

    // Reproduces the argument validation failure behind Sentry 2W and 2X.
    await expect(
      t.query(api.feed.getFeedEvent, {
        feedEventId: predictionId as unknown as Id<'feedEvents'>,
      }),
    ).rejects.toThrow();

    for (const client of [t, t.withIdentity({ subject: 'viewer' })]) {
      expect(
        await client.query(api.feed.getFeedEventByRef, { ref: predictionId }),
      ).toBeNull();
    }
  });

  it('returns not found for a deleted event', async () => {
    const t = convexTest(schema, modules);
    const ref = await t.run(async (ctx) => {
      const id = await ctx.db.insert('feedEvents', {
        type: 'race_news',
        newsHeadline: 'Grid penalty',
        createdAt: 0,
      });
      await ctx.db.delete(id);
      return id;
    });
    expect(await t.query(api.feed.getFeedEventByRef, { ref })).toBeNull();
  });

  it('keeps news public and player activity restricted to registered viewers', async () => {
    const t = convexTest(schema, modules);
    const { newsId, scoreId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'viewer',
        createdAt: 0,
        updatedAt: 0,
      });
      const newsId = await ctx.db.insert('feedEvents', {
        type: 'race_news',
        newsHeadline: 'Grid penalty',
        createdAt: 0,
      });
      const scoreId = await ctx.db.insert('feedEvents', {
        type: 'score_published',
        userId,
        points: 12,
        createdAt: 0,
      });
      return { newsId, scoreId };
    });

    expect(await t.query(api.feed.getFeedEventByRef, { ref: newsId })).toEqual(
      await t.query(api.feed.getFeedEvent, { feedEventId: newsId }),
    );
    expect(
      (await t.query(api.feed.getFeedEventByRef, { ref: newsId }))?.event
        .newsHeadline,
    ).toBe('Grid penalty');

    for (const client of [t, t.withIdentity({ subject: 'unregistered' })]) {
      expect(
        await client.query(api.feed.getFeedEventByRef, { ref: scoreId }),
      ).toBeNull();
    }

    const viewer = t.withIdentity({ subject: 'viewer' });
    expect(
      (await viewer.query(api.feed.getFeedEventByRef, { ref: scoreId }))?.event
        .points,
    ).toBe(12);
  });
});
