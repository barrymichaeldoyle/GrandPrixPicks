import { missingPicks } from './lib/notificationEligibility';
import schema from './schema';
import { v } from 'convex/values';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { components, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import {
  wantsPushNews,
  wantsPushPredictionReminders,
  wantsPushPredictionLockReminders,
  wantsPushResults,
  wantsPushSessionLocked,
} from './lib/notificationChannels';

export const categoryValidator = v.union(
  v.literal('reminder'),
  v.literal('lock_reminder'),
  v.literal('results'),
  v.literal('session_locked'),
  v.literal('news'),
);
export const messageFields = {
  title: v.string(),
  body: v.string(),
  url: v.string(),
  eventKey: v.optional(v.string()),
  category: v.optional(categoryValidator),
  expiresAt: v.optional(v.number()),
  raceId: v.optional(v.id('races')),
  sessionType: v.optional(
    v.union(
      v.literal('quali'),
      v.literal('sprint_quali'),
      v.literal('sprint'),
      v.literal('race'),
    ),
  ),
  expectedLockAt: v.optional(v.number()),
};
type Category = Doc<'notificationDeliveries'>['category'];
export type Message = {
  title: string;
  body: string;
  url: string;
  eventKey?: string;
  category?: Category;
  expiresAt?: number;
  raceId?: Id<'races'>;
  sessionType?: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  expectedLockAt?: number;
};
const limiter = new RateLimiter(components.rateLimiter, {
  push: { kind: 'token bucket', rate: 400, period: 1000, capacity: 400 },
});
function inferCategory(url: string): Category {
  if (url.includes('session_locked')) {
    return 'session_locked';
  }
  if (url.includes('results')) {
    return 'results';
  }
  if (url.includes('last_chance') || url.includes('lock_approaching')) {
    return 'lock_reminder';
  }
  return 'reminder';
}
export function allowed(user: Doc<'users'>, category: Category) {
  if (user.deletingAt) {
    return false;
  }
  return {
    reminder: wantsPushPredictionReminders,
    lock_reminder: wantsPushPredictionLockReminders,
    results: wantsPushResults,
    session_locked: wantsPushSessionLocked,
    news: wantsPushNews,
  }[category](user);
}
export function quietUntil(now: number, timezone?: string): number {
  let formatter: Intl.DateTimeFormat | undefined;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone ?? 'UTC',
      hour: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    /* Invalid legacy timezone: use UTC. */
  }
  function hourAt(time: number) {
    return formatter
      ? Number(formatter.format(time))
      : new Date(time).getUTCHours();
  }
  // Step through actual instants, including DST and half-hour offsets.
  for (let minute = 0; minute <= 12 * 60; minute++) {
    const time = now + minute * 60000;
    const hour = hourAt(time);
    if (hour >= 8 && hour < 22) {
      return time;
    }
  }
  return now + 12 * 60 * 60000;
}
async function enqueue(
  ctx: MutationCtx,
  userId: Id<'users'>,
  channel: 'expo' | 'web',
  target: string,
  message: Message,
) {
  const user = await ctx.db.get(userId);
  const category = message.category ?? inferCategory(message.url);
  if (!user || !allowed(user, category)) {
    return;
  }
  const now = Date.now();
  const eventKey =
    message.eventKey ?? `${category}:${message.url}:${message.title}`;
  const key = `${eventKey}:${channel}:${target}`;
  if (
    await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
  ) {
    return;
  }
  let campaign = await ctx.db
    .query('notificationCampaigns')
    .withIndex('by_key', (q) => q.eq('key', eventKey))
    .unique();
  if (campaign?.cancelled) {
    return;
  }
  if (!campaign) {
    const id = await ctx.db.insert('notificationCampaigns', {
      key: eventKey,
      cancelled: false,
      createdAt: now,
    });
    campaign = await ctx.db.get(id);
  }
  const dueAt =
    category === 'news' && user.notificationQuietHours !== false
      ? quietUntil(now, user.timezone)
      : now;
  await ctx.db.insert('notificationDeliveries', {
    key,
    eventKey,
    userId,
    channel,
    target,
    title: message.title,
    body: message.body,
    url: message.url,
    category,
    status: 'queued',
    attempts: 0,
    dueAt,
    expiresAt: message.expiresAt ?? now + 24 * 3600000,
    raceId: message.raceId,
    sessionType: message.sessionType,
    expectedLockAt: message.expectedLockAt,
    createdAt: now,
    updatedAt: now,
  });
}
export const enqueueExpo = internalMutation({
  args: { tokens: v.array(v.string()), ...messageFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const token of args.tokens) {
      const row = await ctx.db
        .query('expoPushTokens')
        .withIndex('by_token', (q) => q.eq('token', token))
        .unique();
      if (row) {
        await enqueue(ctx, row.userId, 'expo', token, args);
      }
    }
    return null;
  },
});
export const enqueueWeb = internalMutation({
  args: {
    subscriptions: v.array(
      v.object({ endpoint: v.string(), p256dh: v.string(), auth: v.string() }),
    ),
    ...messageFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const sub of args.subscriptions) {
      const row = await ctx.db
        .query('pushSubscriptions')
        .withIndex('by_endpoint', (q) => q.eq('endpoint', sub.endpoint))
        .unique();
      if (row) {
        await enqueue(ctx, row.userId, 'web', sub.endpoint, args);
      }
    }
    return null;
  },
});
async function isValid(ctx: MutationCtx, row: Doc<'notificationDeliveries'>) {
  const user = await ctx.db.get(row.userId);
  if (!user || !allowed(user, row.category) || row.expiresAt <= Date.now()) {
    return false;
  }
  const campaign = await ctx.db
    .query('notificationCampaigns')
    .withIndex('by_key', (q) => q.eq('key', row.eventKey))
    .unique();
  if (campaign?.cancelled) {
    return false;
  }
  const device =
    row.channel === 'expo'
      ? await ctx.db
          .query('expoPushTokens')
          .withIndex('by_token', (q) => q.eq('token', row.target))
          .unique()
      : await ctx.db
          .query('pushSubscriptions')
          .withIndex('by_endpoint', (q) => q.eq('endpoint', row.target))
          .unique();
  if (!device || device.userId !== row.userId) {
    return false;
  }
  if (row.raceId) {
    const race = await ctx.db.get(row.raceId);
    if (!race || race.status === 'cancelled') {
      return false;
    }
    if (
      (row.category === 'reminder' || row.category === 'lock_reminder') &&
      !(await missingPicks(
        ctx,
        row.userId,
        race,
        Date.now(),
        row.category === 'lock_reminder' ? row.sessionType : undefined,
      ))
    ) {
      return false;
    }
    if (row.expectedLockAt !== undefined && row.sessionType) {
      const current = {
        quali: race.qualiLockAt,
        sprint_quali: race.sprintQualiLockAt,
        sprint: race.sprintLockAt,
        race: race.predictionLockAt,
      }[row.sessionType];
      if (current !== row.expectedLockAt) {
        return false;
      }
    }
  }
  return true;
}
export const dispatchDue = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (process.env.NOTIFICATION_DELIVERY_ENABLED !== 'true') {
      return null;
    }
    const now = Date.now();
    const rows = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_status_due', (q) =>
        q.eq('status', 'queued').lte('dueAt', now),
      )
      .take(100);
    for (const row of rows) {
      if (!(await isValid(ctx, row))) {
        await ctx.db.patch(row._id, { status: 'cancelled', updatedAt: now });
        continue;
      }
      const user = await ctx.db.get(row.userId);
      if (row.category === 'news' && user?.notificationQuietHours !== false) {
        const due = quietUntil(now, user?.timezone);
        if (due > now) {
          await ctx.db.patch(row._id, { dueAt: due });
          continue;
        }
      }
      const quota = await limiter.limit(ctx, 'push');
      if (!quota.ok) {
        break;
      }
      await ctx.db.patch(row._id, {
        status: 'sending',
        attempts: row.attempts + 1,
        dueAt: now + 120000,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.pushNotifications.deliver, {
        deliveryId: row._id,
      });
    }
    const emails = await ctx.db
      .query('notificationEmails')
      .withIndex('by_status', (q) => q.eq('status', 'queued'))
      .take(100);
    for (const email of emails) {
      if (email.kind !== 'summary' || now - email.createdAt >= 10 * 60000) {
        await ctx.scheduler.runAfter(0, internal.notificationEmails.send, {
          id: email._id,
        });
      }
    }
    // Recover actions interrupted before they recorded an outcome. Push providers
    // are at-least-once: an ambiguous timeout can still produce a duplicate.
    const stuck = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_status_due', (q) =>
        q.eq('status', 'sending').lte('dueAt', now),
      )
      .take(100);
    for (const row of stuck) {
      await ctx.db.patch(row._id, {
        status: row.attempts < 5 ? 'queued' : 'failed',
        error: 'Delivery action timed out',
        dueAt: now,
        updatedAt: now,
      });
    }
    const receipts = await ctx.db
      .query('notificationDeliveries')
      .withIndex('by_status_due', (q) =>
        q.eq('status', 'accepted').lte('dueAt', now),
      )
      .take(100);
    if (receipts.length) {
      for (const row of receipts) {
        await ctx.db.patch(row._id, { dueAt: now + 15 * 60000 });
      }
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.checkReceipts,
        { deliveryIds: receipts.map((r) => r._id) },
      );
    }
    if (rows.length === 100) {
      await ctx.scheduler.runAfter(
        1000,
        internal.notificationDelivery.dispatchDue,
        {},
      );
    }
    return null;
  },
});
export const prepare = internalMutation({
  args: { deliveryId: v.id('notificationDeliveries') },
  returns: v.union(
    v.null(),
    schema.tables.notificationDeliveries.validator.extend({
      _id: v.id('notificationDeliveries'),
      _creationTime: v.number(),
      subscription: v.union(
        v.null(),
        v.object({
          endpoint: v.string(),
          keys: v.object({ auth: v.string(), p256dh: v.string() }),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.deliveryId);
    if (!row || row.status !== 'sending') {
      return null;
    }
    if (!(await isValid(ctx, row))) {
      await ctx.db.patch(row._id, { status: 'cancelled' });
      return null;
    }
    if (row.category === 'news') {
      const feedId = row.url.split('/feed/')[1]?.split('?')[0];
      const id = feedId ? ctx.db.normalizeId('feedEvents', feedId) : null;
      const feed = id ? await ctx.db.get(id) : null;
      if (!feed) {
        await ctx.db.patch(row._id, { status: 'cancelled' });
        return null;
      }
    }
    const sub =
      row.channel === 'web'
        ? await ctx.db
            .query('pushSubscriptions')
            .withIndex('by_endpoint', (q) => q.eq('endpoint', row.target))
            .unique()
        : null;
    return {
      ...row,
      subscription: sub
        ? {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          }
        : null,
    };
  },
});
export const record = internalMutation({
  args: {
    deliveryId: v.id('notificationDeliveries'),
    status: v.union(
      v.literal('accepted'),
      v.literal('handed_off'),
      v.literal('failed'),
    ),
    ticketId: v.optional(v.string()),
    error: v.optional(v.string()),
    retryable: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.deliveryId);
    if (!row || row.status === 'cancelled' || row.status === 'handed_off') {
      return null;
    }
    const now = Date.now();
    const retry = args.retryable && row.attempts < 5 && row.expiresAt > now;
    await ctx.db.patch(row._id, {
      status: retry ? 'queued' : args.status,
      ticketId: args.ticketId,
      error: args.error,
      dueAt:
        now + (retry ? Math.min(60000, 2000 * 2 ** row.attempts) : 15 * 60000),
      updatedAt: now,
    });
    if (
      args.error === 'DeviceNotRegistered' ||
      args.error === 'SubscriptionExpired'
    ) {
      const device =
        row.channel === 'expo'
          ? await ctx.db
              .query('expoPushTokens')
              .withIndex('by_token', (q) => q.eq('token', row.target))
              .unique()
          : await ctx.db
              .query('pushSubscriptions')
              .withIndex('by_endpoint', (q) => q.eq('endpoint', row.target))
              .unique();
      if (device?.userId === row.userId) {
        await ctx.db.delete(device._id);
      }
    }
    return null;
  },
});
export const receiptRows = internalQuery({
  args: { deliveryIds: v.array(v.id('notificationDeliveries')) },
  returns: v.array(
    schema.tables.notificationDeliveries.validator.extend({
      _id: v.id('notificationDeliveries'),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return (
      await Promise.all(args.deliveryIds.map((id) => ctx.db.get(id)))
    ).filter(
      (row): row is Doc<'notificationDeliveries'> =>
        row !== null && row.status === 'accepted',
    );
  },
});
export const markOpened = mutation({
  args: { deliveryId: v.id('notificationDeliveries') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    const row = await ctx.db.get(args.deliveryId);
    if (row?.userId === viewer._id && !row.openedAt) {
      await ctx.db.patch(row._id, { openedAt: Date.now() });
    }
    if (row?.userId === viewer._id) {
      if (
        row.raceId &&
        row.sessionType &&
        (row.category === 'results' || row.category === 'session_locked')
      ) {
        const notifications = await ctx.db
          .query('inAppNotifications')
          .withIndex('by_user_type_raceId_and_sessionType', (q) =>
            q
              .eq('userId', viewer._id)
              .eq(
                'type',
                row.category === 'session_locked'
                  ? 'session_locked'
                  : 'results_published',
              )
              .eq('raceId', row.raceId)
              .eq('sessionType', row.sessionType),
          )
          .take(20);
        for (const notification of notifications) {
          if (!notification.readAt) {
            await ctx.db.patch(notification._id, { readAt: Date.now() });
          }
        }
      }
    }
    return null;
  },
});
