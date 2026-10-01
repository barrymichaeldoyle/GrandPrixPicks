import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = query;
  },
}));
vi.mock('../lib/sentry', () => ({ captureServerException: vi.fn() }));

const { default: handler } = await import('../routes/api/f1-store/items.get');

function call(
  query = '?page=esteban-ocon',
  headers: Record<string, string> = {},
) {
  return handler({
    req: new Request(`https://grandprixpicks.com/api/f1-store/items${query}`, {
      headers,
    }),
  });
}

describe('/api/f1-store/items', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
    query.mockResolvedValue([{ name: 'Cap' }]);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    query.mockReset();
  });

  it("reads the visitor's own catalog", async () => {
    const response = await call('?page=esteban-ocon', {
      'cf-ipcountry': 'ZA',
    });
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      page: 'esteban-ocon',
      catalogId: '6653',
      limit: 3,
    });
    expect(await response.json()).toEqual({ items: [{ name: 'Cap' }] });
  });

  it('picks the EU catalog in the browser language', async () => {
    await call('?page=esteban-ocon', {
      'cf-ipcountry': 'DE',
      'accept-language': 'de-DE,de',
    });
    expect(query.mock.calls[0][1].catalogId).toBe('6651');
  });

  it('is private, because the answer depends on the visitor', async () => {
    const response = await call();
    expect(response.headers.get('cache-control')).toContain('private');
  });

  it('answers empty for a shop with no catalog or an unknown page', async () => {
    expect(
      await (await call('?page=esteban-ocon', { 'cf-ipcountry': 'US' })).json(),
    ).toEqual({ items: [] });
    expect(await (await call('?page=..%2Fx')).json()).toEqual({ items: [] });
    expect(query).not.toHaveBeenCalled();
  });

  it('answers empty when Convex fails', async () => {
    query.mockRejectedValue(new Error('down'));
    expect(await (await call()).json()).toEqual({ items: [] });
  });
});
