import { beforeEach, describe, expect, it, vi } from 'vitest';

import igHandler from '../routes/ig.get';
import instagramHandler from '../routes/instagram.get';

const queryMock = vi.fn();

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = queryMock;
  },
}));

vi.mock('@convex-generated/api', () => ({
  api: { races: { getQuickPickRace: 'races.getQuickPickRace' } },
}));

vi.mock('../lib/sentry', () => ({ captureServerException: vi.fn() }));

const CAMPAIGN = '?utm_source=instagram&utm_medium=social&utm_campaign=profile';

describe('/ig and /instagram', () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
  });

  it("lands on this weekend's write-up when it has one", async () => {
    queryMock.mockResolvedValue({ slug: 'italy-2026' });
    const response = await igHandler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `/f1-2026-italian-grand-prix-predictions${CAMPAIGN}`,
    );
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('lands on the race page when the weekend has no write-up', async () => {
    queryMock.mockResolvedValue({ slug: 'no-writeup-2026' });
    const response = await igHandler();

    expect(response.headers.get('location')).toBe(
      `/races/no-writeup-2026${CAMPAIGN}`,
    );
  });

  it('lands on the home page between seasons', async () => {
    queryMock.mockResolvedValue(null);
    const response = await igHandler();

    expect(response.headers.get('location')).toBe(`/${CAMPAIGN}`);
  });

  it('still redirects when Convex cannot be reached', async () => {
    queryMock.mockRejectedValue(new Error('network'));
    const response = await igHandler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`/${CAMPAIGN}`);
  });

  it('attributes /instagram identically to /ig', async () => {
    queryMock.mockResolvedValue({ slug: 'italy-2026' });

    expect((await instagramHandler()).headers.get('location')).toBe(
      (await igHandler()).headers.get('location'),
    );
  });
});
