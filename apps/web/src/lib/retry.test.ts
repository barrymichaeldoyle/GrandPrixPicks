import { describe, expect, it, vi } from 'vitest';

import { isTransientNetworkError, withRetry } from './retry';

describe('isTransientNetworkError', () => {
  it('matches the network TypeErrors mobile browsers throw', () => {
    expect(isTransientNetworkError(new TypeError('Load failed'))).toBe(true);
    expect(isTransientNetworkError(new TypeError('Failed to fetch'))).toBe(
      true,
    );
    expect(
      isTransientNetworkError(new TypeError('Network connection lost')),
    ).toBe(true);
  });

  it('ignores application errors and non-errors', () => {
    expect(isTransientNetworkError(new Error('Load failed'))).toBe(false);
    expect(isTransientNetworkError(new TypeError('x is not a function'))).toBe(
      false,
    );
    expect(isTransientNetworkError('Load failed')).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns immediately on success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce('recovered');
    await expect(withRetry(fn, { delayMs: 0 })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    await expect(withRetry(fn, { retries: 2, delayMs: 0 })).rejects.toThrow(
      'Load failed',
    );
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry non-transient errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(fn, { delayMs: 0 })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
