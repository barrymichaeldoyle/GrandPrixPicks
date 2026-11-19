/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

async function asPlayer(username?: string) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      clerkUserId: 'player',
      ...(username ? { username } : {}),
      createdAt: 0,
      updatedAt: 0,
    });
  });
  return { t, player: t.withIdentity({ subject: 'player' }) };
}

describe('updateProfile username cooldown', () => {
  // Sign-up stopped asking for a username, so the first one is chosen after
  // the first save. A typo there must still be fixable straight away.
  it('does not start the 90-day lock on a first username', async () => {
    const { player } = await asPlayer();
    await player.mutation(api.users.updateProfile, { username: 'first_try' });
    expect((await player.query(api.users.me, {}))?.usernameChangedAt).toBe(
      undefined,
    );
    // The fix is a change, so it is the one that starts the lock.
    await player.mutation(api.users.updateProfile, { username: 'second_try' });
    const me = await player.query(api.users.me, {});
    expect(me?.username).toBe('second_try');
    expect(me?.usernameChangedAt).toEqual(expect.any(Number));
  });

  it('still locks a change to an existing username', async () => {
    const { player } = await asPlayer('original');
    await player.mutation(api.users.updateProfile, { username: 'renamed' });
    await expect(
      player.mutation(api.users.updateProfile, { username: 'again' }),
    ).rejects.toThrow(/change your username again/);
  });
});
