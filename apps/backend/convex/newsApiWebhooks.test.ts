/// <reference types="vite/client" />
import rateLimiter from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { webhookUrlProblem } from './newsApiWebhooks';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 20, 9, 0, 0);
const ENDPOINT = 'https://hooks.example.com/f1';

type Sent = { url: string; body: string; headers: Record<string, string> };

/** A stub for `fetch` that answers each POST with the next status given. */
function stubFetch(...statuses: number[]) {
  const sent: Sent[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    sent.push({
      url,
      body: String(init.body),
      headers: init.headers as Record<string, string>,
    });
    const status = statuses.length > 1 ? statuses.shift()! : statuses[0]!;
    return new Response(null, { status });
  });
  vi.stubGlobal('fetch', fetch);
  return sent;
}

// Every timer is fake, so a drain or retry a test books never fires on its
// own after the test, when `fetch` is no longer stubbed.
beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup(plan: 'free' | 'hobby' | 'commercial' = 'commercial') {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      raceStartAt: START + 24 * HOUR,
      predictionLockAt: START + 24 * HOUR,
      status: 'upcoming',
      createdAt: START,
      updatedAt: START,
    });
  });
  await t.mutation(internal.newsApi.createKey, { label: 'test', plan });
  const [key] = await t.query(internal.newsApi.listKeys, {});
  return { t, keyId: key!.id };
}

async function withEndpoint() {
  const { t, keyId } = await setup();
  const endpoint = await t.mutation(internal.newsApiWebhooks.createWebhook, {
    keyId,
    url: ENDPOINT,
  });
  return { t, keyId, endpoint };
}

function story(key: string, headline = `Headline for ${key}`) {
  return {
    raceSlug: 'test-2026',
    key,
    headline,
    body: `The body of the story filed as ${key}.`,
    category: 'general' as const,
    affectsSessions: [],
    sourceName: 'Formula 1',
    sourceUrl: `https://example.com/${key}`,
  };
}

/** Move the clock past the settle window, then run one delivery. */
async function deliverLater(
  t: ReturnType<typeof convexTest>,
  endpointId: Id<'newsApiWebhooks'>,
  ms = 10_000,
) {
  vi.setSystemTime(Date.now() + ms);
  await t.action(internal.newsApiWebhooks.deliver, { endpointId });
}

