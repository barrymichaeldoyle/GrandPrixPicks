/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function seed() {
  const t = convexTest(schema, modules);
  const leagueId = await t.run(async (ctx) => {
    const now = Date.now();
    const ids = [];
    for (const name of ['alice', 'bob']) {
      ids.push(
        await ctx.db.insert('users', {
          clerkUserId: name,
          clerkSubject: name,
          username: name,
          displayName: name,
          isAdmin: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    const league = await ctx.db.insert('leagues', {
      name: 'Paddock Club',
      slug: 'paddock-club',
      // A legacy plaintext password, so the test needs no hashing.
      password: 'slipstream',
      visibility: 'private',
      createdBy: ids[0]!,
      season: 2026,
      memberCount: 1,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: league,
      userId: ids[0]!,
      role: 'admin',
      joinedAt: now,
    });
    return league;
  });
  const bob = t.withIdentity({ subject: 'bob', tokenIdentifier: 'bob' });
  return { t, leagueId, bob };
}

describe('joinLeague password throttle', () => {
  it('reports a wrong password without joining, and records the attempt', async () => {
    const { t, leagueId, bob } = await seed();

    const result = await bob.mutation(api.leagues.joinLeague, {
      leagueId,
      password: 'wrong',
    });

    expect(result).toEqual({ joined: false, reason: 'incorrect_password' });
    const attempts = await t.run((ctx) =>
      ctx.db.query('leagueJoinAttempts').collect(),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.failedCount).toBe(1);
  });

  it('locks the pair out after five wrong passwords, even for the right one', async () => {
    const { leagueId, bob } = await seed();

    for (let attempt = 0; attempt < 5; attempt++) {
      await bob.mutation(api.leagues.joinLeague, {
        leagueId,
        password: `wrong-${attempt}`,
      });
    }

    await expect(
      bob.mutation(api.leagues.joinLeague, {
        leagueId,
        password: 'slipstream',
      }),
    ).rejects.toThrow('Too many incorrect passwords');
  });

  it('joins with the right password', async () => {
    const { leagueId, bob } = await seed();

    const result = await bob.mutation(api.leagues.joinLeague, {
      leagueId,
      password: 'slipstream',
    });

    expect(result).toMatchObject({ joined: true, alreadyMember: false });
  });
});
