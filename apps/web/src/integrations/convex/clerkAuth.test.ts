import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchClerkAccessToken } from './clerkAuth';

const captureMessage = vi.fn();
vi.mock('@sentry/tanstackstart-react', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

/**
 * The behaviour that matters here is what happens when Clerk does not answer
 * at all. Convex awaits this function with its WebSocket paused, so a promise
 * that never settles stops every query on the page, not just authenticated
 * ones -- which is exactly how a single hung `?debug=skip_cache` request left
 * CI staring at a loader for thirty seconds.
 */
const options = { forceRefreshToken: true, useSessionToken: false };

function never() {
  return new Promise<string | null>(() => {});
}

describe('fetchClerkAccessToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    captureMessage.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the token when Clerk answers', async () => {
    const getToken = vi.fn().mockResolvedValue('tok');

    await expect(fetchClerkAccessToken(getToken, options)).resolves.toBe('tok');
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('asks for the convex template unless the session is already convex-scoped', async () => {
    const getToken = vi.fn().mockResolvedValue('tok');

    await fetchClerkAccessToken(getToken, options);
    expect(getToken).toHaveBeenCalledWith({
      template: 'convex',
      skipCache: true,
    });

    getToken.mockClear();
    await fetchClerkAccessToken(getToken, {
      ...options,
      useSessionToken: true,
    });
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  // The regression. Attempt one never settles; without a deadline this call
  // never returns and Convex never resumes its socket.
  it('retries a hung fetch instead of waiting on it forever', async () => {
    const getToken = vi
      .fn()
      .mockImplementationOnce(never)
      .mockResolvedValueOnce('tok');

    const result = fetchClerkAccessToken(getToken, options);
    await vi.advanceTimersByTimeAsync(8_000);

    await expect(result).resolves.toBe('tok');
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('gives up and reports once every attempt hangs', async () => {
    const getToken = vi.fn().mockImplementation(never);

    const result = fetchClerkAccessToken(getToken, options);
    await vi.advanceTimersByTimeAsync(8_000 * 3);

    await expect(result).resolves.toBeNull();
    expect(getToken).toHaveBeenCalledTimes(3);
    // Two recovered-and-retried warnings, then the one that gave up.
    expect(captureMessage).toHaveBeenCalledTimes(3);
    const levels = captureMessage.mock.calls.map(
      (call) => (call[1] as { level: string }).level,
    );
    expect(levels).toEqual(['warning', 'warning', 'error']);
  });

  it('does not retry a rejection, which is Clerk answering', async () => {
    const getToken = vi.fn().mockRejectedValue(new Error('no session'));

    await expect(fetchClerkAccessToken(getToken, options)).resolves.toBeNull();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(captureMessage).not.toHaveBeenCalled();
  });
});
