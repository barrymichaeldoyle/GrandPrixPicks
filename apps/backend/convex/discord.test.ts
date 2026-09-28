/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('discord.postNews', () => {
  it('makes no fetch when the webhook env var is unset', async () => {
    const t = convexTest(schema, modules);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await t.action(internal.discord.postNews, {
      headline: 'Headline',
      sourceName: 'Example',
      feedEventId: 'abc123',
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts an embed with the utm link and allowed_mentions cleared', async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv('DISCORD_NEWS_WEBHOOK_URL', 'https://discord.test/webhook');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await t.action(internal.discord.postNews, {
      headline: 'Verstappen takes pole',
      sourceName: 'Formula1.com',
      feedEventId: 'abc123',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://discord.test/webhook');
    const body = JSON.parse(init.body);
    expect(body.allowed_mentions).toEqual({ parse: [] });
    expect(body.embeds[0]).toMatchObject({
      title: 'Verstappen takes pole',
      url: 'https://grandprixpicks.com/feed/abc123?utm_source=discord&utm_campaign=news',
      footer: { text: 'Formula1.com' },
    });
  });

  it('resolves without throwing when the webhook returns a non-2xx', async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv('DISCORD_NEWS_WEBHOOK_URL', 'https://discord.test/webhook');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );

    await expect(
      t.action(internal.discord.postNews, {
        headline: 'Headline',
        sourceName: 'Example',
        feedEventId: 'abc123',
      }),
    ).resolves.not.toThrow();
  });

  it('resolves without throwing when fetch itself rejects', async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv('DISCORD_NEWS_WEBHOOK_URL', 'https://discord.test/webhook');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    await expect(
      t.action(internal.discord.postNews, {
        headline: 'Headline',
        sourceName: 'Example',
        feedEventId: 'abc123',
      }),
    ).resolves.not.toThrow();
  });
});
