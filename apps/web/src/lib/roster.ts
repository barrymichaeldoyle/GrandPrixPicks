import type { Doc, Id } from '@convex-generated/dataModel';

/**
 * A driver as `drivers.listDrivers` returns them: the team they drove for in
 * the round that was asked about, plus whether they were racing it at all.
 *
 * `racing` is optional so a component can still be handed a plain driver
 * document (SSR-seeded data, Storybook fixtures) without pretending to know;
 * `isRacing` treats that as racing, which is the safe reading.
 */
export type RosterDriver = Doc<'drivers'> & {
  team?: string | null;
  racing?: boolean;
};

/** Whether this driver is in a car for the round the roster was built for. */
export function isRacing(driver: RosterDriver): boolean {
  return driver.racing !== false;
}

/**
 * The drivers offerable as picks. Any list that came back with
 * `includeNotRacing` must go through this before it is shown as a pool, or a
 * driver who lost their seat becomes pickable again.
 */
export function pickPool<T extends RosterDriver>(drivers: readonly T[]): T[] {
  return drivers.filter(isRacing);
}

/**
 * Resolve saved picks in order, keeping every one of them.
 *
 * A pick is never dropped for naming a driver who is no longer racing: five
 * saved picks must render as five slots, one of them flagged, rather than
 * silently becoming four. Only an id with no driver record at all (which
 * should not happen, since drivers are never deleted) is skipped.
 */
export function resolvePicks<T extends RosterDriver>(
  picks: readonly Id<'drivers'>[],
  drivers: readonly T[],
): T[] {
  return picks
    .map((id) => drivers.find((driver) => driver._id === id))
    .filter((driver): driver is T => driver !== undefined);
}
