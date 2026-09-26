/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

async function asAdmin() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      clerkUserId: 'admin',
      username: 'admin',
      isAdmin: true,
      createdAt: 0,
      updatedAt: 0,
    });
  });
  return t.withIdentity({ subject: 'admin' });
}

describe('adminSetAnnouncement', () => {
  // An admin typo is an expected rejection with a reason to show. A plain
  // Error reaches Sentry as an uncaught failure (GRAND-PRIX-PICKS-1G).
  it('rejects a past auto-hide time with a ConvexError', async () => {
    const admin = await asAdmin();

    const error = await admin
      .mutation(api.announcements.adminSetAnnouncement, {
        message: 'Results are provisional',
        expiresAt: Date.now() - 60_000,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toBe(
      'Auto-hide time must be in the future',
    );
  });
});
