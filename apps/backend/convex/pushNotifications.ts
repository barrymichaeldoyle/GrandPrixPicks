'use node';

import { SUPPORT_MAILTO } from '@grandprixpicks/shared/contact';
import { v } from 'convex/values';
import webPush from 'web-push';
import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function headers() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(process.env.EXPO_ACCESS_TOKEN
      ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
      : {}),
  };
}
export const deliver = internalAction({
  args: { deliveryId: v.id('notificationDeliveries') },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (process.env.NOTIFICATION_DELIVERY_ENABLED !== 'true') {
      return null;
    }
    const row = await ctx.runMutation(
      internal.notificationDelivery.prepare,
      args,
    );
    if (!row) {
      return null;
    }
    function record(outcome: {
      status: 'accepted' | 'handed_off' | 'failed';
      ticketId?: string;
      error?: string;
      retryable?: boolean;
    }) {
      return ctx.runMutation(internal.notificationDelivery.record, {
        ...args,
        ...outcome,
      });
    }
    const ttl = Math.max(0, Math.floor((row.expiresAt - Date.now()) / 1000));
    if (!ttl) {
      await record({ status: 'failed', error: 'Expired' });
      return null;
    }
    try {
      if (row.channel === 'web') {
        if (!row.subscription) {
          await record({ status: 'failed', error: 'SubscriptionExpired' });
          return null;
        }
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (!publicKey || !privateKey) {
          throw new Error('Missing VAPID credentials');
        }
        webPush.setVapidDetails(
          process.env.VAPID_SUBJECT ?? SUPPORT_MAILTO,
          publicKey,
          privateKey,
        );
        await webPush.sendNotification(
          row.subscription,
          JSON.stringify({
            title: row.title,
            body: row.body,
            url: row.url,
            deliveryId: row._id,
            tag: row.eventKey,
          }),
          {
            TTL: ttl,
            timeout: 10000,
            urgency:
              row.category === 'news' || row.category === 'reaction'
                ? 'low'
                : 'normal',
          },
        );
        await record({ status: 'handed_off' });
      } else {
        const response = await fetchWithTimeout(
          'https://exp.host/--/api/v2/push/send',
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({
              to: row.target,
              title: row.title,
              body: row.body,
              ttl,
              channelId:
                row.category === 'news' || row.category === 'reaction'
                  ? 'social'
                  : row.category === 'results'
                    ? 'results'
                    : 'reminders',
              ...(row.category !== 'news' && row.category !== 'reaction'
                ? { sound: 'default' }
                : {}),
              data: {
                url: row.url,
                deliveryId: row._id,
                eventKey: row.eventKey,
              },
            }),
          },
        );
        if (!response.ok) {
          await record({
            status: 'failed',
            error: `HTTP ${response.status}`,
            retryable: response.status === 429 || response.status >= 500,
          });
          return null;
        }
        const json: unknown = await response.json();
        const data =
          typeof json === 'object' && json !== null && 'data' in json
            ? json.data
            : null;
        const ticket = Array.isArray(data) ? data[0] : data;
        if (
          ticket &&
          typeof ticket === 'object' &&
          'status' in ticket &&
          ticket.status === 'ok' &&
          'id' in ticket &&
          typeof ticket.id === 'string'
        ) {
          await record({ status: 'accepted', ticketId: ticket.id });
        } else {
          const error =
            ticket &&
            typeof ticket === 'object' &&
            'details' in ticket &&
            ticket.details &&
            typeof ticket.details === 'object' &&
            'error' in ticket.details
              ? String(ticket.details.error)
              : 'Invalid push ticket';
          await record({
            status: 'failed',
            error,
            retryable: error === 'MessageRateExceeded',
          });
        }
      }
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      await record({
        status: 'failed',
        error:
          status === 404 || status === 410
            ? 'SubscriptionExpired'
            : error instanceof Error
              ? error.message
              : 'Push send failed',
        retryable: status === undefined || status === 429 || status >= 500,
      });
    }
    return null;
  },
});
export const checkReceipts = internalAction({
  args: { deliveryIds: v.array(v.id('notificationDeliveries')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.runQuery(
      internal.notificationDelivery.receiptRows,
      args,
    );
    if (!rows.length) {
      return null;
    }
    try {
      const response = await fetchWithTimeout(
        'https://exp.host/--/api/v2/push/getReceipts',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ids: rows.map((row) => row.ticketId) }),
        },
      );
      if (!response.ok) {
        throw new Error(`Receipt HTTP ${response.status}`);
      }
      const json = (await response.json()) as {
        data?: Record<
          string,
          { status?: string; details?: { error?: string } }
        >;
      };
      for (const row of rows) {
        const receipt = row.ticketId ? json.data?.[row.ticketId] : undefined;
        if (receipt?.status === 'ok') {
          await ctx.runMutation(internal.notificationDelivery.record, {
            deliveryId: row._id,
            status: 'handed_off',
            ticketId: row.ticketId,
          });
        } else if (
          receipt?.status === 'error' ||
          Date.now() - row.updatedAt > 23 * 3600000
        ) {
          await ctx.runMutation(internal.notificationDelivery.record, {
            deliveryId: row._id,
            status: 'failed',
            error: receipt?.details?.error ?? 'Receipt unavailable',
            retryable: receipt?.details?.error === 'MessageRateExceeded',
          });
        }
      }
    } catch (error) {
      console.error('[push receipts]', error);
    }
    return null;
  },
});
// Old scheduled jobs lack an owner snapshot and expiry. Do not deliver them
// after rollout; newly created work always enters notificationDelivery first.
export const sendPushBatch = internalAction({
  args: {
    subscriptions: v.array(
      v.object({ endpoint: v.string(), p256dh: v.string(), auth: v.string() }),
    ),
    title: v.string(),
    body: v.string(),
    url: v.string(),
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({
    sent: 0,
    failed: args.subscriptions.length,
  }),
});
export const sendExpoPushBatch = internalAction({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    url: v.string(),
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({ sent: 0, failed: args.tokens.length }),
});