async function endpointRow(
  t: ReturnType<typeof convexTest>,
  id: Id<'newsApiWebhooks'>,
) {
  return await t.run((ctx) => ctx.db.get(id));
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** The recipe `docs/news-api.md` gives a consumer. */
async function verifies(sent: Sent, secret: string) {
  const header = sent.headers['gpp-signature']!;
  const parts = header.split(',').map((part) => part.split('='));
  const timestamp = parts.find(([name]) => name === 't')![1];
  const expected = await hmacHex(secret, `${timestamp}.${sent.body}`);
  return parts.some(([name, value]) => name === 'v1' && value === expected);
}

function events(sent: Sent) {
  return (
    JSON.parse(sent.body) as {
      events: { id: string; type: string; data: { key: string } }[];
    }
  ).events;
}

describe('news API webhooks: delivery', () => {
  it('delivers a publish, a correction and a retraction, signed', async () => {
    const { t, endpoint } = await withEndpoint();
    const sent = stubFetch(200);

    await t.mutation(internal.raceNews.publish, story('penalty'));
    await deliverLater(t, endpoint.id);
    vi.setSystemTime(Date.now() + 1_000);
    await t.mutation(
      internal.raceNews.publish,
      story('penalty', 'Corrected headline'),
    );
    await deliverLater(t, endpoint.id);
    vi.setSystemTime(Date.now() + 1_000);
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'test-2026',
      key: 'penalty',
    });
    await deliverLater(t, endpoint.id);

    expect(sent).toHaveLength(3);
    expect(sent.map((one) => events(one).map((event) => event.type))).toEqual([
      ['news.published'],
      ['news.updated'],
      ['news.retracted'],
    ]);
    expect(events(sent[1]!)[0]!.data).toMatchObject({
      headline: 'Corrected headline',
      status: 'published',
    });
    expect(events(sent[2]!)[0]!.data).toEqual(
      expect.objectContaining({ key: 'penalty', status: 'retracted' }),
    );
    for (const one of sent) {
      expect(one.url).toBe(ENDPOINT);
      expect(await verifies(one, endpoint.secret)).toBe(true);
      expect(await verifies(one, 'whsec_wrong')).toBe(false);
    }
    // One id per version: three changes, three ids.
    expect(new Set(sent.map((one) => events(one)[0]!.id)).size).toBe(3);

    // Nothing new, nothing sent.
    await deliverLater(t, endpoint.id);
    expect(sent).toHaveLength(3);
  });

  it('runs from the publish to the POST through the scheduled drain', async () => {
    const { t, endpoint } = await withEndpoint();
    const sent = stubFetch(204);
    await t.mutation(internal.raceNews.publish, story('scheduled'));
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(sent).toHaveLength(1);
    expect(events(sent[0]!)[0]).toMatchObject({
      type: 'news.published',
      data: { key: 'scheduled' },
    });
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      consecutiveFailures: 0,
      lastStatus: 204,
      lastSuccessAt: expect.any(Number),
    });
  });

  it('does not report a republish that changes nothing served', async () => {
    const { t, endpoint } = await withEndpoint();
    const sent = stubFetch(200);
    await t.mutation(internal.raceNews.publish, story('same'));
    await deliverLater(t, endpoint.id);
    vi.setSystemTime(Date.now() + 1_000);
    // Off the feed only: the API serves nothing that changed.
    await t.mutation(internal.raceNews.publish, {
      ...story('same'),
      feedSelected: false,
    });
    await deliverLater(t, endpoint.id);
    expect(sent).toHaveLength(1);
  });

  it('keeps the cursor on a failure and resends the same event id', async () => {
    const { t, endpoint } = await withEndpoint();
    const sent = stubFetch(500, 200);
    await t.mutation(internal.raceNews.publish, story('retried'));
    await deliverLater(t, endpoint.id);

    const failed = await endpointRow(t, endpoint.id);
    expect(failed).toMatchObject({
      consecutiveFailures: 1,
      lastStatus: 500,
      lastError: 'The endpoint answered 500.',
    });
    expect(failed!.nextAttemptAt).toBe(Date.now() + 60_000);

    // Not due yet: nothing is sent.
    await deliverLater(t, endpoint.id, 1_000);
    expect(sent).toHaveLength(1);

    await deliverLater(t, endpoint.id, 60_000);
    expect(sent).toHaveLength(2);
    expect(events(sent[1]!)[0]!.id).toBe(events(sent[0]!)[0]!.id);
    expect(sent[1]!.body).toBe(sent[0]!.body);
    const recovered = await endpointRow(t, endpoint.id);
    expect(recovered).toMatchObject({
      consecutiveFailures: 0,
      lastStatus: 200,
    });
    expect(recovered!.cursor).not.toBe(failed!.cursor);
  });

  it('treats a redirect and a network error as failures', async () => {
    const { t, endpoint } = await withEndpoint();
    stubFetch(301);
    await t.mutation(internal.raceNews.publish, story('moved'));
    await deliverLater(t, endpoint.id);
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      consecutiveFailures: 1,
      lastError: 'The endpoint redirected. Redirects are not followed.',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('connection refused')),
    );
    await deliverLater(t, endpoint.id, 61_000);
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      consecutiveFailures: 2,
      lastError: 'connection refused',
    });
  });

  it('disables an endpoint after eight failures in a row, until it is switched on', async () => {
    const { t, endpoint } = await withEndpoint();
    const sent = stubFetch(503);
    await t.mutation(internal.raceNews.publish, story('down'));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await deliverLater(t, endpoint.id, 25 * HOUR);
    }
    expect(sent).toHaveLength(8);
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      active: false,
      disabledReason: 'failures',
      consecutiveFailures: 8,
    });
    await deliverLater(t, endpoint.id, 25 * HOUR);
    expect(sent).toHaveLength(8);

    stubFetch(200);
    await t.mutation(internal.newsApiWebhooks.setWebhookActive, {
      id: endpoint.id,
      active: true,
    });
    const sentAfter = stubFetch(200);
    await deliverLater(t, endpoint.id);
    // Resumes where it stopped: the story it never delivered.
    expect(sentAfter.map((one) => events(one)[0]!.data.key)).toEqual(['down']);
  });

  it('skips the endpoint of a revoked key', async () => {
    const { t, keyId, endpoint } = await withEndpoint();
    const sent = stubFetch(200);
    await t.mutation(internal.newsApi.revokeKey, { id: keyId });
    await t.mutation(internal.raceNews.publish, story('unseen'));
    await deliverLater(t, endpoint.id);
    expect(sent).toHaveLength(0);
    const [listed] = await t.query(internal.newsApiWebhooks.listWebhooks, {});
    expect(listed).toMatchObject({
      active: true,
      receiving: false,
      keyProblem: 'That key is revoked.',
    });
    expect(await t.mutation(internal.newsApiWebhooks.drain, {})).toBe(0);
  });
});

