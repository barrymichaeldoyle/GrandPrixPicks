import type { BakuCrash, BakuSession } from '@/lib/bakuCrashes';
import { BAKU_DRIVER_NAMES } from '@/lib/bakuCrashes';

/**
 * The derivations behind the Baku crash map, kept apart from the component so
 * the arithmetic can be tested without rendering an SVG.
 *
 * One rule shapes all of it: **every visual channel reads from the same
 * filtered array**. Marker size, ribbon shading and the tally all encode the
 * same number, so if the markers hid while the shading kept its all-sessions
 * heat the map would contradict itself under a filter.
 */

/** The filter buckets, which are the sessions of a race weekend. */
export type BakuFilter = 'all' | 'practice' | 'qualifying' | 'race';

export const BAKU_FILTERS: readonly {
  value: BakuFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'practice', label: 'Practice' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'race', label: 'Race' },
];

/**
 * Sprint sessions fold into the neighbouring bucket rather than getting one of
 * their own: Baku has held a single sprint weekend, in 2023, and 2026 is not
 * one, so a Sprint filter would be a near-empty tab for a format that is not
 * running. The incident itself still says "Sprint",
 * because a filter bucket and a fact are different things.
 */
export function bucketOf(session: BakuSession): Exclude<BakuFilter, 'all'> {
  if (session === 'FP1' || session === 'FP2' || session === 'FP3') {
    return 'practice';
  }
  if (session === 'Qualifying' || session === 'SprintQualifying') {
    return 'qualifying';
  }
  return 'race';
}

export function filterCrashes(
  crashes: readonly BakuCrash[],
  filter: BakuFilter,
): readonly BakuCrash[] {
  if (filter === 'all') {
    return crashes;
  }
  return crashes.filter((crash) => bucketOf(crash.session) === filter);
}

export function countByFilter(
  crashes: readonly BakuCrash[],
  filter: BakuFilter,
): number {
  return filterCrashes(crashes, filter).length;
}

/**
 * Incidents per corner, for the corners that have any.
 *
 * Incidents with a null corner are counted nowhere here on purpose: no source
 * places them, so putting them on a corner would be inventing the one fact the
 * map exists to show. They stay in the incident list underneath.
 */
export function countsByCorner(
  crashes: readonly BakuCrash[],
): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();
  for (const crash of crashes) {
    if (crash.corner !== null) {
      counts.set(crash.corner, (counts.get(crash.corner) ?? 0) + 1);
    }
  }
  return counts;
}

/** How many incidents in the current filter have no corner to sit on. */
export function unplacedCount(crashes: readonly BakuCrash[]): number {
  return crashes.filter((crash) => crash.corner === null).length;
}

/** The five steps of the `crashHeat` ramp, quietest to loudest. */
export const HEAT_STEPS = 5;

/**
 * Which step of the sequential ramp a count lands on, scaled to the busiest
 * corner in the current filter.
 *
 * Scaling to the filtered maximum rather than a fixed ceiling keeps the ramp
 * legible when a filter leaves only two or three incidents anywhere: pinned to
 * the all-sessions maximum of eleven, every corner under the Practice filter would
 * render at the bottom step and the map would look empty rather than quiet.
 * The legend states the range it is showing, so the scale is never implied.
 */
export function heatStep(count: number, max: number): number {
  if (count <= 0) {
    return 0;
  }
  if (max <= 1) {
    return HEAT_STEPS;
  }
  const position = (count - 1) / (max - 1);
  return Math.max(1, Math.ceil(position * HEAT_STEPS));
}

export function heatColor(step: number): string {
  return step <= 0 ? 'var(--border)' : `var(--crash-heat${step})`;
}

/**
 * Marker radius in viewBox units.
 *
 * Magnitude is double-encoded, as size and as colour, which is what lets the
 * markers stay small enough not to collide in the castle section while still
 * being readable. The floor is well above the 8px minimum for a marker at
 * every rendered width.
 */
const MIN_RADIUS = 11;
const MAX_RADIUS = 30;

export function markerRadius(count: number, max: number): number {
  if (count <= 0) {
    return 0;
  }
  if (max <= 1) {
    return MAX_RADIUS;
  }
  /*
   * Area, not radius, tracks the count: a circle whose *radius* doubles looks
   * four times bigger, which would overstate a corner with twice the
   * incidents. Square-rooting the ratio makes the ink proportional instead.
   */
  const ratio = Math.sqrt((count - 1) / (max - 1));
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

/** Corners ordered for the tally: busiest first, then by corner number. */
export function rankedCorners(
  counts: ReadonlyMap<number, number>,
): readonly { corner: number; count: number }[] {
  return [...counts.entries()]
    .map(([corner, count]) => ({ corner, count }))
    .sort((a, b) => b.count - a.count || a.corner - b.corner);
}

/**
 * Incidents newest first, because a reader arriving before a race weekend is
 * looking for what happened last time before what happened in 2016.
 */
export function orderedForList(
  crashes: readonly BakuCrash[],
): readonly BakuCrash[] {
  return [...crashes].sort(
    (a, b) => b.year - a.year || (b.lap ?? 0) - (a.lap ?? 0),
  );
}

export function sessionLabel(session: BakuSession): string {
  if (session === 'SprintQualifying') {
    return 'Sprint Qualifying';
  }
  return session;
}

/**
 * The drivers in an incident, written out.
 *
 * Full names rather than the three-letter codes. The codes are right in a
 * timing column where width is the constraint, but this is prose being read
 * about something that happened, and it is the copy that ends up quoted in a
 * post, so it should read the way a person would say it.
 */
export function driversLabel(drivers: readonly string[]): string {
  if (drivers.length === 0) {
    return 'Unattributed';
  }
  const names = drivers.map(driverName);
  if (names.length === 1) {
    return names[0];
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Which dimension the panel beside the map is breaking the data down by. */
export type BakuBreakdown = 'corner' | 'driver';

/**
 * Incidents per driver, counting every car involved in a collision.
 *
 * Deliberately not filtered to the current grid. This is circuit history
 * rather than form: Ricciardo's five and Raikkonen's four are part of what
 * makes Baku Baku, and dropping everyone who has since retired would leave a
 * table that says less about the place. It is also why nothing here reads as
 * advice about who to pick, since the cars and the regulations have both
 * changed underneath these numbers.
 */
export function countsByDriver(
  crashes: readonly BakuCrash[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const crash of crashes) {
    for (const driver of crash.drivers) {
      counts.set(driver, (counts.get(driver) ?? 0) + 1);
    }
  }
  return counts;
}

/** Drivers ordered busiest first, then alphabetically for a stable tie. */
export function rankedDrivers(
  counts: ReadonlyMap<string, number>,
): readonly { driver: string; count: number }[] {
  return [...counts.entries()]
    .map(([driver, count]) => ({ driver, count }))
    .sort((a, b) => b.count - a.count || a.driver.localeCompare(b.driver));
}

export function driverName(code: string): string {
  return BAKU_DRIVER_NAMES[code] ?? code;
}

/**
 * Surname alone, which is how a Formula 1 broadcast names a driver and what
 * fits a table row. The full name still carries the modal and the screen
 * reader label, so nobody has to know that "de Vries" is Nyck.
 */
export function driverSurname(code: string): string {
  const full = BAKU_DRIVER_NAMES[code];
  if (full === undefined) {
    return code;
  }
  const [first, ...rest] = full.split(' ');
  return rest.length === 0 ? first : rest.join(' ');
}
