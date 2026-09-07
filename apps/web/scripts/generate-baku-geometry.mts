/**
 * Generates `src/lib/bakuCircuitGeometry.ts` from the fetched circuit data.
 *
 * Run once, by hand, when the geometry needs regenerating:
 *   pnpm --filter @grandprixpicks/web generate-baku-geometry
 *
 * The source is the circuit outline that OpenF1's `circuit_info_url` points
 * at, saved under `artifacts/baku-crash-map/raw/`. It is fetched once and the
 * derived coordinates are committed, so nothing at runtime or build time calls
 * that service. Baku's layout has not changed since 2016, so the snapshot is
 * durable.
 *
 * Three transforms happen here, and each exists for a reason:
 *
 * 1. **Rotation.** The source carries a `rotation` (357 degrees for Baku) that
 *    puts the lap in the orientation people recognise from a TV graphic.
 * 2. **Simplification.** The raw trace is 837 points, which is roughly one per
 *    display pixel and pure weight in the bundle. Ramer-Douglas-Peucker cuts it
 *    to a fraction of that with no visible change to the drawn line.
 * 3. **Segmentation by nearest corner.** The map shades the track by how many
 *    incidents each corner has collected, so the ribbon has to be cut into
 *    corner-owned stretches. Assigning each point to its nearest numbered
 *    corner is a derivation from the geometry rather than an editorial guess,
 *    which matters because the shading is a factual claim about the track.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(
  HERE,
  '../../../artifacts/baku-crash-map/raw/circuit_geometry.json',
);
const OUT = join(HERE, '../src/lib/bakuCircuitGeometry.ts');

/** Display width of the generated viewBox. Height follows the lap's aspect. */
const WIDTH = 1000;
/**
 * Room for a marker at the outer edge. The busiest corner draws a 30-unit
 * radius and Turn 15 sits hard against the left of the lap's bounding box, so
 * a tighter pad clipped it against the viewBox.
 */
const PADDING = 72;
/**
 * RDP tolerance in output pixels. 1.5 keeps every corner's shape while
 * dropping most of the straights' redundant points.
 */
const SIMPLIFY_EPSILON = 0.35;

type Point = readonly [number, number];

function rotate([x, y]: Point, radians: number): Point {
  return [
    x * Math.cos(radians) - y * Math.sin(radians),
    x * Math.sin(radians) + y * Math.cos(radians),
  ];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy));
}

/** Ramer-Douglas-Peucker, iterative so a long trace cannot blow the stack. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) {
    return points;
  }
  const keep: boolean[] = Array.from({ length: points.length }, () => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > epsilon && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function main() {
  const raw = JSON.parse(readFileSync(RAW, 'utf8'));
  const radians = (raw.rotation * Math.PI) / 180;

  const rotated: Point[] = raw.x.map((x: number, i: number) =>
    rotate([x, raw.y[i]], radians),
  );
  const rotatedCorners = raw.corners.map(
    (c: { number: number; trackPosition: { x: number; y: number } }) => ({
      number: c.number,
      point: rotate([c.trackPosition.x, c.trackPosition.y], radians),
    }),
  );

  const all = [...rotated, ...rotatedCorners.map((c) => c.point)];
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const scale = (WIDTH - PADDING * 2) / (maxX - minX);
  const height = Math.round((maxY - minY) * scale + PADDING * 2);

  /** SVG's y axis grows downward, so the lap is flipped as it is scaled. */
  function toDisplay([x, y]: Point): Point {
    return [
      (x - minX) * scale + PADDING,
      height - PADDING - (y - minY) * scale,
    ];
  }

  const corners = rotatedCorners.map((c) => {
    const [x, y] = toDisplay(c.point);
    return { number: c.number, x, y };
  });
  const points = simplify(rotated.map(toDisplay), SIMPLIFY_EPSILON);

  function nearestCorner(p: Point): number {
    return corners.reduce(
      (best, c) => {
        const d = Math.hypot(p[0] - c.x, p[1] - c.y);
        return d < best.d ? { number: c.number, d } : best;
      },
      { number: corners[0].number, d: Infinity },
    ).number;
  }

  /**
   * Walk the lap and start a new segment whenever the nearest corner changes.
   * Each segment repeats its predecessor's last point so the drawn ribbon has
   * no gaps at the joins.
   */
  const segments: { corner: number; d: string }[] = [];
  let current = nearestCorner(points[0]);
  let run: Point[] = [points[0]];
  for (const point of points.slice(1)) {
    const owner = nearestCorner(point);
    if (owner !== current) {
      run.push(point);
      segments.push({ corner: current, d: toPath(run) });
      current = owner;
      run = [point];
    } else {
      run.push(point);
    }
  }
  run.push(points[0]);
  segments.push({ corner: current, d: toPath(run) });

  writeFileSync(OUT, render({ height, corners, segments }));
  console.log(
    `${points.length} points (from ${rotated.length}), ${segments.length} segments, viewBox 0 0 ${WIDTH} ${height}`,
  );
}

/**
 * Path data at whole-unit precision.
 *
 * The viewBox is 1000 wide, so a tenth of a unit is below what any display can
 * resolve, and it costs two characters per coordinate on a file every visitor
 * to the page downloads. Rounding happens here, at output, rather than before
 * simplification: rounding first moves points by up to half a unit, which is
 * larger than the simplifier's tolerance and made it keep three times as many
 * of them.
 */
function toPath(run: Point[]): string {
  return `M${run.map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`).join('L')}`;
}

function render({
  height,
  corners,
  segments,
}: {
  height: number;
  corners: { number: number; x: number; y: number }[];
  segments: { corner: number; d: string }[];
}): string {
  return `/**
 * Baku City Circuit geometry, for the crash map on the Azerbaijan write-up.
 *
 * GENERATED by \`scripts/generate-baku-geometry.mts\`. Do not edit by hand:
 * regenerate instead, or the outline and the corner positions drift apart.
 *
 * Coordinates are display units inside \`viewBox\`, already rotated to the
 * orientation people recognise and flipped for SVG's downward y axis. The
 * source trace came from the circuit outline OpenF1 links to, fetched once and
 * committed; nothing here calls a network at build or run time.
 *
 * There is no separate full-lap path. The segments below already trace every
 * point of the lap between them, so drawing them all in the base colour is the
 * outline; shipping a second copy of the same coordinates was pure weight.
 */

export const BAKU_VIEW_BOX = { width: ${WIDTH}, height: ${height} } as const;

/**
 * A stretch of track owned by one corner, being the run of the lap closer to
 * that corner than to any other. The crash map strokes each stretch by how
 * many incidents its corner has collected, so these are the heat bands.
 */
export type BakuTrackSegment = {
  /** Corner number, 1-20. */
  corner: number;
  /** SVG path data for this stretch. */
  d: string;
};

export const BAKU_TRACK_SEGMENTS: readonly BakuTrackSegment[] = [
${segments.map((s) => `  { corner: ${s.corner}, d: '${s.d}' },`).join('\n')}
];

/** The twenty numbered corners, at their position on the outline above. */
export const BAKU_CORNERS: readonly { number: number; x: number; y: number }[] =
  [
${corners.map((c) => `    { number: ${c.number}, x: ${c.x}, y: ${c.y} },`).join('\n')}
  ];
`;
}

main();
