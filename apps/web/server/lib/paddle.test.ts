import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { grantSeasonPassFromWebhook } from './paddle';

function completed(overrides: {
  season?: number;
  priceId?: string;
}): Parameters<typeof grantSeasonPassFromWebhook>[0] {
  return {
    event_id: 'evt_1',
    event_type: 'transaction.completed',
    data: {
      id: 'txn_1',
      custom_data: { clerkUserId: 'user_1', season: overrides.season ?? 2026 },
      items: [{ price: { id: overrides.priceId ?? 'pri_pass' } }],
    },
  };
}

describe('grantSeasonPassFromWebhook', () => {
  beforeEach(() => {
    vi.stubEnv('PADDLE_SEASON_PASS_PRICE_ID', 'pri_pass');
    // Unset, so a case that got past the checks would throw rather than call
    // Convex: both rejections below must return before that.
    vi.stubEnv('VITE_CONVEX_URL', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses a season that is not on sale', async () => {
    await expect(
      grantSeasonPassFromWebhook(completed({ season: 2031 })),
    ).resolves.toEqual({ handled: false, reason: 'season_not_sellable' });
  });

  it('refuses a transaction for another price', async () => {
    await expect(
      grantSeasonPassFromWebhook(completed({ priceId: 'pri_other' })),
    ).resolves.toEqual({ handled: false, reason: 'not_season_pass_price' });
  });

  it('lets the season pass price through to the grant', async () => {
    await expect(grantSeasonPassFromWebhook(completed({}))).rejects.toThrow(
      'Missing VITE_CONVEX_URL',
    );
  });
});
