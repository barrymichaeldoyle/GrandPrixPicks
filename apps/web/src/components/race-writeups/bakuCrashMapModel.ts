import type { BakuCrash, BakuSession } from '@/lib/bakuCrashes';
import { BAKU_DRIVERS } from '@/lib/bakuCrashes';

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
  return BAKU_DRIVERS[code]?.name ?? code;
}

/**
 * Surname alone, which is how a Formula 1 broadcast names a driver and what
 * fits a table row. The full name still carries the modal and the screen
 * reader label, so nobody has to know that "de Vries" is Nyck.
 */
export function driverSurname(code: string): string {
  const full = BAKU_DRIVERS[code]?.name;
  if (full === undefined) {
    return code;
  }
  const [first, ...rest] = full.split(' ');
  return rest.length === 0 ? first : rest.join(' ');
}

/**
 * Countries in this archive that the repo ships a flag for, which is now all of
 * them.
 *
 * The guard stays even so. Without it the page requested missing flags anyway
 * and took a 404 on every view: the `Flag` component hides a broken image, so
 * nothing looked wrong, which is exactly why it would have stayed that way. The
 * next driver added from a country with no asset should carry no flag rather
 * than a silent 404.
 *
 * A literal rather than a directory read, because this runs in the browser.
 * `bakuCrashMapModel.test.ts` checks that every country listed here resolves to
 * a real file in `public/flags`, and that every driver in the archive resolves
 * to a country, so a code that is wrong or an asset that was never added fails
 * rather than silently rendering nothing.
 */
const FLAG_ASSETS = new Set([
  'ar',
  'au',
  'br',
  'ca',
  'de',
  'es',
  'fi',
  'fr',
  'gb',
  'it',
  'jp',
  'mc',
  'mx',
  'nl',
  'pl',
  'ru',
  'se',
  'th',
  'us',
]);

/**
 * ISO 3166-1 alpha-2 for a driver, or undefined when there is no code or no
 * flag to draw with it.
 */
export function driverCountry(code: string): string | undefined {
  const country = BAKU_DRIVERS[code]?.country;
  return country !== undefined && FLAG_ASSETS.has(country)
    ? country
    : undefined;
}

export type PlacedMarker = {
  corner: number;
  count: number;
  /** Where the marker is drawn, which is not always where the corner is. */
  x: number;
  y: number;
  radius: number;
};

/**
 * Nudge overlapping markers apart so every one of them can be clicked.
 *
 * Baku doubles back on itself and its castle section is a handful of corners in
 * a few metres, so several markers land on top of each other at map scale:
 * turns 5, 6 and 20 sit within 45 units, and turns 7 and 19 within nine. Drawn
 * exactly where the corner is, a bigger marker simply buries a smaller one and
 * the buried corner cannot be reached with a pointer at all.
 *
 * This is a few passes of the standard relaxation: for any pair closer than
 * their radii plus a gap, push both along the line between them. Markers move,
 * the track does not, and that is the honest way round. The lap is a measured
 * shape; the markers are already a schematic stand-in for "an incident happened
 * at this corner", so bending the circuit to make them fit would put a wrong
 * claim on the one part of the picture that is real.
 *
 * Displacement is capped so a marker stays recognisably at its corner, and the
 * tally beside the map is the exact reading either way.
 */
const RELAXATION_PASSES = 60;
const MARKER_GAP = 3;
const MAX_DISPLACEMENT = 26;

export function placeMarkers(
  markers: readonly PlacedMarker[],
): readonly PlacedMarker[] {
  const placed = markers.map((marker) => ({ ...marker }));
  const anchors = markers.map((marker) => ({ x: marker.x, y: marker.y }));

  for (let pass = 0; pass < RELAXATION_PASSES; pass += 1) {
    let moved = false;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const wanted = a.radius + b.radius + MARKER_GAP;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= wanted) {
          continue;
        }
        moved = true;
        /* Exactly coincident markers have no direction to separate along, so
           give them an arbitrary but stable one rather than dividing by zero. */
        const ux = distance === 0 ? 1 : dx / distance;
        const uy = distance === 0 ? 0 : dy / distance;
        const push = (wanted - distance) / 2;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    if (!moved) {
      break;
    }
  }

  return placed.map((marker, index) => {
    const anchor = anchors[index];
    const dx = marker.x - anchor.x;
    const dy = marker.y - anchor.y;
    const drift = Math.hypot(dx, dy);
    if (drift <= MAX_DISPLACEMENT) {
      return marker;
    }
    const scale = MAX_DISPLACEMENT / drift;
    return { ...marker, x: anchor.x + dx * scale, y: anchor.y + dy * scale };
  });
}
