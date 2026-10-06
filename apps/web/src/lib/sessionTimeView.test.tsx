import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureAnalyticsEvent } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: vi.fn() }));

const STORAGE_KEY = 'gpp:session-time-view';
const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TRACK_ZONE = DEVICE_ZONE === 'Asia/Tokyo' ? 'UTC' : 'Asia/Tokyo';

let useSessionTimeView: typeof import('./sessionTimeView').useSessionTimeView;
let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(async () => {
  // A fresh module models a new visit while retaining the browser's storage.
  vi.resetModules();
  ({ useSessionTimeView } = await import('./sessionTimeView'));
  localStorage.removeItem(STORAGE_KEY);
  vi.mocked(captureAnalyticsEvent).mockClear();
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
  localStorage.removeItem(STORAGE_KEY);
});

function TimeView({ timeZone = TRACK_ZONE }: { timeZone?: string }) {
  const { activeTimeZone, setInViewerTime } = useSessionTimeView(timeZone);
  return (
    <div>
      <output>{activeTimeZone}</output>
      <button onClick={() => setInViewerTime(false)}>Track</button>
      <button onClick={() => setInViewerTime(true)}>Viewer</button>
    </div>
  );
}

function render(node = <TimeView />) {
  root = createRoot(container);
  act(() => root!.render(node));
}

function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label,
  );
  expect(button).toBeDefined();
  act(() => button!.click());
}

function zones() {
  return [...container.querySelectorAll('output')].map(
    (output) => output.textContent,
  );
}

describe('useSessionTimeView', () => {
  it.each([null, 'viewer', 'invalid'])(
    'defaults to viewer time for %s',
    (saved) => {
      if (saved !== null) {
        localStorage.setItem(STORAGE_KEY, saved);
      }
      render();
      expect(zones()).toEqual([DEVICE_ZONE]);
      expect(captureAnalyticsEvent).not.toHaveBeenCalled();
    },
  );

  it('restores saved track time without recording a toggle', () => {
    localStorage.setItem(STORAGE_KEY, 'track');
    render();
    expect(zones()).toEqual([TRACK_ZONE]);
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });

  it.each(['Track', 'Viewer'])(
    'restores the %s choice on a fresh visit',
    async (choice) => {
      render();
      click('Track');
      if (choice === 'Viewer') {
        click('Viewer');
      }
      const expectedZone = choice === 'Track' ? TRACK_ZONE : DEVICE_ZONE;
      expect(zones()).toEqual([expectedZone]);

      act(() => root!.unmount());
      root = null;
      vi.resetModules();
      ({ useSessionTimeView } = await import('./sessionTimeView'));
      vi.mocked(captureAnalyticsEvent).mockClear();
      render();
      expect(zones()).toEqual([expectedZone]);
      expect(captureAnalyticsEvent).not.toHaveBeenCalled();
    },
  );

  it('updates every consumer and captures only changes to the choice', () => {
    render(
      <>
        <TimeView />
        <TimeView />
      </>,
    );
    expect(zones()).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
    click('Viewer');
    click('Track');
    expect(zones()).toEqual([TRACK_ZONE, TRACK_ZONE]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('track');
    click('Track');
    click('Viewer');
    expect(zones()).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('viewer');
    expect(vi.mocked(captureAnalyticsEvent).mock.calls).toEqual([
      ['session_time_view_changed', { view: 'track' }],
      ['session_time_view_changed', { view: 'viewer' }],
    ]);
  });

  it('still switches all consumers when storage is blocked', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    render(
      <>
        <TimeView />
        <TimeView />
      </>,
    );
    expect(zones()).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
    click('Track');
    expect(zones()).toEqual([TRACK_ZONE, TRACK_ZONE]);
    click('Viewer');
    expect(zones()).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
  });

  it('follows choices from other tabs without recording a local toggle', () => {
    render(
      <>
        <TimeView />
        <TimeView />
      </>,
    );
    act(() => {
      localStorage.setItem(STORAGE_KEY, 'track');
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'track' }),
      );
    });
    expect(zones()).toEqual([TRACK_ZONE, TRACK_ZONE]);
    act(() => {
      localStorage.setItem(STORAGE_KEY, 'viewer');
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'viewer' }),
      );
    });
    expect(zones()).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('falls back to the default when another tab clears storage', () => {
    localStorage.setItem(STORAGE_KEY, 'track');
    render();
    expect(zones()).toEqual([TRACK_ZONE]);
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(zones()).toEqual([DEVICE_ZONE]);
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('uses track time when the viewer is in the circuit timezone', () => {
    render(<TimeView timeZone={DEVICE_ZONE} />);
    expect(zones()).toEqual([DEVICE_ZONE]);
  });

  it('server-renders track time without reading storage, even after client use', () => {
    render();
    expect(zones()).toEqual([DEVICE_ZONE]);
    const readStorage = vi.spyOn(localStorage, 'getItem');
    const html = renderToString(<TimeView />);
    expect(html).toContain(`<output>${TRACK_ZONE}</output>`);
    expect(readStorage).not.toHaveBeenCalled();
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });
});
