/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 4, 10);
type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

async function race(
  ctx: Ctx,
  round: number,
  fields: Partial<Doc<'races'>> = {},
) {
  return ctx.db.insert('races', {
    season: 2026,
    round,
    name: `Round ${round}`,
    slug: `round-${round}`,
    raceStartAt: NOW + 24 * HOUR,
    predictionLockAt: NOW + 24 * HOUR,
    status: 'upcoming',
    createdAt: 0,
    updatedAt: 0,
    ...fields,
  });
}

describe('practice polling windows', () => {
  it('keeps historical gaps in the backfill and polls recent sessions promptly', async () => {
    const t = convexTest(schema, modules);
    const { old, recent } = await t.run(async (ctx) => ({
      old: await race(ctx, 1, { fp1StartAt: NOW - 30 * 24 * HOUR }),
      recent: await race(ctx, 2, { fp1StartAt: NOW - 2 * HOUR }),
    }));
    const fast = await t.query(
      internal.practiceResults.getDuePracticeSessions,
      { now: NOW },
    );
    expect(fast.map((task) => task.raceId)).toEqual([recent]);
    const backfill = await t.query(
      internal.practiceResults.getDuePracticeSessions,
      { now: NOW, includeHistorical: true },
    );
    expect(backfill.map((task) => task.raceId)).toEqual([old, recent]);
  });

  it('finds due rechecks outside the recent window and never repeats finished rechecks', async () => {
    const t = convexTest(schema, modules);
    const old = await t.run(async (ctx) => {
      const raceId = await race(ctx, 1, {
        fp1StartAt: NOW - 30 * 24 * HOUR,
        fp2StartAt: NOW - 30 * 24 * HOUR,
      });
      for (const sessionType of ['fp1', 'fp2'] as const) {
        await ctx.db.insert('practiceResults', {
          raceId,
          sessionType,
          openF1SessionKey: 1,
          entries: [],
          publishedAt: 0,
          updatedAt: 0,
          recheckStage: sessionType === 'fp1' ? 0 : 2,
          ...(sessionType === 'fp1' ? { nextRecheckAt: NOW - 1 } : {}),
        });
      }
      return raceId;
    });
    expect(
      await t.query(internal.practiceResults.getDuePracticeSessions, {
        now: NOW,
      }),
    ).toMatchObject([{ raceId: old, sessionType: 'fp1', mode: 'reconcile' }]);
  });

  it('retains legacy reconciliation, skips cancelled and unfinished sessions, and deduplicates due tasks', async () => {
    const t = convexTest(schema, modules);
    const recent = await t.run(async (ctx) => {
      await race(ctx, 1, { fp1StartAt: NOW - HOUR }); // First attempt is after 62 minutes.
      await race(ctx, 2, { fp1StartAt: NOW - 2 * HOUR, status: 'cancelled' });
      const raceId = await race(ctx, 3, {
        fp1StartAt: NOW - 2 * HOUR,
        fp2StartAt: NOW - 2 * HOUR,
      });
      for (const sessionType of ['fp1', 'fp2'] as const) {
        await ctx.db.insert('practiceResults', {
          raceId,
          sessionType,
          openF1SessionKey: 1,
          entries: [],
          publishedAt: 0,
          updatedAt: 0,
          ...(sessionType === 'fp1'
            ? { recheckStage: 0, nextRecheckAt: NOW }
            : {}),
        });
      }
      return raceId;
    });
    const tasks = await t.query(
      internal.practiceResults.getDuePracticeSessions,
      { now: NOW },
    );
    expect(tasks).toHaveLength(2);
    expect(
      tasks.map((task) => [task.raceId, task.sessionType, task.mode]),
    ).toEqual([
      [recent, 'fp1', 'reconcile'],
      [recent, 'fp2', 'reconcile'],
    ]);
  });

  it('keeps the bounded batch fair when a provider repeatedly fails', async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const ids = [];
      for (let round = 1; round <= 4; round++) {
        const raceId = await race(ctx, round, {
          fp1StartAt: NOW - (6 - round) * HOUR,
        });
        ids.push(raceId);
        if (round === 1) {
          await ctx.db.insert('practiceResultPolls', {
            raceId,
            sessionType: 'fp1',
            status: 'retrying',
            attemptCount: 10,
            firstAttemptAt: 0,
            lastAttemptAt: NOW - 1,
            updatedAt: NOW - 1,
          });
        }
      }
      return ids;
    });
    const tasks = await t.query(
      internal.practiceResults.getDuePracticeSessions,
      { now: NOW },
    );
    expect(tasks.map((task) => task.raceId)).toEqual(ids.slice(1));
  });
});
