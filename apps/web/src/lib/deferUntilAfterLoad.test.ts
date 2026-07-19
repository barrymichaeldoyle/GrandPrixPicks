import { afterEach, describe, expect, it, vi } from 'vitest';

import { deferUntilAfterLoad } from './deferUntilAfterLoad';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('deferUntilAfterLoad', () => {
  it('waits for page load before scheduling idle work', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const requestIdleCallback = vi.fn<
      (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    >(() => 42);
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);
    const callback = vi.fn();

    const cleanup = deferUntilAfterLoad(callback);

    expect(requestIdleCallback).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(requestIdleCallback).toHaveBeenCalledOnce();

    const scheduledCallback = requestIdleCallback.mock.calls[0]?.[0];
    scheduledCallback?.({ didTimeout: false, timeRemaining: () => 10 });
    expect(callback).toHaveBeenCalledOnce();

    cleanup();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });

  it('schedules immediately when the page has already loaded', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const requestIdleCallback = vi.fn<
      (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    >(() => 7);
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    deferUntilAfterLoad(vi.fn());

    expect(requestIdleCallback).toHaveBeenCalledOnce();
  });
});
