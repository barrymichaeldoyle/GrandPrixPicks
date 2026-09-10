/// <reference types="vite/client" />
import { beforeEach } from 'vitest';
import { convexTest } from 'convex-test';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import { scheduleReminder } from './notifications';
import { quietUntil } from './notificationDelivery';
import {
  resolvedNotificationSettings,
  shouldEmailReminder,
} from './lib/notificationChannels';
const modules = import.meta.glob('./**/*.ts');
function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}
async function seed(t: ReturnType<typeof setup>, count = 1) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      status: 'upcoming',
      qualiLockAt: now + 86400000,
      predictionLockAt: now + 172800000,
      raceStartAt: now + 172800000,
      createdAt: now,
      updatedAt: now,
    });
    const userIds = [];
    for (let i = 0; i < count; i++) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `user_${i}`,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('expoPushTokens', {
        userId,
        token: `ExponentPushToken[test${i}]`,
        refreshedAt: now,
        createdAt: now,
      });
      userIds.push(userId);
    }
    return { raceId, userIds };
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('notification delivery', () => {
  it('pages 201 users and creates at most one delivery per event and device', async () => {
    const t = setup();
    const { raceId } = await seed(t, 201);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationDeliveries').collect()),
    ).toHaveLength(100);
    const jobs = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    const continuation = jobs.find((j) =>
      j.name.includes('sendPushRemindersForRace'),
    )!;
    await t.mutation(
      internal.push.sendPushRemindersForRace,
      continuation.args[0] as never,
    );
    expect(
      await t.run((ctx) => ctx.db.query('notificationDeliveries').collect()),
    ).toHaveLength(200);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationDeliveries').collect()),
    ).toHaveLength(200);
  });
  it('reminds partial Top 5 users, and suppresses reminders once all open picks are complete', async () => {
    const t = setup();
    const {
      raceId,
      userIds: [userId],
    } = await seed(t);
    await t.run((ctx) =>
      ctx.db.insert('predictions', {
        raceId,
        userId,
        sessionType: 'quali',
        picks: [],
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      sessionType: 'race',
      filterUnpredicted: true,
    });
    const [row] = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    expect(row.category).toBe('lock_reminder');
    await t.run(async (ctx) => {
      await ctx.db.insert('predictions', {
        raceId,
        userId,
        sessionType: 'race',
        picks: [],
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(row._id, { status: 'sending' });
    });
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: row._id,
      }),
    ).toBeNull();
  });
  it('only sends result pushes to participants', async () => {
    const t = setup();
    const {
      raceId,
      userIds: [userId],
    } = await seed(t, 2);
    await t.run((ctx) =>
      ctx.db.insert('predictions', {
        raceId,
        userId,
        sessionType: 'race',
        picks: [],
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(internal.push.sendPushResultsForSession, {
      raceId,
      sessionType: 'race',
    });
    const rows = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });
  it('transfers a token to the authenticated account and cancels queued work for its previous owner', async () => {
    const t = setup();
    const { raceId, userIds } = await seed(t, 2);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    const rows = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    const row = rows.find((r) => r.userId === userIds[0])!;
    await t
      .withIdentity({ subject: 'user_1' })
      .mutation(api.push.saveExpoPushToken, { token: row.target });
    await t.run((ctx) => ctx.db.patch(row._id, { status: 'sending' }));
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: row._id,
      }),
    ).toBeNull();
    const token = await t.run((ctx) =>
      ctx.db
        .query('expoPushTokens')
        .withIndex('by_token', (q) => q.eq('token', row.target))
        .unique(),
    );
    expect(token?.userId).toBe(userIds[1]);
  });
  it('honors an opt-out after enqueue', async () => {
    const t = setup();
    const {
      raceId,
      userIds: [userId],
    } = await seed(t);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    const [row] = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { pushPredictionReminders: false });
      await ctx.db.patch(row._id, { status: 'sending' });
    });
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: row._id,
      }),
    ).toBeNull();
  });
  it('records Expo acceptance and later provider receipt, rather than claiming delivery immediately', async () => {
    const t = setup();
    const { raceId } = await seed(t);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    const [row] = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    await t.run((ctx) =>
      ctx.db.patch(row._id, { status: 'sending', attempts: 1 }),
    );
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: 'ok', id: 'ticket1' } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ticket1: { status: 'ok' } } })),
      );
    vi.stubGlobal('fetch', fetch);
    await t.action(internal.pushNotifications.deliver, { deliveryId: row._id });
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.status).toBe(
      'accepted',
    );
    await t.action(internal.pushNotifications.checkReceipts, {
      deliveryIds: [row._id],
    });
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.status).toBe(
      'handed_off',
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body).ttl).toBeLessThanOrEqual(
      86400,
    );
  });
  it('rejects malformed tickets, retries transient failures and prunes unregistered tokens', async () => {
    const t = setup();
    const { raceId } = await seed(t);
    await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    const [row] = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    await t.run((ctx) =>
      ctx.db.patch(row._id, { status: 'sending', attempts: 1 }),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await t.action(internal.pushNotifications.deliver, { deliveryId: row._id });
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.status).toBe('failed');
    await t.mutation(internal.notificationDelivery.record, {
      deliveryId: row._id,
      status: 'failed',
      retryable: true,
      error: 'HTTP 503',
    });
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.status).toBe('queued');
    await t.mutation(internal.notificationDelivery.record, {
      deliveryId: row._id,
      status: 'failed',
      error: 'DeviceNotRegistered',
    });
    expect(
      await t.run((ctx) => ctx.db.query('expoPushTokens').collect()),
    ).toHaveLength(0);
  });
  it('can schedule 2h reminders inside the 24h window, and cancels old schedules', async () => {
    const t = setup();
    const { raceId } = await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(raceId, { qualiLockAt: Date.now() + 3 * 3600000 });
      await scheduleReminder(ctx, (await ctx.db.get(raceId))!);
    });
    const first = await t.run((ctx) => ctx.db.get(raceId));
    expect(first?.reminderJobIds).toHaveLength(2);
    await t.run(async (ctx) => {
      await scheduleReminder(ctx, (await ctx.db.get(raceId))!);
    });
    expect((await t.run((ctx) => ctx.db.get(raceId)))?.reminderVersion).toBe(2);
    for (const id of first!.reminderJobIds!) {
      expect((await t.run((ctx) => ctx.db.system.get(id)))?.state.kind).toBe(
        'canceled',
      );
    }
  });
  it('preserves legacy opt-outs and explicit both-channel choices', async () => {
    const t = setup();
    const {
      userIds: [id],
    } = await seed(t);
    await t.run((ctx) =>
      ctx.db.patch(id, {
        predictionReminderChannel: 'none',
        resultsNotificationChannel: 'none',
      }),
    );
    const user = (await t.run((ctx) => ctx.db.get(id)))!;
    expect(resolvedNotificationSettings(user)).toMatchObject({
      emailPredictionReminders: false,
      pushPredictionReminders: false,
      emailResults: false,
      pushResults: false,
      pushNews: false,
    });
    expect(
      shouldEmailReminder({ ...user, predictionReminderChannel: 'both' }, true),
    ).toBe(true);
    expect(
      shouldEmailReminder(
        { ...user, predictionReminderChannel: undefined },
        true,
      ),
    ).toBe(false);
  });
  it('calculates quiet hours in the recipient timezone', () => {
    const now = Date.parse('2026-09-10T21:00:00Z');
    expect(new Date(quietUntil(now, 'Africa/Johannesburg')).toISOString()).toBe(
      '2026-09-11T06:00:00.000Z',
    );
  });
});

