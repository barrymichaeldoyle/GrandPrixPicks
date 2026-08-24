import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureServerAnalyticsEvent } from '../lib/posthog';

describe('captureServerAnalyticsEvent', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('is a silent no-op without a project key', async () => {
    vi.stubEnv('POSTHOG_PROJECT_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      captureServerAnalyticsEvent({
        event: 'purchase_completed',
        distinctId: 'user_1',
      }),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a deduplicated server event without PII', async () => {
    vi.stubEnv('POSTHOG_PROJECT_KEY', 'phc_test');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      captureServerAnalyticsEvent({
        event: 'purchase_completed',
        distinctId: 'user_1',
        insertId: 'paddle_event_1',
        properties: { season: 2026 },
      }),
    ).resolves.toBe(true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      api_key: 'phc_test',
      event: 'purchase_completed',
      properties: {
        distinct_id: 'user_1',
        $insert_id: 'paddle_event_1',
        platform: 'server',
        season: 2026,
      },
    });
  });
});
