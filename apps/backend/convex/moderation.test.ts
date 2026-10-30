/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function seed() {
  const t = convexTest(schema, modules);
  const [alice, bob] = await t.run(async (ctx) => {
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
    return ids;
  });
  function as(name: string) {
    return t.withIdentity({ subject: name, tokenIdentifier: name });
  }
  return { t, alice: alice!, bob: bob!, as };
}

describe('blockUser', () => {
  it('drops the follows both ways and stops either following again', async () => {
    const { t, alice, bob, as } = await seed();
    await as('alice').mutation(api.follows.follow, { followeeId: bob });
    await as('bob').mutation(api.follows.follow, { followeeId: alice });

    await as('alice').mutation(api.moderation.blockUser, { userId: bob });

    const follows = await t.run((ctx) => ctx.db.query('follows').collect());
    expect(follows).toHaveLength(0);
    await expect(
      as('bob').mutation(api.follows.follow, { followeeId: alice }),
    ).rejects.toThrow("You can't follow this player");
    await expect(
      as('alice').mutation(api.follows.follow, { followeeId: bob }),
    ).rejects.toThrow("You can't follow this player");
  });

  it('shows the block on the profile to the blocker only', async () => {
    const { bob, as } = await seed();
    await as('alice').mutation(api.moderation.blockUser, { userId: bob });

    const seenByAlice = await as('alice').query(
      api.users.getProfileByUsername,
      { username: 'bob' },
    );
    const seenByBob = await as('bob').query(api.users.getProfileByUsername, {
      username: 'alice',
    });
    expect(seenByAlice?.blockedByViewer).toBe(true);
    expect(seenByBob?.blockedByViewer).toBe(false);
  });

  it('lets them follow again after an unblock', async () => {
    const { bob, as } = await seed();
    await as('alice').mutation(api.moderation.blockUser, { userId: bob });
    await as('alice').mutation(api.moderation.unblockUser, { userId: bob });

    await expect(
      as('alice').mutation(api.follows.follow, { followeeId: bob }),
    ).resolves.toBeDefined();
  });

  it('refuses to block yourself', async () => {
    const { alice, as } = await seed();
    await expect(
      as('alice').mutation(api.moderation.blockUser, { userId: alice }),
    ).rejects.toThrow('You cannot block yourself');
  });
});

describe('reportUser', () => {
  it('files a support request naming the reported player', async () => {
    const { t, alice, bob, as } = await seed();
    await as('alice').mutation(api.moderation.reportUser, { userId: bob });

    const requests = await t.run((ctx) =>
      ctx.db.query('supportRequests').collect(),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      userId: alice,
      reportedUserId: bob,
      category: 'player_report',
      subject: 'Player report: @bob',
    });
  });
});

describe('updateProfile', () => {
  it('refuses an objectionable username or display name', async () => {
    const { as } = await seed();
    await expect(
      as('alice').mutation(api.users.updateProfile, { username: 'fuck_off' }),
    ).rejects.toThrow("That name isn't allowed");
    await expect(
      as('alice').mutation(api.users.updateProfile, { displayName: 'B1tch' }),
    ).rejects.toThrow("That name isn't allowed");
  });
});
