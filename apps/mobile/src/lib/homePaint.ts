/**
 * First paint of Home waits until the chrome that changes height has answered.
 *
 * The feed used to show as soon as page 0 arrived, then the recap, hero,
 * weather and signed-out panel popped in as their own queries resolved — a
 * jump, not a load. Hold until those reads are defined (including null), then
 * keep the last value on screen: Convex does not go back to `undefined` while
 * offline.
 *
 * Timeouts exist so a cold start with no socket never becomes a spinner the
 * player cannot dismiss. Partial content beats a stuck loader, same ceiling
 * the web curtain uses.
 *
 * Weather is in that set when Home will actually render a forecast. A skipped
 * query still returns `undefined`, so the caller must pass an explicit
 * `weatherPending` rather than treating a skip as a load.
 */
export const HOME_PAINT_CONNECTED_TIMEOUT_MS = 8_000;
export const HOME_PAINT_DISCONNECTED_TIMEOUT_MS = 3_000;

export function homePaintIsPending(input: {
  convexEnabled: boolean;
  clerkEnabled: boolean;
  authLoaded: boolean;
  /** Clerk says signed in. */
  signedIn: boolean;
  feed: unknown;
  racesLoading: boolean;
  recap: unknown;
  weekend: unknown;
  me: unknown;
  discoveryPending: boolean;
  weatherPending: boolean;
}): boolean {
  if (!input.convexEnabled) {
    return false;
  }
  if (input.clerkEnabled && !input.authLoaded) {
    return true;
  }
  if (input.feed === undefined) {
    return true;
  }
  if (input.racesLoading) {
    return true;
  }
  if (input.recap === undefined) {
    return true;
  }
  if (input.weekend === undefined) {
    return true;
  }
  if (input.me === undefined) {
    return true;
  }
  // Clerk flips to signed in before Convex re-runs these with the new token,
  // so for a moment they still hold their signed-out answer (null). Painting
  // then put up an empty Home for two or three seconds after sign-in.
  if (input.signedIn && (input.feed === null || input.me === null)) {
    return true;
  }
  // Same race for the weekend: its first answer is the guest's, every session
  // denied with `sign_in`, which painted "locked before you picked" over a
  // player's saved picks. A real viewer's payload always has some other
  // reason (or none) on at least one session.
  if (input.signedIn && !weekendReflectsViewer(input.weekend)) {
    return true;
  }
  return input.discoveryPending || input.weatherPending;
}

function weekendReflectsViewer(weekend: unknown): boolean {
  if (!weekend || typeof weekend !== 'object' || !('sessions' in weekend)) {
    // No current weekend (null) is a real answer for anyone.
    return true;
  }
  const sessions = (weekend as { sessions: { denialReason?: string | null }[] })
    .sessions;
  return (
    sessions.length === 0 || sessions.some((s) => s.denialReason !== 'sign_in')
  );
}

export function shouldHoldHomePaint(input: {
  pending: boolean;
  timedOut: boolean;
  knownOffline: boolean;
}): boolean {
  if (!input.pending) {
    return false;
  }
  if (input.timedOut || input.knownOffline) {
    return false;
  }
  return true;
}
