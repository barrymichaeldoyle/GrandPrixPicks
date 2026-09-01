import { afterEach, describe, expect, it, vi } from 'vitest';

const originalUsername = process.env.OPEN_F1_USERNAME;
const originalPassword = process.env.OPEN_F1_PASSWORD;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  process.env.OPEN_F1_USERNAME = originalUsername;
  process.env.OPEN_F1_PASSWORD = originalPassword;
});

async function loadAuthenticatedModule() {
  process.env.OPEN_F1_USERNAME = 'paid@example.com';
  process.env.OPEN_F1_PASSWORD = 'secret';
  return await import('./openF1Results');
}

describe('OpenF1 paid access', () => {
  it('exchanges credentials and adds the bearer token to API requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'paid-token', expires_in: '3600' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ session_key: 1 }]), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchJson } = await loadAuthenticatedModule();

    await fetchJson(new URL('https://api.openf1.org/v1/sessions'));

    const tokenRequest = fetchMock.mock.calls[0];
    expect(tokenRequest?.[0]).toBe('https://api.openf1.org/token');
    const tokenBody = tokenRequest?.[1]?.body;
    expect(typeof tokenBody).toBe('string');
    const tokenParams = new URLSearchParams(tokenBody as string);
    expect(tokenParams.get('username')).toBe('paid@example.com');
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization'),
    ).toBe('Bearer paid-token');
  });

  it('refreshes the token once after an authenticated 401', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'old', expires_in: 3600 }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response('expired', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'new', expires_in: 3600 }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchJson } = await loadAuthenticatedModule();

    await expect(
      fetchJson(new URL('https://api.openf1.org/v1/position')),
    ).resolves.toEqual([]);
    expect(
      new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get('Authorization'),
    ).toBe('Bearer new');
  });

  it('falls back to an anonymous API request when token exchange fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('billing unavailable', { status: 503 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fetchJson } = await loadAuthenticatedModule();

    await expect(
      fetchJson(new URL('https://api.openf1.org/v1/session_result')),
    ).resolves.toEqual([]);
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).has('Authorization'),
    ).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('authentication unavailable'),
    );
  });
});
