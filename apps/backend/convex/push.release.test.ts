/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('releaseExpoPushToken', () => {
  it('drops the device without a signed-in viewer and leaves other devices', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'user_revoked',
        createdAt: now,
        updatedAt: now,
      });
      for (const token of [
        'ExponentPushToken[phone]',
        'ExponentPushToken[tablet]',
      ]) {
        await ctx.db.insert('expoPushTokens', {
          userId,
          token,
          refreshedAt: now,
          createdAt: now,
        });
      }
    });

    await t.mutation(api.push.releaseExpoPushToken, {
      token: 'ExponentPushToken[phone]',
    });
    // Releasing again, or a token never saved, is not an error.
    await t.mutation(api.push.releaseExpoPushToken, {
      token: 'ExponentPushToken[phone]',
    });

    const tokens = await t.run(async (ctx) =>
      (await ctx.db.query('expoPushTokens').collect()).map((row) => row.token),
    );
    expect(tokens).toEqual(['ExponentPushToken[tablet]']);
  });
});