beforeEach(() => {
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
});

it('does not contact a provider while delivery is paused', async () => {
  const t = setup();
  const { raceId } = await seed(t);
  await t.mutation(internal.push.sendPushRemindersForRace, {
    raceId,
    filterUnpredicted: false,
  });
  const [row] = await t.run((ctx) =>
    ctx.db.query('notificationDeliveries').collect(),
  );
  await t.run((ctx) => ctx.db.patch(row._id, { status: 'sending' }));
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'false');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await t.action(internal.pushNotifications.deliver, { deliveryId: row._id });
  expect(fetch).not.toHaveBeenCalled();
});

it('cancels expanded result deliveries when the emergency stop runs', async () => {
  const t = setup();
  const {
    raceId,
    userIds: [userId],
  } = await seed(t);
  await t.run((ctx) =>
    ctx.db.insert('predictions', {
      raceId,
      userId,
      sessionType: 'race',
      picks: [],
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  await t.mutation(internal.push.sendPushResultsForSession, {
    raceId,
    sessionType: 'race',
  });
  const [row] = await t.run((ctx) =>
    ctx.db.query('notificationDeliveries').collect(),
  );
  await t.mutation(internal.notifications.cancelQueuedResultNotifications, {});
  await t.run((ctx) => ctx.db.patch(row._id, { status: 'sending' }));
  expect(
    await t.mutation(internal.notificationDelivery.prepare, {
      deliveryId: row._id,
    }),
  ).toBeNull();
});
