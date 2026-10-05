import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSessionTimeView, useSessionTimeView } from './sessionTimeView';

const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TRACK_ZONE = DEVICE_ZONE === 'Asia/Tokyo' ? 'UTC' : 'Asia/Tokyo';
const STORAGE_KEY = 'gpp:session-time-view';

function View({ trackZone = TRACK_ZONE }: { trackZone?: string }) {
  const view = useSessionTimeView(trackZone);
  return (
    <div>
      <output>{view.activeTimeZone}</output>
      {view.showToggle ? (
        <button onClick={() => view.setInViewerTime(!view.showViewerTime)}>
          {view.showViewerTime ? 'Track time' : 'My time'}
        </button>
      ) : null}
    </div>
  );
}

describe('session time preference', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetSessionTimeView();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    resetSessionTimeView();
  });

  function render() {
    act(() => root.render(<View />));
  }
  function toggle() {
    act(() => container.querySelector('button')!.click());
  }
  function zone() {
    return container.querySelector('output')!.textContent;
  }

  it('defaults to local time and persists both choices', () => {
    render();
    expect(zone()).toBe(DEVICE_ZONE);
    toggle();
    expect(zone()).toBe(TRACK_ZONE);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('track');
    toggle();
    expect(zone()).toBe(DEVICE_ZONE);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('viewer');
  });

  it('restores a track-time choice from an earlier visit', () => {
    window.localStorage.setItem(STORAGE_KEY, 'track');
    render();
    expect(zone()).toBe(TRACK_ZONE);
  });

  it('updates multiple mounted schedules and follows choices from other tabs', () => {
    act(() =>
      root.render(
        <>
          <View />
          <View />
        </>,
      ),
    );
    toggle();
    expect(
      [...container.querySelectorAll('output')].map((el) => el.textContent),
    ).toEqual([TRACK_ZONE, TRACK_ZONE]);
    act(() => {
      window.localStorage.setItem(STORAGE_KEY, 'viewer');
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'viewer' }),
      );
    });
    expect(
      [...container.querySelectorAll('output')].map((el) => el.textContent),
    ).toEqual([DEVICE_ZONE, DEVICE_ZONE]);
  });

  it('still toggles when localStorage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render();
    expect(zone()).toBe(DEVICE_ZONE);
    toggle();
    expect(zone()).toBe(TRACK_ZONE);
  });

  it('hydrates cached track time into local time without a mismatch', async () => {
    act(() => root.unmount());
    container.innerHTML = renderToString(<View />);
    expect(zone()).toBe(TRACK_ZONE);
    const onRecoverableError = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, <View />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(zone()).toBe(DEVICE_ZONE);
  });

  it('hides the toggle when the viewer is in the circuit timezone', () => {
    act(() => root.render(<View trackZone={DEVICE_ZONE} />));
    expect(zone()).toBe(DEVICE_ZONE);
    expect(container.querySelector('button')).toBeNull();
  });
});
