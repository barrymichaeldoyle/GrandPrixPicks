/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

// `.tsx` too: the delivery action these jobs schedule lives in
// `emails/deliverNotificationEmail.tsx`, and without it convex-test logs a
// missing-module error whenever the scheduler runs it.
const modules = import.meta.glob('./**/*.{ts,tsx}');

// The Resend component is not registered with convex-test, so stand in for the
// handoff. The email still renders for real.
vi.mock('./lib/email', () => ({ sendEmail: vi.fn(async () => 'email-id') }));

beforeEach(() => {
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
  return () => vi.unstubAllEnvs();
});

async function queuedJob() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'u',
      email: 'a@example.com',
      emailPredictionReminders: true,
      createdAt: now,
      updatedAt: now,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test',
      slug: 'test-2026',
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
  return { t, job };
}

describe('notification email retries', () => {
  // CONVEX_SITE_URL is the realistic version of this: a missing env var makes
  // `send` throw the same way every time, and the dispatch cron re-runs every
  // queued row once a minute.
  it('counts a throw in send and gives up at the ceiling', async () => {
    const { t, job } = await queuedJob();
    vi.stubEnv('CONVEX_SITE_URL', '');
    for (let i = 1; i <= 4; i++) {
      await t.mutation(internal.notificationEmails.send, { id: job._id });
      expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
        status: 'queued',
        attempts: i,
      });
    }
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
      status: 'failed',
      attempts: 5,
    });
    // A failed job stops being re-dispatched, so it cannot crowd the window.
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
      status: 'failed',
      attempts: 5,
    });
  });

  it('puts an accepted job back on the queue when the render action fails', async () => {
    const { t, job } = await queuedJob();
    vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
      status: 'accepted',
    });
    await t.mutation(internal.notificationEmails.markDeliveryFailed, {
      id: job._id,
      error: 'render exploded',
    });
    expect(await t.run((ctx) => ctx.db.get(job._id))).toMatchObject({
      status: 'queued',
      attempts: 1,
      error: 'render exploded',
    });
  });
});
