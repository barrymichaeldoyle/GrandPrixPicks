/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

/** A league created by alice, with bob as a second admin and carol a member. */
async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    function user(name: string) {
      return ctx.db.insert('users', {
        clerkUserId: name,
        clerkSubject: name,
        username: name,
        displayName: name,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    const alice = await user('alice');
    const bob = await user('bob');
    const carol = await user('carol');
    const leagueId = await ctx.db.insert('leagues', {
      name: 'Paddock Club',
      slug: 'paddock-club',
      visibility: 'private',
      createdBy: alice,
      season: 2026,
      memberCount: 3,
      adminCount: 2,
      createdAt: now,
      updatedAt: now,
    });
    for (const [userId, role] of [
      [alice, 'admin'],
      [bob, 'admin'],
      [carol, 'member'],
    ] as const) {
      await ctx.db.insert('leagueMembers', {
        leagueId,
        userId,
        role,
        joinedAt: now,
      });
    }
    return { leagueId, alice, carol };
  });
  function as(name: string) {
    return t.withIdentity({ subject: name, tokenIdentifier: name });
  }
  return {
    t,
    as,
    leagueId: ids.leagueId,
    alice: ids.alice,
    carol: ids.carol,
  };
}

describe('league creator protection', () => {
  it('stops another admin removing or demoting the creator', async () => {
    const { as, leagueId, alice } = await seed();

    await expect(
      as('bob').mutation(api.leagues.removeMember, { leagueId, userId: alice }),
    ).rejects.toThrow('The league creator can’t be removed');
    await expect(
      as('bob').mutation(api.leagues.demoteMember, { leagueId, userId: alice }),
    ).rejects.toThrow('The league creator can’t be removed');
  });

  it('lets another admin manage everyone else', async () => {
    const { t, as, leagueId, carol } = await seed();

    await as('bob').mutation(api.leagues.promoteMember, {
      leagueId,
      userId: carol,
    });
    await as('bob').mutation(api.leagues.removeMember, {
      leagueId,
      userId: carol,
    });

    const members = await t.run((ctx) =>
      ctx.db.query('leagueMembers').collect(),
    );
    expect(members).toHaveLength(2);
  });

  it('lets only the creator delete the league while they lead it', async () => {
    const { t, as, leagueId } = await seed();

    await expect(
      as('bob').mutation(api.leagues.deleteLeague, { leagueId }),
    ).rejects.toThrow('Only the league creator can delete it.');
    expect(
      (
        await as('bob').query(api.leagues.getLeagueBySlug, {
          slug: 'paddock-club',
        })
      )?.viewerCanDelete,
    ).toBe(false);

    await as('alice').mutation(api.leagues.deleteLeague, { leagueId });
    expect(await t.run((ctx) => ctx.db.get(leagueId))).toBeNull();
  });

  it('hands both powers to the other admins once the creator leaves', async () => {
    const { t, as, leagueId } = await seed();
    await as('alice').mutation(api.leagues.leaveLeague, { leagueId });

    expect(
      (
        await as('bob').query(api.leagues.getLeagueBySlug, {
          slug: 'paddock-club',
        })
      )?.viewerCanDelete,
    ).toBe(true);
    await as('bob').mutation(api.leagues.deleteLeague, { leagueId });
    expect(await t.run((ctx) => ctx.db.get(leagueId))).toBeNull();
  });
});
