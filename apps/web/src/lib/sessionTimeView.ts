import { useSyncExternalStore } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * Track time vs the viewer's zone, shared by the write-up schedule and the
 * practice countdown sitting under it.
 *
 * The preference lives in this module rather than in either card so flipping
 * the toggle on the schedule re-reads the countdown without a second control.
 * Cached HTML uses track time; after hydration the browser defaults to the
 * viewer's zone and restores their choice from localStorage.
 */

const STORAGE_KEY = 'gpp:session-time-view';
let preferViewerTime = true;
const listeners = new Set<() => void>();

function subscribePreferViewerTime(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  }
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function readPreferViewerTime() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'track' || saved === 'viewer') {
      return saved === 'viewer';
    }
  } catch {
    // A blocked storage API still allows the choice for this page load.
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
    window.localStorage.setItem(STORAGE_KEY, value ? 'viewer' : 'track');
  } catch {
    // Keep the in-memory choice when storage is unavailable.
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
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || UNKNOWN_ZONE;
  } catch {
    return UNKNOWN_ZONE;
  }
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

/** Test isolation: the preference is process-global. */
export function resetSessionTimeView() {
  preferViewerTime = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Test isolation also works without storage.
  }
  for (const listener of listeners) {
    listener();
  }
}
