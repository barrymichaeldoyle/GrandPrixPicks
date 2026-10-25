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
const DECISION_URL =
  'https://www.fia.com/system/files/decision-document/2026_monaco_grand_prix_-_icoa_decision.pdf';

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
            amendmentSourceUrl: DECISION_URL,
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

  it('keeps the FIA decision link unless one is passed', async () => {
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

    expect(outcome.amendmentSourceUrl).toBe(DECISION_URL);
    await t.run(async (ctx) => {
      expect((await ctx.db.get(seeded.resultId))?.amendmentSourceUrl).toBe(
        DECISION_URL,
      );
    });
  });

  it('replaces or removes the FIA decision link', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);
    const correctedUrl = `${DECISION_URL}?v=2`;

    await t.mutation(internal.results.emergencyReviseAmendmentNote, {
      raceId: seeded.raceId,
      sessionType: 'race',
      amendmentNote: ORIGINAL_NOTE,
      amendmentSourceUrl: ` ${correctedUrl} `,
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(seeded.resultId))?.amendmentSourceUrl).toBe(
        correctedUrl,
      );
    });

    await t.mutation(internal.results.emergencyReviseAmendmentNote, {
      raceId: seeded.raceId,
      sessionType: 'race',
      amendmentNote: ORIGINAL_NOTE,
      amendmentSourceUrl: '',
    });
    await t.run(async (ctx) => {
      const result = await ctx.db.get(seeded.resultId);
      expect(result?.amendmentSourceUrl).toBeUndefined();
      expect(result?.amendmentNotificationPending).toBe(false);
    });
  });

  it('refuses a link that is not on fia.com', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    await expect(
      t.mutation(internal.results.emergencyReviseAmendmentNote, {
        raceId: seeded.raceId,
        sessionType: 'race',
        amendmentNote: REVISED_NOTE,
        amendmentSourceUrl: 'https://fia.com.example.net/decision.pdf',
      }),
    ).rejects.toThrow('https fia.com URL');
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

describe('publishing an amendment with an FIA decision link', () => {
  async function seedPublishedRace(t: ReturnType<typeof convexTest>) {
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
      const driverIds = [];
      for (const code of ['VER', 'NOR', 'LEC', 'HAM', 'PIA']) {
        driverIds.push(
          await ctx.db.insert('drivers', {
            code,
            displayName: code,
            team: 'Test',
            createdAt: 100,
            updatedAt: 100,
          }),
        );
      }
      const resultId = await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: driverIds,
        scoringStatus: 'complete',
        notificationsSent: true,
        publishedAt: PUBLISHED_AT,
        updatedAt: PUBLISHED_AT,
        amendedAt: PUBLISHED_AT,
        amendmentNote: 'An earlier ruling.',
        amendmentSourceUrl: `${DECISION_URL}?earlier`,
      });
      return { raceId, resultId, driverIds };
    });
  }

  it('stores the link with the note', async () => {
    const t = convexTest(schema, modules);
    const { raceId, resultId, driverIds } = await seedPublishedRace(t);

    await t.mutation(internal.results.emergencyPublishResults, {
      raceId,
      sessionType: 'race',
      classification: [...driverIds].reverse(),
      amendmentNote: ORIGINAL_NOTE,
      amendmentSourceUrl: DECISION_URL,
    });

    await t.run(async (ctx) => {
      const result = await ctx.db.get(resultId);
      expect(result?.amendmentNote).toBe(ORIGINAL_NOTE);
      expect(result?.amendmentSourceUrl).toBe(DECISION_URL);
    });
  });

  it("drops the previous ruling's link when a new amendment has none", async () => {
    const t = convexTest(schema, modules);
    const { raceId, resultId, driverIds } = await seedPublishedRace(t);

    await t.mutation(internal.results.emergencyPublishResults, {
      raceId,
      sessionType: 'race',
      classification: [...driverIds].reverse(),
      amendmentNote: ORIGINAL_NOTE,
    });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(resultId))?.amendmentSourceUrl).toBeUndefined();
    });
  });

  it('refuses a classification that lists a driver twice', async () => {
    const t = convexTest(schema, modules);
    const { raceId, resultId, driverIds } = await seedPublishedRace(t);
    // The admin form's live-timing preview could leave a hand-entered driver
    // in a lower lane as well as at the top. Scored, they collect points for
    // both positions.
    const duplicated = [...driverIds];
    duplicated[duplicated.length - 1] = duplicated[0];

    await expect(
      t.mutation(internal.results.emergencyPublishResults, {
        raceId,
        sessionType: 'race',
        classification: duplicated,
      }),
    ).rejects.toThrow('same driver more than once');

    await t.run(async (ctx) => {
      expect((await ctx.db.get(resultId))?.classification).toEqual(driverIds);
    });
  });

  it('refuses a link that is not on fia.com before changing anything', async () => {
    const t = convexTest(schema, modules);
    const { raceId, resultId, driverIds } = await seedPublishedRace(t);

    await expect(
      t.mutation(internal.results.emergencyPublishResults, {
        raceId,
        sessionType: 'race',
        classification: [...driverIds].reverse(),
        amendmentNote: ORIGINAL_NOTE,
        amendmentSourceUrl: 'http://www.fia.com/decision.pdf',
      }),
    ).rejects.toThrow('https fia.com URL');

    await t.run(async (ctx) => {
      const result = await ctx.db.get(resultId);
      expect(result?.classification).toEqual(driverIds);
      expect(result?.amendmentNote).toBe('An earlier ruling.');
    });
  });
});

