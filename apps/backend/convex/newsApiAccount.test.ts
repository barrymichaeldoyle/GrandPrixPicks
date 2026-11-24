/// <reference types="vite/client" />
import rateLimiter from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.run(async (ctx) => {
    for (const username of ['alice', 'bob']) {
      await ctx.db.insert('users', {
        clerkUserId: username,
        username,
        createdAt: 0,
        updatedAt: 0,
      });
    }
  });
  return {
    t,
    alice: t.withIdentity({ subject: 'alice' }),
    bob: t.withIdentity({ subject: 'bob' }),
  };
}

describe('self-serve news API keys', () => {
  it('creates a free key that works against the API', async () => {
    const { t, alice } = await setup();
    const created = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: '  my bot  ',
    });
    expect(created.plan).toBe('free');
    expect(created.label).toBe('my bot');
    expect(created.key).toMatch(/^gpp_[A-Za-z0-9]{40}$/);
    expect(created.prefix).toBe(created.key.slice(0, 10));

    const result = await t.query(internal.newsApi.list, {
      apiKey: created.key,
      now: Date.now() + HOUR,
    });
    expect(result.ok).toBe(true);

    const [row] = await t.run(async (ctx) =>
      ctx.db.query('newsApiKeys').collect(),
    );
    // Only the hash is stored.
    expect(row?.keyHash).not.toContain(created.key);
    expect(JSON.stringify(row)).not.toContain(created.key);

    const keys = await alice.query(api.newsApiAccount.myKeys, {});
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({
      label: 'my bot',
      prefix: created.prefix,
      plan: 'free',
      revokedAt: null,
      usage: null,
    });
    expect(JSON.stringify(keys)).not.toContain(created.key);
    expect(Object.keys(keys[0]!)).not.toContain('keyHash');
  });

  it('reports the latest day of requests', async () => {
    const { t, alice } = await setup();
    const { key } = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'bot',
    });
    await t.mutation(internal.newsApi.recordRequest, { apiKey: key });
    await t.mutation(internal.newsApi.recordRequest, { apiKey: key });
    const [listed] = await alice.query(api.newsApiAccount.myKeys, {});
    expect(listed?.usage).toEqual({
      day: new Date().toISOString().slice(0, 10),
      requests: 2,
    });
  });

  it('rejects a blank or long label', async () => {
    const { alice } = await setup();
    await expect(
      alice.mutation(api.newsApiAccount.createMyKey, { label: '   ' }),
    ).rejects.toThrow(/1 to 60 characters/);
    await expect(
      alice.mutation(api.newsApiAccount.createMyKey, { label: 'a'.repeat(61) }),
    ).rejects.toThrow(/1 to 60 characters/);
  });

  it('allows two active keys, and a third once one is revoked', async () => {
    const { alice, bob } = await setup();
    const first = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'one',
    });
    await alice.mutation(api.newsApiAccount.createMyKey, { label: 'two' });
    await expect(
      alice.mutation(api.newsApiAccount.createMyKey, { label: 'three' }),
    ).rejects.toThrow(/2 active keys/);

    // The limit is per account.
    await bob.mutation(api.newsApiAccount.createMyKey, { label: 'bob' });

    await alice.mutation(api.newsApiAccount.revokeMyKey, { id: first.id });
    await alice.mutation(api.newsApiAccount.createMyKey, { label: 'three' });
    expect(await alice.query(api.newsApiAccount.myKeys, {})).toHaveLength(3);
  });

  it('stops a revoked key working', async () => {
    const { t, alice } = await setup();
    const { id, key } = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'bot',
    });
    await alice.mutation(api.newsApiAccount.revokeMyKey, { id });
    expect(
      await t.query(internal.newsApi.list, {
        apiKey: key,
        now: Date.now() + HOUR,
      }),
    ).toEqual({ ok: false, error: 'unauthorized' });
    const [listed] = await alice.query(api.newsApiAccount.myKeys, {});
    expect(listed?.revokedAt).toEqual(expect.any(Number));
  });

  it('keeps each account to its own keys', async () => {
    const { t, alice, bob } = await setup();
    const { id, key } = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'alice bot',
    });
    expect(await bob.query(api.newsApiAccount.myKeys, {})).toEqual([]);
    await expect(
      bob.mutation(api.newsApiAccount.revokeMyKey, { id }),
    ).rejects.toThrow(/No key with that id/);
    expect(
      (
        await t.query(internal.newsApi.list, {
          apiKey: key,
          now: Date.now() + HOUR,
        })
      ).ok,
    ).toBe(true);

    // An operator key belongs to nobody, so no account sees or revokes it.
    const operator = await t.mutation(internal.newsApi.createKey, {
      label: 'trmnl',
      plan: 'commercial',
    });
    const operatorId = (await t.query(internal.newsApi.listKeys, {})).find(
      (row) => row.prefix === operator.prefix,
    )!.id;
    await expect(
      alice.mutation(api.newsApiAccount.revokeMyKey, { id: operatorId }),
    ).rejects.toThrow(/No key with that id/);
    expect(await alice.query(api.newsApiAccount.myKeys, {})).toHaveLength(1);
  });

  it('returns nothing signed out and refuses to create or revoke', async () => {
    const { t, alice } = await setup();
    const { id } = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'bot',
    });
    expect(await t.query(api.newsApiAccount.myKeys, {})).toEqual([]);
    await expect(
      t.mutation(api.newsApiAccount.createMyKey, { label: 'bot' }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.newsApiAccount.revokeMyKey, { id }),
    ).rejects.toThrow();
    expect(await alice.query(api.newsApiAccount.myKeys, {})).toHaveLength(1);
  });

  it('shows a plan the operator moved the key to, and its owner', async () => {
    const { t, alice } = await setup();
    const { id } = await alice.mutation(api.newsApiAccount.createMyKey, {
      label: 'bot',
    });
    await t.mutation(internal.newsApi.setKeyPlan, { id, plan: 'hobby' });
    const [listed] = await alice.query(api.newsApiAccount.myKeys, {});
    expect(listed?.plan).toBe('hobby');

    const [operatorView] = await t.query(internal.newsApi.listKeys, {});
    expect(operatorView?.account).toMatchObject({ username: 'alice' });
  });
});