describe('news API webhooks: operator functions', () => {
  it('lets only a commercial key have an endpoint', async () => {
    for (const plan of ['free', 'hobby'] as const) {
      const { t, keyId } = await setup(plan);
      await expect(
        t.mutation(internal.newsApiWebhooks.createWebhook, {
          keyId,
          url: ENDPOINT,
        }),
      ).rejects.toThrow(
        `Webhooks come with the commercial plan. This key is on ${plan}.`,
      );
    }
  });

  it('stops a key moved off commercial from receiving', async () => {
    const { t, keyId, endpoint } = await withEndpoint();
    const sent = stubFetch(200);
    await t.mutation(internal.newsApi.setKeyPlan, { id: keyId, plan: 'hobby' });
    await t.mutation(internal.raceNews.publish, story('downgraded'));
    await deliverLater(t, endpoint.id);
    expect(sent).toHaveLength(0);
  });

  it('shows the secret once, signs with both secrets while a rotation overlaps', async () => {
    const { t, endpoint } = await withEndpoint();
    expect(endpoint.secret).toMatch(/^whsec_[A-Za-z0-9]{40}$/);
    const listed = await t.query(internal.newsApiWebhooks.listWebhooks, {});
    expect(JSON.stringify(listed)).not.toContain(endpoint.secret);

    const { secret } = await t.mutation(
      internal.newsApiWebhooks.rotateWebhookSecret,
      { id: endpoint.id },
    );
    const sent = stubFetch(200);
    const outcome = await t.action(internal.newsApiWebhooks.sendTestEvent, {
      id: endpoint.id,
    });
    expect(outcome).toEqual({ ok: true, status: 200 });
    expect(events(sent[0]!)[0]).toMatchObject({ type: 'webhook.test' });
    expect(await verifies(sent[0]!, secret)).toBe(true);
    expect(await verifies(sent[0]!, endpoint.secret)).toBe(true);

    vi.setSystemTime(Date.now() + 25 * HOUR);
    await t.action(internal.newsApiWebhooks.sendTestEvent, { id: endpoint.id });
    expect(await verifies(sent[1]!, secret)).toBe(true);
    expect(await verifies(sent[1]!, endpoint.secret)).toBe(false);
    // A test changes nothing about delivery.
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      consecutiveFailures: 0,
    });
  });

  it('caps endpoints per key, refuses a repeat URL, disables and deletes', async () => {
    const { t, keyId, endpoint } = await withEndpoint();
    await expect(
      t.mutation(internal.newsApiWebhooks.createWebhook, {
        keyId,
        url: ENDPOINT,
      }),
    ).rejects.toThrow('This key already has an endpoint at that URL.');
    for (const path of ['two', 'three']) {
      await t.mutation(internal.newsApiWebhooks.createWebhook, {
        keyId,
        url: `https://hooks.example.com/${path}`,
      });
    }
    await expect(
      t.mutation(internal.newsApiWebhooks.createWebhook, {
        keyId,
        url: 'https://hooks.example.com/four',
      }),
    ).rejects.toThrow('A key can have 3 endpoints. Delete one first.');

    await t.mutation(internal.newsApiWebhooks.setWebhookActive, {
      id: endpoint.id,
      active: false,
    });
    expect(await endpointRow(t, endpoint.id)).toMatchObject({
      active: false,
      disabledReason: 'operator',
    });
    await t.mutation(internal.newsApiWebhooks.deleteWebhook, {
      id: endpoint.id,
    });
    expect(await endpointRow(t, endpoint.id)).toBeNull();
  });
});

describe('news API webhooks: URL safety', () => {
  it('accepts a public https hostname on the standard port', () => {
    expect(webhookUrlProblem('https://hooks.example.com/f1?x=1')).toBeNull();
    expect(webhookUrlProblem('https://api.customer.io:443/hook')).toBeNull();
  });

  it('refuses every unsafe form', () => {
    const refused: [string, string][] = [
      ['http://hooks.example.com/f1', 'The URL must start with https://.'],
      ['ftp://hooks.example.com/f1', 'The URL must start with https://.'],
      ['not a url', 'That is not a URL.'],
      [
        'https://user:pass@hooks.example.com/',
        'The URL cannot carry a username or password.',
      ],
      [
        'https://hooks.example.com:8443/',
        'The URL must use the standard https port.',
      ],
      ['https://127.0.0.1/', 'Use a hostname, not an IP address.'],
      ['https://10.0.0.5/', 'Use a hostname, not an IP address.'],
      ['https://192.168.1.1/', 'Use a hostname, not an IP address.'],
      [
        'https://169.254.169.254/latest/meta-data',
        'Use a hostname, not an IP address.',
      ],
      ['https://8.8.8.8/', 'Use a hostname, not an IP address.'],
      ['https://2130706433/', 'Use a hostname, not an IP address.'],
      ['https://0x7f.1/', 'Use a hostname, not an IP address.'],
      ['https://[::1]/', 'Use a hostname, not an IP address.'],
      ['https://[::ffff:127.0.0.1]/', 'Use a hostname, not an IP address.'],
      ['https://[fd00::1]/', 'Use a hostname, not an IP address.'],
      ['https://localhost/', 'The hostname must be a public one.'],
      ['https://localhost./', 'The hostname must be a public one.'],
      ['https://api.localhost/', 'The hostname must be a public one.'],
      [
        'https://metadata.google.internal/',
        'The hostname must be a public one.',
      ],
      ['https://printer.local/', 'The hostname must be a public one.'],
      ['https://metadata/', 'The hostname must be a public one.'],
      [
        `https://example.com/${'a'.repeat(2048)}`,
        'The URL is longer than 2,048 characters.',
      ],
    ];
    for (const [url, problem] of refused) {
      expect([url, webhookUrlProblem(url)]).toEqual([url, problem]);
    }
  });

  it('refuses an unsafe URL at creation', async () => {
    const { t, keyId } = await setup();
    await expect(
      t.mutation(internal.newsApiWebhooks.createWebhook, {
        keyId,
        url: 'https://169.254.169.254/',
      }),
    ).rejects.toThrow('Use a hostname, not an IP address.');
  });
});
