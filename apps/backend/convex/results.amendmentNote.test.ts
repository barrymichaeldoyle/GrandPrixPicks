/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const PUBLISHED_AT = 1_780_857_459_945;
const AMENDED_AT = 1_788_525_329_417;
const ORIGINAL_NOTE =
  "The FIA International Court of Appeal reinstated Gasly's two five-second penalties. Hadjar takes third.";
const REVISED_NOTE =
  "Gasly drops to seventh and Hadjar takes third. The FIA International Court of Appeal reinstated Gasly's two five-second penalties.";

async function seedAmendedRace(
  t: ReturnType<typeof convexTest>,
  { amended = true }: { amended?: boolean } = {},
) {
  return await t.run(async (ctx) => {
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 6,
      name: 'Monaco Grand Prix',
      slug: 'monaco-2026',
      raceStartAt: PUBLISHED_AT,
      predictionLockAt: PUBLISHED_AT - 1_000,
      status: 'finished',
      createdAt: 100,
      updatedAt: 100,
    });

    const resultId = await ctx.db.insert('results', {
      raceId,
      sessionType: 'race',
      classification: [],
      scoringStatus: 'complete',
      notificationsSent: true,
      publishedAt: PUBLISHED_AT,
      updatedAt: AMENDED_AT,
      ...(amended
        ? {
            amendedAt: AMENDED_AT,
            amendmentNote: ORIGINAL_NOTE,
            amendmentNotificationPending: false,
          }
        : {}),
    });

    const userId = await ctx.db.insert('users', {
      clerkUserId: 'user_1',
      username: 'player',
      displayName: 'Player',
      createdAt: 100,
      updatedAt: 100,
    });

    // The event a player whose points moved sees, carrying the denormalised
    // sentence.
    const amendedEventId = await ctx.db.insert('feedEvents', {
      type: 'results_amended',
      userId,
      raceId,
      sessionType: 'race',
      points: 12,
      previousPoints: 18,
      amendmentNote: ORIGINAL_NOTE,
      raceName: 'Monaco Grand Prix',
      raceSlug: 'monaco-2026',
      revCount: 0,
      createdAt: AMENDED_AT,
    });

    // Same session, but this player's points did not move, so this row never
    // carried the note and must not gain one.
    const publishedEventId = await ctx.db.insert('feedEvents', {
      type: 'score_published',
      userId,
      raceId,
      sessionType: 'race',
      points: 9,
      raceName: 'Monaco Grand Prix',
      raceSlug: 'monaco-2026',
      revCount: 0,
      createdAt: PUBLISHED_AT,
    });

    const notificationId = await ctx.db.insert('inAppNotifications', {
      userId,
      type: 'results_amended',
      raceId,
      sessionType: 'race',
      raceName: 'Monaco Grand Prix',
      raceSlug: 'monaco-2026',
      points: 12,
      amendmentNote: ORIGINAL_NOTE,
      createdAt: AMENDED_AT,
    });

    return {
      raceId,
      resultId,
      amendedEventId,
      publishedEventId,
      notificationId,
    };
  });
}

describe('emergencyReviseAmendmentNote', () => {
  it('rewords the note everywhere it was denormalised', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    const outcome = await t.mutation(
      internal.results.emergencyReviseAmendmentNote,
      {
        raceId: seeded.raceId,
        sessionType: 'race',
        amendmentNote: REVISED_NOTE,
      },
    );

    expect(outcome).toMatchObject({
      ok: true,
      previousNote: ORIGINAL_NOTE,
      amendmentNote: REVISED_NOTE,
      feedEventsUpdated: 1,
      notificationsUpdated: 1,
    });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(seeded.resultId))?.amendmentNote).toBe(
        REVISED_NOTE,
      );
      expect((await ctx.db.get(seeded.amendedEventId))?.amendmentNote).toBe(
        REVISED_NOTE,
      );
      expect((await ctx.db.get(seeded.notificationId))?.amendmentNote).toBe(
        REVISED_NOTE,
      );
    });
  });

  /**
   * The whole reason this exists rather than a republish: everyone was already
   * told about this ruling, and re-arming the pending flag sends a second push
   * and a second bell for it.
   */
  it('notifies nobody a second time', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await t.mutation(internal.results.emergencyReviseAmendmentNote, {
      raceId: seeded.raceId,
      sessionType: 'race',
      amendmentNote: REVISED_NOTE,
    });

    await t.run(async (ctx) => {
      const result = await ctx.db.get(seeded.resultId);
      expect(result?.amendmentNotificationPending).toBe(false);
      expect(result?.notificationsSent).toBe(true);
    });
  });

  /**
   * `updatedAt` dates the championship table (see `resultChangedAt`). No points
   * moved, so the standings must not claim to have changed; `amendedAt` is when
   * the decision landed, which rewording does not alter.
   */
  it('leaves the amendment and the standings date where they were', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await t.mutation(internal.results.emergencyReviseAmendmentNote, {
      raceId: seeded.raceId,
      sessionType: 'race',
      amendmentNote: REVISED_NOTE,
    });

    await t.run(async (ctx) => {
      const result = await ctx.db.get(seeded.resultId);
      expect(result?.updatedAt).toBe(AMENDED_AT);
      expect(result?.amendedAt).toBe(AMENDED_AT);
    });
  });

  it('leaves a score_published row in the same session alone', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await t.mutation(internal.results.emergencyReviseAmendmentNote, {
      raceId: seeded.raceId,
      sessionType: 'race',
      amendmentNote: REVISED_NOTE,
    });

    await t.run(async (ctx) => {
      const event = await ctx.db.get(seeded.publishedEventId);
      expect(event?.amendmentNote).toBeUndefined();
      expect(event?.type).toBe('score_published');
    });
  });

  it('refuses a session that has no amendment to reword', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t, { amended: false });

    await expect(
      t.mutation(internal.results.emergencyReviseAmendmentNote, {
        raceId: seeded.raceId,
        sessionType: 'race',
        amendmentNote: REVISED_NOTE,
      }),
    ).rejects.toThrow('no published amendment');
  });

  it('refuses an empty note', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await expect(
      t.mutation(internal.results.emergencyReviseAmendmentNote, {
        raceId: seeded.raceId,
        sessionType: 'race',
        amendmentNote: '   ',
      }),
    ).rejects.toThrow('must not be empty');
  });

  it('refuses a session with no result at all', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await expect(
      t.mutation(internal.results.emergencyReviseAmendmentNote, {
        raceId: seeded.raceId,
        sessionType: 'quali',
        amendmentNote: REVISED_NOTE,
      }),
    ).rejects.toThrow('No result found');
  });
});
