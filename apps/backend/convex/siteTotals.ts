import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction, internalQuery } from './_generated/server';

const DEFAULT_POSTHOG_INGEST_HOST = 'https://eu.i.posthog.com';
const PAGE_SIZE = 1000;

/** One page of the users table, counted. */
export const countUsersPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    count: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query('users').paginate(paginationOpts);
    return {
      count: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Send the registered-player total to PostHog as a `site_totals` event.
 *
 * PostHog only sees people who sign in on a tracked client, so a count of its
 * own identify events runs at about half the real total. The users table is
 * the source of truth; the "Registered players" tile on the TRMNL dashboard
 * charts the max of `users` per week (apps/web/scripts/setup-posthog.mjs).
 *
 * Gated on `POSTHOG_PROJECT_KEY`, which is set on prod only, so dev never
 * writes its seeded users into the prod chart. A failed capture only costs
 * one day's point.
 */
export const reportToPostHog = internalAction({
  args: {},
  returns: v.object({
    sent: v.boolean(),
    users: v.number(),
  }),
  handler: async (ctx) => {
    let users = 0;
    let cursor: string | null = null;
    for (;;) {
      const page: {
        count: number;
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(internal.siteTotals.countUsersPage, {
        paginationOpts: { numItems: PAGE_SIZE, cursor },
      });
      users += page.count;
      if (page.isDone) {
        break;
      }
      cursor = page.continueCursor;
    }

    const apiKey = process.env.POSTHOG_PROJECT_KEY;
    if (!apiKey) {
      return { sent: false, users };
    }
    const host = (
      process.env.POSTHOG_INGEST_HOST ?? DEFAULT_POSTHOG_INGEST_HOST
    ).replace(/\/$/, '');
    const day = new Date().toISOString().slice(0, 10);

    try {
      const response = await fetch(`${host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          event: 'site_totals',
          properties: {
            distinct_id: 'grandprixpicks-backend',
            $insert_id: `site_totals-${day}`,
            $process_person_profile: false,
            platform: 'server',
            users,
          },
        }),
      });
      if (!response.ok) {
        console.warn(`[siteTotals] capture failed: ${response.status}`);
        return { sent: false, users };
      }
      return { sent: true, users };
    } catch (error) {
      console.warn('[siteTotals] capture failed', error);
      return { sent: false, users };
    }
  },
});
