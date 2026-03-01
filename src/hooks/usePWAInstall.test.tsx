import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePWAInstall } from './usePWAInstall';

interface BeforeInstallPromptEventStub extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createBeforeInstallPromptEvent(
  outcome: 'accepted' | 'dismissed' = 'dismissed',
) {
  const event = new Event(
    'beforeinstallprompt',
  ) as BeforeInstallPromptEventStub;
  event.prompt = vi.fn(() => Promise.resolve(undefined));
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setupMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches }),
  });
}

function setupUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
}

function setupIOSPlatform({
  platform = 'iPhone',
  maxTouchPoints = 5,
}: {
  platform?: string;
  maxTouchPoints?: number;
} = {}) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });
}

function renderUsePWAInstall() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let latest: ReturnType<typeof usePWAInstall> | null = null;

  function TestHarness() {
    latest = usePWAInstall();
    return null;
  }

  act(() => {
    root.render(<TestHarness />);
  });

  return {
    getLatest: () => latest,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    localStorage.clear();
    setupMatchMedia(false);
    setupIOSPlatform({ platform: 'MacIntel', maxTouchPoints: 0 });
    setupUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the banner after beforeinstallprompt is received', () => {
    const { getLatest, unmount } = renderUsePWAInstall();
    expect(getLatest()?.showBanner).toBe(false);

    const promptEvent = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(getLatest()?.showBanner).toBe(true);
    unmount();
  });

  it('records dismissal and hides banner when install prompt is dismissed', async () => {
    const { getLatest, unmount } = renderUsePWAInstall();
    const promptEvent = createBeforeInstallPromptEvent('dismissed');
    act(() => {
      window.dispatchEvent(promptEvent);
    });
    expect(getLatest()?.showBanner).toBe(true);

    await act(async () => {
      await getLatest()?.install();
    });

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
    expect(getLatest()?.isInstalling).toBe(false);
    expect(getLatest()?.showBanner).toBe(false);
    const stored = localStorage.getItem(DISMISSED_KEY);
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(Date.now());
    unmount();
  });

  it('sets and clears installing state while waiting for user choice', async () => {
    const { getLatest, unmount } = renderUsePWAInstall();
    const deferredChoice = createDeferred<{
      outcome: 'accepted' | 'dismissed';
    }>();
    const promptEvent = createBeforeInstallPromptEvent();
    promptEvent.userChoice = deferredChoice.promise;

    act(() => {
      window.dispatchEvent(promptEvent);
    });
    expect(getLatest()?.showBanner).toBe(true);

    let installPromise: Promise<void> | undefined;
    await act(async () => {
      installPromise = getLatest()?.install();
      await Promise.resolve();
    });
    expect(getLatest()?.isInstalling).toBe(true);

    await act(async () => {
      deferredChoice.resolve({ outcome: 'accepted' });
      await installPromise;
    });

    expect(getLatest()?.isInstalling).toBe(false);
    unmount();
  });

  it('marks installed on appinstalled and removes event listeners on cleanup', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { getLatest, unmount } = renderUsePWAInstall();

    expect(getLatest()?.showBanner).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(getLatest()?.showBanner).toBe(false);

    unmount();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function),
    );
  });

  it('shows manual install instructions for iOS Safari', () => {
    setupIOSPlatform({ platform: 'iPhone', maxTouchPoints: 5 });
    setupUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    );

    const { getLatest, unmount } = renderUsePWAInstall();

    expect(getLatest()?.showBanner).toBe(true);
    expect(getLatest()?.isIOSSafari).toBe(true);
    expect(getLatest()?.isIOSNonSafari).toBe(false);

    unmount();
  });

  it('shows open-in-safari guidance for iOS non-Safari browsers', () => {
    setupIOSPlatform({ platform: 'iPhone', maxTouchPoints: 5 });
    setupUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1',
    );

    const { getLatest, unmount } = renderUsePWAInstall();

    expect(getLatest()?.showBanner).toBe(true);
    expect(getLatest()?.isIOSSafari).toBe(false);
    expect(getLatest()?.isIOSNonSafari).toBe(true);

    unmount();
  });
});