describe('restoreScoreFeedEventsForSession', () => {
  it('removes amendment cards without changing the result or in-app notice', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    expect(
      await t.mutation(internal.feed.restoreScoreFeedEventsForSession, {
        raceId: seeded.raceId,
        sessionType: 'race',
      }),
    ).toEqual({ restored: 1 });

    const state = await t.run(async (ctx) => ({
      amendedEvent: await ctx.db.get(seeded.amendedEventId),
      publishedEvent: await ctx.db.get(seeded.publishedEventId),
      result: await ctx.db.get(seeded.resultId),
      notification: await ctx.db.get(seeded.notificationId),
    }));
    expect(state.amendedEvent).toMatchObject({
      type: 'score_published',
      points: 12,
      createdAt: PUBLISHED_AT,
    });
    expect(state.amendedEvent?.previousPoints).toBeUndefined();
    expect(state.amendedEvent?.amendmentNote).toBeUndefined();
    expect(state.publishedEvent?.createdAt).toBe(PUBLISHED_AT);
    expect(state.result?.amendmentNote).toBe(ORIGINAL_NOTE);
    expect(state.notification?.amendmentNote).toBe(ORIGINAL_NOTE);
    expect(
      await t.mutation(internal.feed.restoreScoreFeedEventsForSession, {
        raceId: seeded.raceId,
        sessionType: 'race',
      }),
    ).toEqual({ restored: 0 });
  });
});

describe('emergencyClearOperationalAmendment', () => {
  it('removes the public result marker and keeps the correction notice', async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAmendedRace(t);

    expect(
      await t.mutation(internal.results.emergencyClearOperationalAmendment, {
        raceId: seeded.raceId,
        sessionType: 'race',
        expectedAmendmentNote: ORIGINAL_NOTE,
      }),
    ).toEqual({ cleared: true });

    const state = await t.run(async (ctx) => ({
      result: await ctx.db.get(seeded.resultId),
      notification: await ctx.db.get(seeded.notificationId),
    }));
    expect(state.result?.amendedAt).toBeUndefined();
    expect(state.result?.amendmentNote).toBeUndefined();
    expect(state.result?.amendmentSourceUrl).toBeUndefined();
    expect(state.result?.scoringStatus).toBe('complete');
    expect(state.notification?.amendmentNote).toBe(ORIGINAL_NOTE);
  });
});

describe('notifyResultsAmended recipients', () => {
  it('only notifies players with an original result notice', async () => {
    const t = convexTest(schema, modules);
    const { raceId, originalUserId, lateUserId } = await t.run(async (ctx) => {
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test Grand Prix',
        slug: 'test-2026',
        status: 'locked',
        qualiLockAt: 100,
        predictionLockAt: 200,
        raceStartAt: 200,
        createdAt: 100,
        updatedAt: 100,
      });
      const originalUserId = await ctx.db.insert('users', {
        clerkUserId: 'original',
        createdAt: 100,
        updatedAt: 100,
      });
      const lateUserId = await ctx.db.insert('users', {
        clerkUserId: 'late',
        createdAt: 100,
        updatedAt: 100,
      });
      for (const userId of [originalUserId, lateUserId]) {
        await ctx.db.insert('predictions', {
          raceId,
          userId,
          sessionType: 'quali',
          picks: [],
          submittedAt: 100,
          updatedAt: 100,
        });
      }
      await ctx.db.insert('inAppNotifications', {
        userId: originalUserId,
        type: 'results_published',
        raceId,
        sessionType: 'quali',
        raceName: 'Test Grand Prix',
        raceSlug: 'test-2026',
        createdAt: 100,
      });
      return { raceId, originalUserId, lateUserId };
    });

    await t.mutation(internal.inAppNotifications.notifyResultsAmended, {
      raceId,
      sessionType: 'quali',
      amendmentNote: 'Scores now use the completed session order.',
    });
    const notices = await t.run((ctx) =>
      ctx.db.query('inAppNotifications').collect(),
    );
    expect(
      notices
        .filter((notice) => notice.type === 'results_amended')
        .map((notice) => notice.userId),
    ).toEqual([originalUserId]);
    expect(lateUserId).not.toBe(originalUserId);
  });
});
