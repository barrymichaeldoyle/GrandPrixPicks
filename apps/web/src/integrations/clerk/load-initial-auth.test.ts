import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchInitialAuth } from './initial-auth';
import { loadInitialAuth } from './load-initial-auth';
import { hasClerkSessionCookie } from './session-cookie';

vi.mock('./initial-auth', () => ({ fetchInitialAuth: vi.fn() }));
vi.mock('./session-cookie', () => ({ hasClerkSessionCookie: vi.fn() }));

const fetchMock = vi.mocked(fetchInitialAuth);
const cookieMock = vi.mocked(hasClerkSessionCookie);

afterEach(() => vi.resetAllMocks());

describe('loadInitialAuth', () => {
  it('returns the server answer when the request goes through', async () => {
    fetchMock.mockResolvedValue({
      isSignedIn: true,
      sessionCookieName: '__client_uat_abc',
    });

    await expect(loadInitialAuth()).resolves.toEqual({
      isSignedIn: true,
      sessionCookieName: '__client_uat_abc',
    });
  });

  it('retries a dropped request once', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ isSignedIn: false, sessionCookieName: null });

    await expect(loadInitialAuth()).resolves.toEqual({
      isSignedIn: false,
      sessionCookieName: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('answers from the session cookie instead of throwing when offline', async () => {
    // A rejection here used to replace every page with the fatal fallback.
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    cookieMock.mockReturnValue(true);

    await expect(loadInitialAuth()).resolves.toMatchObject({
      isSignedIn: true,
    });
  });
});
