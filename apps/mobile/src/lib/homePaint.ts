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
  return input.discoveryPending || input.weatherPending;
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
