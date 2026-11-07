/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { SEASON_RECAP_GRACE_MS } from './seasonWrapUp';

const modules = import.meta.glob('./**/*.{ts,tsx}');

const SEASON = 2026;
const DAY = 86_400_000;

/**
 * A two-round season. Round 2 is the final; its race result was published
 * `finalPublishedAgo` ms ago. Three players: one who scored, one with email
 * opted out of results, one who never scored.
 */
async function seedSeason(options: {
  finalPublishedAgo: number;
  finalStatus?: 'finished' | 'locked';
}) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const start = now - 30 * DAY;
    await ctx.db.insert('races', {
      season: SEASON,
      round: 1,
      name: 'Opening Grand Prix',
      slug: 'opening-2026',
      status: 'finished',
      raceStartAt: start,
      predictionLockAt: start,
      createdAt: start,
      updatedAt: start,
    });
    const finalStart = now - options.finalPublishedAgo - 2 * 3_600_000;
    const round2 = await ctx.db.insert('races', {
      season: SEASON,
      round: 2,
      name: 'Final Grand Prix',
      slug: 'final-2026',
      status: options.finalStatus ?? 'finished',
      raceStartAt: finalStart,
      predictionLockAt: finalStart,
      createdAt: start,
      updatedAt: now,
    });
    const driver = await ctx.db.insert('drivers', {
      code: 'VER',
      displayName: 'Max Verstappen',
      createdAt: start,
      updatedAt: start,
    });
    await ctx.db.insert('results', {
      raceId: round2,
      sessionType: 'race',
      classification: [driver],
      publishedAt: now - options.finalPublishedAgo,
      updatedAt: now - options.finalPublishedAgo,
    });

    const users: Record<string, Id<'users'>> = {};
    for (const [name, extra] of [
      ['scorer', { email: 'scorer@example.com' }],
      ['noemail', { email: 'quiet@example.com', emailResults: false }],
      ['newbie', { email: 'newbie@example.com' }],
    ] as const) {
      users[name] = await ctx.db.insert('users', {
        clerkUserId: `clerk_${name}`,
        username: name,
        ...extra,
        createdAt: start,
        updatedAt: start,
      });
    }
    for (const name of ['scorer', 'noemail']) {
      await ctx.db.insert('seasonStandings', {
        userId: users[name]!,
        season: SEASON,
        totalPoints: name === 'scorer' ? 40 : 25,
        raceCount: 2,
        username: name,
        updatedAt: now,
      });
    }
    return { round2, users };
  });
  return { t, ...ids };
}

describe('seasonWrapUp.announceIfDue', () => {
  it('waits while the final race is not finished', async () => {
    const { t } = await seedSeason({
      finalPublishedAgo: 2 * DAY,
      finalStatus: 'locked',
    });
    expect(await t.mutation(internal.seasonWrapUp.announceIfDue, {})).toBe(
      null,
    );
    expect(
      await t.run((ctx) => ctx.db.query('inAppNotifications').collect()),
    ).toHaveLength(0);
  });

  it('waits out the grace period after the final result', async () => {
    const { t } = await seedSeason({
      finalPublishedAgo: SEASON_RECAP_GRACE_MS - 60_000,
    });
    expect(await t.mutation(internal.seasonWrapUp.announceIfDue, {})).toBe(
      null,
    );
  });

  it('tells every scored player once, by bell and email', async () => {
    const { t, users, round2 } = await seedSeason({
      finalPublishedAgo: SEASON_RECAP_GRACE_MS + 60_000,
    });
    expect(await t.mutation(internal.seasonWrapUp.announceIfDue, {})).toBe(
      SEASON,
    );
    await t.finishAllScheduledFunctions(() => {});

    const bells = await t.run((ctx) =>
      ctx.db.query('inAppNotifications').collect(),
    );
    expect(bells.map((n) => n.userId).sort()).toEqual(
      [users.scorer, users.noemail].sort(),
    );
    expect(bells[0]).toMatchObject({
      type: 'season_recap',
      title: 'Your 2026 season recap is ready',
    });
    expect(bells.map((n) => n.linkPath).sort()).toEqual([
      '/p/noemail/season',
      '/p/scorer/season',
    ]);

    // Queued for both; the opt-out is applied at send time, as for every
    // other results mail, and the key dedupes a second fan-out.
    const emails = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    expect(emails.map((e) => e.kind)).toEqual(['season_recap', 'season_recap']);
    expect(emails.every((e) => e.raceId === round2)).toBe(true);

    // A second tick, or a rescore of the final race, changes nothing.
    expect(await t.mutation(internal.seasonWrapUp.announceIfDue, {})).toBe(
      null,
    );
    await t.finishAllScheduledFunctions(() => {});
    expect(
      await t.run((ctx) => ctx.db.query('inAppNotifications').collect()),
    ).toHaveLength(2);
    expect(await t.query(internal.seasonWrapUp.inspect, {})).toMatchObject({
      season: SEASON,
      due: false,
      alreadySent: true,
      recipients: 2,
    });
  });

  it('cancels the email for a player who opted out of results mail', async () => {
    vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
    vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
    const { t, users } = await seedSeason({
      finalPublishedAgo: SEASON_RECAP_GRACE_MS + 60_000,
    });
    await t.mutation(internal.seasonWrapUp.announceIfDue, {});
    await t.finishAllScheduledFunctions(() => {});
    const emails = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    const quiet = emails.find((e) => e.userId === users.noemail)!;
    const loud = emails.find((e) => e.userId === users.scorer)!;
    await t.mutation(internal.notificationEmails.send, { id: quiet._id });
    await t.mutation(internal.notificationEmails.send, { id: loud._id });
    expect((await t.run((ctx) => ctx.db.get(quiet._id)))?.status).toBe(
      'cancelled',
    );
    // Handed to the render action in the same commit, as every other kind.
    expect((await t.run((ctx) => ctx.db.get(loud._id)))?.status).toBe(
      'accepted',
    );
    vi.unstubAllEnvs();
  });
});
