/**
 * @vitest-environment node
 *
 * Resend stores bodies as Convex bytes; jsdom's ArrayBuffer is rejected.
 */
/// <reference types="vite/client" />
import { beforeEach } from 'vitest';
import { convexTest } from 'convex-test';
import { describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
const modules = import.meta.glob('./**/*.ts');
describe('email preference enforcement', () => {
  it('unsubscribes without login and only changes the requested category', async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'u',
        unsubscribeToken: 'unguessable-token',
        emailResults: true,
        emailPredictionReminders: true,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    expect(
      await t.mutation(internal.notificationEmails.unsubscribe, {
        token: 'wrong',
        category: 'results',
      }),
    ).toBe(false);
    expect(
      await t.mutation(internal.notificationEmails.unsubscribe, {
        token: 'unguessable-token',
        category: 'results',
      }),
    ).toBe(true);
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      emailResults: false,
      emailPredictionReminders: true,
    });
  });
  it('link scanners do not unsubscribe; POST applies the preference', async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'u',
        unsubscribeToken: 'secret',
        emailResults: true,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const url = '/notifications/unsubscribe?token=secret&category=results';
    expect((await t.fetch(url)).status).toBe(200);
    expect((await t.run((ctx) => ctx.db.get(id)))?.emailResults).toBe(true);
    expect((await t.fetch(url, { method: 'POST' })).status).toBe(200);
    expect((await t.run((ctx) => ctx.db.get(id)))?.emailResults).toBe(false);
  });
  it('checks opt-out again after a reminder has been queued', async () => {
    const t = convexTest(schema, modules);
    const { userId, raceId } = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'u',
        email: 'u@example.com',
        emailPredictionReminders: false,
        createdAt: now,
        updatedAt: now,
      });
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test',
        slug: 'test',
        status: 'upcoming',
        predictionLockAt: now + 86400000,
        raceStartAt: now + 86400000,
        createdAt: now,
        updatedAt: now,
      });
      return { userId, raceId };
    });
    await t.mutation(internal.notificationEmails.queue, {
      userId,
      raceId,
      kind: 'reminder',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'cancelled',
    );
  });
});

it('schedules exactly one delivery, with an unsubscribe token, once', async () => {
  const { default: resendTest } = await import('@convex-dev/resend/test');
  vi.useFakeTimers();
  vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
  const { resend } = await import('./lib/email');
  const originalKey = resend.config.apiKey;
  resend.config.apiKey = 're_test';
  const t = convexTest(schema, modules);
  resendTest.register(t);
  try {
    const ids = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'u',
        email: 'delivered@resend.dev',
        emailPredictionReminders: true,
        createdAt: now,
        updatedAt: now,
      });
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test',
        slug: 'test',
        status: 'upcoming',
        predictionLockAt: now + 86400000,
        raceStartAt: now + 86400000,
        createdAt: now,
        updatedAt: now,
      });
      return { userId, raceId };
    });
    await t.mutation(internal.notificationEmails.queue, {
      ...ids,
      kind: 'reminder',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'accepted',
    );
    expect(
      (await t.run((ctx) => ctx.db.get(ids.userId)))?.unsubscribeToken?.length,
    ).toBeGreaterThan(60);
    // `send` flips the job and schedules the render in one transaction, so a
    // second call must find it already `accepted` and schedule nothing more.
    const scheduled = await t.run((ctx) =>
      ctx.db.system
        .query('_scheduled_functions')
        .filter((q) =>
          q.eq(q.field('name'), 'emails/deliverNotificationEmail:deliver'),
        )
        .collect(),
    );
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].args[0]).toMatchObject({
      to: 'delivered@resend.dev',
      idempotencyKey: job.key,
      payload: { kind: 'reminder', raceName: 'Test' },
    });
  } finally {
    resend.config.apiKey = originalKey;
    vi.unstubAllEnvs();
    vi.useRealTimers();
  }
});

