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
    expect(getLatest()?.showBanner).toBe(false);
    const stored = localStorage.getItem(DISMISSED_KEY);
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(Date.now());
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
});
