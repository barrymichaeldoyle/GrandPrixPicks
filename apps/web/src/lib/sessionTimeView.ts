import { useSyncExternalStore } from 'react';

/**
 * Track time vs the viewer's zone, shared by the write-up schedule and the
 * practice countdown sitting under it.
 *
 * The preference lives in this module rather than in either card so flipping
 * the toggle on the schedule re-reads the countdown without a second control.
 * Default is track time: that is what the edge-cached HTML can honestly
 * render, and what a reader who never touches the toggle should keep seeing.
 */

let preferViewerTime = false;
const listeners = new Set<() => void>();

function subscribePreferViewerTime(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readPreferViewerTime() {
  return preferViewerTime;
}

function readTrackTime() {
  return false;
}

function setPreferViewerTime(value: boolean) {
  if (preferViewerTime === value) {
    return;
  }
  preferViewerTime = value;
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
export function useViewerTimeZone(trackTimeZone: string): {
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

/** Test isolation: the preference is process-global. */
export function resetSessionTimeView() {
  setPreferViewerTime(false);
}
