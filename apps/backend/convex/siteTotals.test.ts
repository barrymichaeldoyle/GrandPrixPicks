/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

async function withUsers(count: number) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert('users', {
        clerkUserId: `user-${i}`,
        createdAt: 0,
        updatedAt: 0,
      });
    }
  });
  return t;
}

describe('reportToPostHog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('counts users and sends nothing without a project key', async () => {
    vi.stubEnv('POSTHOG_PROJECT_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const t = await withUsers(3);

    expect(await t.action(internal.siteTotals.reportToPostHog, {})).toEqual({
      sent: false,
      users: 3,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the total as one site_totals event with no person profile', async () => {
    vi.stubEnv('POSTHOG_PROJECT_KEY', 'phc_test');
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const t = await withUsers(2);

    expect(await t.action(internal.siteTotals.reportToPostHog, {})).toEqual({
      sent: true,
      users: 2,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://eu.i.posthog.com/capture/');
    expect(JSON.parse(init.body as string)).toMatchObject({
      api_key: 'phc_test',
      event: 'site_totals',
      properties: { users: 2, $process_person_profile: false },
    });
  });
});
