import { useSyncExternalStore } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * Track time vs the viewer's zone, shared by the write-up schedule and the
 * practice countdown sitting under it.
 *
 * The preference lives in this module rather than in either card so flipping
 * the toggle on the schedule re-reads the countdown without a second control.
 *
 * The server and hydration both render track time, because that is what the
 * edge-cached HTML can honestly carry (a baked-in zone would be one reader's
 * zone served to everybody). After hydration the client reads the reader's own
 * saved choice, which defaults to "My time": most readers are not in the
 * track's zone, so their own time is the one they want without a click. The
 * choice is saved to `localStorage`, so it holds across reloads and visits.
 */

const STORAGE_KEY = 'session-time-view';

/**
 * `null` until the first client read, which loads the saved choice. Keeping the
 * resolved value afterwards makes the store snapshot stable, which
 * `useSyncExternalStore` needs.
 */
let preferViewerTime: boolean | null = null;
const listeners = new Set<() => void>();

function subscribePreferViewerTime(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** The saved choice, defaulting to the viewer's own time. */
function loadPreferViewerTime(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'track') {
      return false;
    }
    if (saved === 'viewer') {
      return true;
    }
  } catch {
    // A blocked or missing store falls back to the default.
  }
  return true;
}

function readPreferViewerTime(): boolean {
  if (preferViewerTime === null) {
    preferViewerTime = loadPreferViewerTime();
  }
  return preferViewerTime;
}

function readTrackTime() {
  return false;
}

function setPreferViewerTime(value: boolean) {
  if (readPreferViewerTime() === value) {
    return;
  }
  preferViewerTime = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'viewer' : 'track');
  } catch {
    // The choice still holds for this page without a store to save it in.
  }
  captureAnalyticsEvent('session_time_view_changed', {
    view: value ? 'viewer' : 'track',
  });
  for (const listener of listeners) {
    listener();
  }
}

/**
 * The viewer's own time zone, and whether the browser has been asked yet.
 *
 * Unknown on the server and through hydration, so the markup React hydrates is
 * the markup Nitro sent: write-ups are edge-cached, and a time zone baked into
 * that HTML would be one reader's zone served to everybody.
 *
 * The three states are the reason this is not just `string | null`. A null zone
 * has two meanings that need different renders: nobody has asked yet, where the
 * toggle is drawn so the header does not change width a frame after paint, and
 * the viewer is already in the track's zone, where it is dropped because both
 * columns would read the same.
 */
function useViewerTimeZone(trackTimeZone: string): {
  resolved: boolean;
  zone: string | null;
} {
  const deviceZone = useSyncExternalStore(
    subscribeToNothing,
    readDeviceTimeZone,
    readUnknownTimeZone,
  );
  if (deviceZone === UNKNOWN_ZONE) {
    return { resolved: false, zone: null };
  }
  return {
    resolved: true,
    zone: deviceZone !== trackTimeZone ? deviceZone : null,
  };
}

/** Distinct from a real zone name, and stable so the store never re-renders. */
const UNKNOWN_ZONE = '';

function subscribeToNothing() {
  return () => {};
}

function readDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || UNKNOWN_ZONE;
}

function readUnknownTimeZone(): string {
  return UNKNOWN_ZONE;
}

export function useSessionTimeView(trackTimeZone: string): {
  activeTimeZone: string;
  showViewerTime: boolean;
  setInViewerTime: (value: boolean) => void;
  showToggle: boolean;
  viewerZone: string | null;
} {
  const viewer = useViewerTimeZone(trackTimeZone);
  const inViewerTime = useSyncExternalStore(
    subscribePreferViewerTime,
    readPreferViewerTime,
    readTrackTime,
  );
  const showViewerTime = inViewerTime && viewer.zone !== null;
  return {
    activeTimeZone: showViewerTime ? viewer.zone! : trackTimeZone,
    showViewerTime,
    setInViewerTime: setPreferViewerTime,
    showToggle: !viewer.resolved || viewer.zone !== null,
    viewerZone: viewer.zone,
  };
}

/** Test isolation: the preference is process-global and saved to localStorage. */
export function resetSessionTimeView() {
  preferViewerTime = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  for (const listener of listeners) {
    listener();
  }
}
