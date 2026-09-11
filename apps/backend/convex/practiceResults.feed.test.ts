/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import { buildFilteredFeedPage } from './feed';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('practice feed announcements', () => {
  it('publishes to every feed, reconciles without duplicates, and backfills with the original time', async () => {
    const t = convexTest(schema, modules);
    const raceId = await t.run((ctx) =>
      ctx.db.insert('races', {
        season: 2026,
        round: 14,
        name: 'Spanish Grand Prix',
        slug: 'madrid-2026',
        raceStartAt: 2000,
        predictionLockAt: 1000,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      }),
    );
    const entries = Array.from({ length: 22 }, (_, index) => ({
      driverNumber: index + 1,
      position: index + 1,
      code: `D${index}`,
      displayName: `Driver ${index}`,
      bestLapSeconds: 94 + index,
      gapToLeaderSeconds: index,
      lapCount: 25,
    }));
    const args = {
      raceId,
      sessionType: 'fp1' as const,
      openF1SessionKey: 11362,
      entries,
      mode: 'populate' as const,
    };
    await t.mutation(internal.practiceResults.upsertPracticeResult, args);
    const first = await t.run((ctx) =>
      buildFilteredFeedPage(ctx, new Set(), null),
    );
    expect(first.page).toHaveLength(1);
    expect(first.page[0]).toMatchObject({
      type: 'practice_published',
      practiceSessionType: 'fp1',
      raceId,
    });
    expect(first.page[0]?.userId).toBeUndefined();
    expect(first.page[0]?.sessionType).toBeUndefined();

    await t.mutation(internal.practiceResults.upsertPracticeResult, {
      ...args,
      mode: 'reconcile',
      entries: entries.map((entry) => ({ ...entry, lapCount: 26 })),
    });
    const reconciled = await t.run((ctx) =>
      buildFilteredFeedPage(ctx, new Set(), null),
    );
    expect(reconciled.page).toEqual(first.page);
    expect(
      (
        await t.query(api.practiceResults.getPracticeResultsForRace, { raceId })
      )[0]?.entries[0]?.lapCount,
    ).toBe(26);

    await t.run((ctx) => ctx.db.delete('feedEvents', first.page[0]!._id));
    await t.mutation(internal.practiceResults.backfillPracticeFeedForRace, {
      raceId,
    });
    await t.mutation(internal.practiceResults.backfillPracticeFeedForRace, {
      raceId,
    });
    const restored = await t.run((ctx) =>
      buildFilteredFeedPage(ctx, new Set(), null),
    );
    expect(restored.page).toHaveLength(1);
    expect(restored.page[0]?.createdAt).toBe(first.page[0]?.createdAt);

    await t.mutation(internal.practiceResults.upsertPracticeResult, {
      ...args,
      sessionType: 'fp2',
    });
    expect(
      (await t.run((ctx) => buildFilteredFeedPage(ctx, new Set(), null))).page,
    ).toHaveLength(2);
    const scores = await t.run((ctx) => ctx.db.query('scores').take(1));
    expect(scores).toEqual([]);
  });
});