it('suppresses complaint recipients whether the provider sends a string or an array', async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert('users', {
      clerkUserId: 'u',
      email: 'u@example.com',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await t.mutation(internal.notificationEmails.onEmailEvent, {
    id: 'email1' as never,
    event: {
      type: 'email.complained',
      created_at: '2026-09-10',
      data: {
        created_at: '2026-09-10',
        email_id: 'provider1',
        from: 'sender@example.com',
        to: 'u@example.com',
        subject: 'Weekend summary',
      },
    },
  });
  expect((await t.run((ctx) => ctx.db.get(userId)))?.emailSuppressed).toBe(
    true,
  );
});

describe('email engagement tracking', () => {
  async function insertRaceAndJob(kind: 'reminder' | 'summary' | 'signup') {
    const t = convexTest(schema, modules);
    const { raceId, jobId } = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'u',
        email: 'u@example.com',
        createdAt: now,
        updatedAt: now,
      });
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test',
        slug: 'test',
        status: 'upcoming',
        predictionLockAt: now + 86400000,
        raceStartAt: now + 86400000,
        createdAt: now,
        updatedAt: now,
      });
      const jobId = await ctx.db.insert('notificationEmails', {
        key: `${kind}:${raceId}:${userId}`,
        userId,
        raceId,
        kind,
        status: 'accepted',
        emailId: 'provider-email-1',
        createdAt: now,
      });
      return { raceId, jobId };
    });
    return { t, raceId, jobId };
  }

  function openedEvent() {
    return {
      id: 'provider-email-1' as never,
      event: {
        type: 'email.opened' as const,
        created_at: '2026-09-10',
        data: {
          created_at: '2026-09-10',
          email_id: 'provider-email-1',
          from: 'sender@example.com',
          to: 'u@example.com',
          subject: 'Weekend summary',
          open: {
            ipAddress: '1.2.3.4',
            timestamp: '2026-09-10',
            userAgent: 'test',
          },
        },
      },
    };
  }

  function clickedEvent() {
    return {
      id: 'provider-email-1' as never,
      event: {
        type: 'email.clicked' as const,
        created_at: '2026-09-10',
        data: {
          created_at: '2026-09-10',
          email_id: 'provider-email-1',
          from: 'sender@example.com',
          to: 'u@example.com',
          subject: 'Weekend summary',
          click: {
            ipAddress: '1.2.3.4',
            timestamp: '2026-09-10',
            userAgent: 'test',
            link: 'https://grandprixpicks.com',
          },
        },
      },
    };
  }

  it('records the first open and click, and ignores repeats', async () => {
    const { t, jobId } = await insertRaceAndJob('reminder');
    await t.mutation(internal.notificationEmails.onEmailEvent, openedEvent());
    const afterOpen = await t.run((ctx) => ctx.db.get(jobId));
    expect(afterOpen?.openedAt).toBeTypeOf('number');
    const openedAt = afterOpen?.openedAt;

    await t.mutation(internal.notificationEmails.onEmailEvent, openedEvent());
    expect((await t.run((ctx) => ctx.db.get(jobId)))?.openedAt).toBe(openedAt);

    await t.mutation(internal.notificationEmails.onEmailEvent, clickedEvent());
    expect((await t.run((ctx) => ctx.db.get(jobId)))?.clickedAt).toBeTypeOf(
      'number',
    );
  });

  it('engagementStats requires an admin viewer and counts per kind', async () => {
    const { t, raceId } = await insertRaceAndJob('reminder');
    await expect(
      t.query(api.notificationEmails.engagementStats, { raceId }),
    ).rejects.toThrow();

    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        clerkUserId: 'admin',
        isAdmin: true,
        createdAt: 0,
        updatedAt: 0,
      });
    });
    const admin = t.withIdentity({ subject: 'admin' });
    const stats = await admin.query(api.notificationEmails.engagementStats, {
      raceId,
    });
    expect(stats).toMatchObject([
      { kind: 'reminder', accepted: 1, opened: 0, clicked: 0 },
      { kind: 'summary', accepted: 0, opened: 0, clicked: 0 },
      { kind: 'signup', accepted: 0, opened: 0, clicked: 0 },
    ]);
  });
});

beforeEach(() => {
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
});
